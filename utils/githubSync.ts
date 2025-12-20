
import { VirtualFile } from "./projectFileSystem";
import { FileNode } from "../types";

export interface GitHubRepoInfo {
    name: string;
    owner: { login: string };
    default_branch: string;
    description: string;
}

export class GitHubSyncService {
    private static instance: GitHubSyncService;
    private token: string | null = null;

    private constructor() {
        this.token = localStorage.getItem('0relai-gh-token');
    }

    public static getInstance(): GitHubSyncService {
        if (!GitHubSyncService.instance) {
            GitHubSyncService.instance = new GitHubSyncService();
        }
        return GitHubSyncService.instance;
    }

    public setToken(token: string) {
        this.token = token;
        localStorage.setItem('0relai-gh-token', token);
    }

    public getToken() {
        return this.token;
    }

    private getHeaders() {
        if (!this.token) throw new Error("GitHub token not configured.");
        return {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
    }

    async getUser() {
        const res = await fetch('https://api.github.com/user', { headers: this.getHeaders() });
        if (!res.ok) throw new Error("Failed to fetch GitHub user.");
        return res.json();
    }

    async getRepo(owner: string, name: string): Promise<GitHubRepoInfo> {
        const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, { headers: this.getHeaders() });
        if (res.status === 404) throw new Error("Repository not found.");
        if (!res.ok) throw new Error("Failed to fetch repository.");
        return res.json();
    }

    /**
     * Recursively fetches the file tree of a repo.
     * Note: This uses the Git Data API which has a limit of 100,000 entries.
     */
    async getRepoTree(owner: string, repo: string, branch: string): Promise<FileNode[]> {
        const headers = this.getHeaders();
        const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

        // 1. Get branch SHA
        const refRes = await fetch(`${baseUrl}/git/ref/heads/${branch}`, { headers });
        if (!refRes.ok) throw new Error(`Branch ${branch} not found.`);
        const refData = await refRes.json();
        const sha = refData.object.sha;

        // 2. Get Tree (Recursive)
        const treeRes = await fetch(`${baseUrl}/git/trees/${sha}?recursive=1`, { headers });
        if (!treeRes.ok) throw new Error("Failed to fetch repository tree.");
        const treeData = await treeRes.json();

        // 3. Convert flat tree to nested FileNode structure
        return this.buildFileStructure(treeData.tree);
    }

    /**
     * Fetches content for specific critical files (README, package.json, etc.)
     * We don't fetch everything to avoid rate limits and massive downloads.
     */
    async getFileContent(owner: string, repo: string, path: string): Promise<string> {
        const headers = this.getHeaders();
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        
        const res = await fetch(url, { headers });
        if (!res.ok) return ""; // Fail silently for missing optional files
        
        const data = await res.json();
        if (data.encoding === 'base64') {
            return atob(data.content);
        }
        return "";
    }

    private buildFileStructure(gitTreeItems: any[]): FileNode[] {
        const root: FileNode[] = [];
        const map = new Map<string, FileNode>();

        // Sort by path length to ensure parents are processed before children (usually)
        // But since we are building a map, we can handle any order if we process carefully.
        // Actually, simplest way is to iterate and create path parts.

        gitTreeItems.forEach(item => {
            if (item.type !== 'blob' && item.type !== 'tree') return; // Skip submodules/commits

            const parts = item.path.split('/');
            let currentLevel = root;
            
            parts.forEach((part: string, index: number) => {
                const isLast = index === parts.length - 1;
                const existing = currentLevel.find(n => n.name === part);

                if (existing) {
                    if (!isLast) {
                        if (!existing.children) existing.children = [];
                        currentLevel = existing.children;
                    }
                } else {
                    const newNode: FileNode = {
                        name: part,
                        type: isLast && item.type === 'blob' ? 'file' : 'folder',
                        description: isLast && item.type === 'blob' ? 'Imported file' : 'Folder',
                        children: isLast ? undefined : []
                    };
                    currentLevel.push(newNode);
                    if (!isLast) {
                        currentLevel = newNode.children!;
                    }
                }
            });
        });

        return root;
    }

