
import { ProjectData } from '../types';
import { db } from './db';
import { supabase } from './supabaseClient';

type StorageType = 'local' | 'supabase';

interface StorageConfig {
    type: StorageType;
    supabaseUrl?: string;
    supabaseKey?: string;
}

export class CloudStorageService {
    private static instance: CloudStorageService;
    private config: StorageConfig = { type: 'local' };

    private constructor() {
        const savedConfig = localStorage.getItem('0relai-storage-config');
        if (savedConfig) {
            this.config = JSON.parse(savedConfig);
        }
    }

    public static getInstance(): CloudStorageService {
        if (!CloudStorageService.instance) {
            CloudStorageService.instance = new CloudStorageService();
        }
        return CloudStorageService.instance;
    }

    public setConfig(config: StorageConfig) {
        this.config = config;
        localStorage.setItem('0relai-storage-config', JSON.stringify(config));
    }

    public getConfig() {
        return this.config;
    }

    /**
     * Determines the active storage mode.
     * Priority: Platform (Auth) > BYOB (Config) > Local
     */
    private async getStorageMode(): Promise<'platform' | 'byob' | 'local'> {
        const { data } = await supabase.auth.getSession();
        if (data.session) return 'platform';
        
        if (this.config.type === 'supabase' && this.config.supabaseUrl && this.config.supabaseKey) {
            return 'byob';
        }
        
        return 'local';
    }

    public async saveProject(project: ProjectData): Promise<void> {
        // 1. Always save to local for redundancy/offline support
        await db.saveProject(project);

        const mode = await this.getStorageMode();

        // 2. Sync to Cloud
        if (mode === 'platform') {
            await this.saveToPlatform(project);
        } else if (mode === 'byob') {
            await this.saveToBYOB(project);
        }
    }

    public async listProjects(): Promise<{id: string, name: string, lastUpdated: number, source?: string}[]> {
        const localProjects = await db.getAllProjectsMeta();
        const mode = await this.getStorageMode();

        try {
            let cloudProjects: {id: string, name: string, lastUpdated: number, source?: string}[] = [];

            if (mode === 'platform') {
                cloudProjects = await this.listPlatformProjects();
            } else if (mode === 'byob') {
                cloudProjects = await this.listBYOBProjects();
            }

            // Merge Strategy:
            // 1. Create a map of all projects by ID.
            // 2. Cloud versions overwrite local versions metadata if they exist (assuming cloud is truth for existence),
            //    BUT we usually want to show the latest timestamp.
            //    For this UI, we just want a unified list.
            
            const projectMap = new Map();
            
            // Add local first
            localProjects.forEach(p => projectMap.set(p.id, { ...p, source: 'local' }));
            
            // Add/Update with cloud
            cloudProjects.forEach(p => {
                // If it exists locally, we mark it as 'cloud' to indicate it is synced.
                // In a more complex app, we might check timestamps to show "Unsynced changes" status.
                projectMap.set(p.id, { 
                    ...p, 
                    source: mode === 'platform' ? 'cloud' : 'byob' 
                });
            });

            return Array.from(projectMap.values()).sort((a, b) => b.lastUpdated - a.lastUpdated);

        } catch (e) {
            console.error("Cloud list failed, returning local only", e);
            return localProjects.map(p => ({ ...p, source: 'local' }));
        }
    }

    public async loadProject(id: string): Promise<ProjectData | null> {
        const localData = await db.getProject(id);
        const mode = await this.getStorageMode();

        try {
            let cloudData: ProjectData | null = null;

            if (mode === 'platform') {
                cloudData = await this.loadFromPlatform(id);
            } else if (mode === 'byob') {
                cloudData = await this.loadFromBYOB(id);
            }

            if (cloudData) {
                // Conflict Resolution: Latest wins
                if (!localData || cloudData.lastUpdated > localData.lastUpdated) {
                    await db.saveProject(cloudData); // Update cache
                    return cloudData;
                }
            }
        } catch (e) {
            console.error("Cloud load failed, using local", e);
        }

        return localData;
    }

