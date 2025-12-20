
export class DB {
  private dbName = '0relai-storage-v1';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (e) => {
        console.error("DB Init Error", e);
        reject('Error opening database');
      };
    });
  }

  async saveProject(project: any): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      const request = store.put(project);
      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error saving project');
    });
  }

  async getProject(id: string): Promise<any> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Error fetching project');
    });
  }

  async getAllProjectsMeta(): Promise<{id: string, name: string, lastUpdated: number}[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.getAll(); // Getting all for now, optimization would be a cursor or separate index store
      request.onsuccess = () => {
        const projects = request.result || [];
        resolve(projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            lastUpdated: p.lastUpdated
        })).sort((a: any, b: any) => b.lastUpdated - a.lastUpdated));
      };
      request.onerror = () => reject('Error fetching projects');
    });
  }

  async deleteProject(id: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error deleting project');
    });
  }

  async saveMeta(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('meta', 'readwrite');
      const store = tx.objectStore('meta');
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error saving meta');
    });
  }

  async getMeta(key: string): Promise<any> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('meta', 'readonly');
      const store = tx.objectStore('meta');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject('Error fetching meta');
    });
  }
}

export const db = new DB();