    async createRepo(name: string, description: string) {
        const res = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                name,
                description,
                private: true, // Default to private for safety
                auto_init: true // Important: creates an initial commit so we have a HEAD
            })
        });
        if (!res.ok) throw new Error("Failed to create repository.");
        return res.json();
    }

    /**
     * Creates a new branch, pushes all files, and creates a Pull Request.
     */
    async pushAndPR(
        owner: string, 
        repo: string, 
        branchName: string, 
        message: string, 
        files: VirtualFile[],
        baseBranch: string = 'main'
    ): Promise<{ prUrl: string; prNumber: number }> {
        const headers = this.getHeaders();
        const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

        // 1. Get Reference of Base Branch
        console.log(`Fetching ref for ${baseBranch}...`);
        const refRes = await fetch(`${baseUrl}/git/ref/heads/${baseBranch}`, { headers });
        if (!refRes.ok) throw new Error(`Could not find base branch ${baseBranch}.`);
        const refData = await refRes.json();
        const baseSha = refData.object.sha;

        // 2. Create Blobs & Build Tree
        console.log("Creating blobs...");
        const treeItems = [];
        
        // Batch creation slightly to avoid rate limits if many files?
        // For 0relai scope (dozens of files), sequential or parallel fetch is fine.
        for (const file of files) {
            if (!file.content.trim()) continue; // Skip empty files

            // For text files, we can just send content in the tree directly if small, 
            // but creating blobs is safer for encoding.
            const blobRes = await fetch(`${baseUrl}/git/blobs`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ content: file.content, encoding: 'utf-8' })
            });
            
            if (!blobRes.ok) {
                console.warn(`Failed to create blob for ${file.path}`);
                continue;
            }
            
            const blobData = await blobRes.json();
            treeItems.push({
                path: file.path,
                mode: '100644', // File mode
                type: 'blob',
                sha: blobData.sha
            });
        }

        // 3. Create Tree
        console.log("Creating tree...");
        const treeRes = await fetch(`${baseUrl}/git/trees`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                base_tree: baseSha,
                tree: treeItems
            })
        });
        if (!treeRes.ok) throw new Error("Failed to create git tree.");
        const treeData = await treeRes.json();
        const newTreeSha = treeData.sha;

        // 4. Create Commit
        console.log("Creating commit...");
        const commitRes = await fetch(`${baseUrl}/git/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message,
                tree: newTreeSha,
                parents: [baseSha]
            })
        });
        if (!commitRes.ok) throw new Error("Failed to create commit.");
        const commitData = await commitRes.json();
        const newCommitSha = commitData.sha;

        // 5. Create or Update Branch Ref
        console.log(`Updating branch ${branchName}...`);
        // Check if branch exists
        const branchCheck = await fetch(`${baseUrl}/git/ref/heads/${branchName}`, { headers });
        if (branchCheck.ok) {
            // Update existing
            await fetch(`${baseUrl}/git/refs/heads/${branchName}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ sha: newCommitSha, force: true })
            });
        } else {
            // Create new
            const createRefRes = await fetch(`${baseUrl}/git/refs`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ref: `refs/heads/${branchName}`,
                    sha: newCommitSha
                })
            });
            if (!createRefRes.ok) throw new Error("Failed to create branch ref.");
        }

        // 6. Create Pull Request
        console.log("Opening PR...");
        const prRes = await fetch(`${baseUrl}/pulls`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                title: message,
                body: `Auto-generated by 0relai Architect.\n\nThis PR includes the full architectural scaffold defined in the blueprint.`,
                head: branchName,
                base: baseBranch
            })
        });

        // If PR already exists, it might fail with 422. We should try to find it.
        if (prRes.status === 422) {
            const listPrs = await fetch(`${baseUrl}/pulls?head=${owner}:${branchName}&base=${baseBranch}`, { headers });
            const prs = await listPrs.json();
            if (prs.length > 0) {
                return { prUrl: prs[0].html_url, prNumber: prs[0].number };
            }
            throw new Error("Branch updated, but failed to create or find PR.");
        }

        if (!prRes.ok) throw new Error("Failed to create Pull Request.");
        const prData = await prRes.json();

        return { prUrl: prData.html_url, prNumber: prData.number };
    }
}

export const ghSync = GitHubSyncService.getInstance();