    public async deleteProject(id: string): Promise<void> {
        await db.deleteProject(id);
        const mode = await this.getStorageMode();
        
        if (mode === 'platform') {
            await supabase.from('projects').delete().eq('id', id);
        } else if (mode === 'byob') {
            await this.deleteFromBYOB(id);
        }
    }

    // --- Platform Implementation (Supabase Client) ---

    private async saveToPlatform(project: ProjectData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('projects').upsert({
            id: project.id,
            user_id: user.id,
            name: project.name,
            description: project.initialIdea?.substring(0, 200),
            data: project,
            last_updated: new Date(project.lastUpdated).toISOString(),
            is_public: project.isPublished || false
        });

        if (error) throw new Error(`Platform Save Error: ${error.message}`);
    }

    private async listPlatformProjects() {
        const { data, error } = await supabase
            .from('projects')
            .select('id, name, last_updated')
            .order('last_updated', { ascending: false });

        if (error) throw error;

        return data.map((row: any) => ({
            id: row.id,
            name: row.name,
            lastUpdated: new Date(row.last_updated).getTime(),
            source: 'cloud'
        }));
    }

    private async loadFromPlatform(id: string): Promise<ProjectData | null> {
        const { data, error } = await supabase
            .from('projects')
            .select('data')
            .eq('id', id)
            .single();

        if (error || !data) return null;
        return data.data as ProjectData;
    }

    // --- BYOB Implementation (REST) ---

    private async saveToBYOB(project: ProjectData) {
        const url = `${this.config.supabaseUrl}/rest/v1/blueprints`;
        const headers = {
            'apikey': this.config.supabaseKey!,
            'Authorization': `Bearer ${this.config.supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        };

        const payload = {
            id: project.id,
            name: project.name,
            data: project,
            updated_at: new Date(project.lastUpdated).toISOString()
        };

        const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`BYOB Sync Error: ${response.statusText}`);
    }

    private async listBYOBProjects() {
        const url = `${this.config.supabaseUrl}/rest/v1/blueprints?select=id,name,updated_at&order=updated_at.desc`;
        const headers = { 'apikey': this.config.supabaseKey!, 'Authorization': `Bearer ${this.config.supabaseKey}` };
        
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error("Failed to fetch BYOB projects");

        const data = await response.json();
        return data.map((row: any) => ({
            id: row.id,
            name: row.name,
            lastUpdated: new Date(row.updated_at).getTime(),
            source: 'byob'
        }));
    }

    private async loadFromBYOB(id: string): Promise<ProjectData | null> {
        const url = `${this.config.supabaseUrl}/rest/v1/blueprints?id=eq.${id}&select=data`;
        const headers = {
            'apikey': this.config.supabaseKey!,
            'Authorization': `Bearer ${this.config.supabaseKey}`,
            'Accept': 'application/vnd.pgrst.object+json'
        };

        const response = await fetch(url, { headers });
        if (!response.ok) return null;
        const row = await response.json();
        return row.data as ProjectData;
    }

    private async deleteFromBYOB(id: string): Promise<void> {
        const url = `${this.config.supabaseUrl}/rest/v1/blueprints?id=eq.${id}`;
        const headers = {
            'apikey': this.config.supabaseKey!,
            'Authorization': `Bearer ${this.config.supabaseKey}`
        };

        const response = await fetch(url, { method: 'DELETE', headers });
        if (!response.ok) throw new Error("Failed to delete BYOB project");
    }

    public async testConnection(url: string, key: string): Promise<boolean> {
        try {
            const testUrl = `${url}/rest/v1/blueprints?select=count&limit=1`;
            const response = await fetch(testUrl, {
                method: 'HEAD',
                headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
            });
            return response.ok;
        } catch (e) {
            return false;
        }
    }
}

export const cloudStorage = CloudStorageService.getInstance();
