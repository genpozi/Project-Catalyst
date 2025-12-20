
import { WebContainer, FileSystemTree, WebContainerProcess } from '@webcontainer/api';
import { ProjectData, FileNode } from '../types';
import { Terminal } from 'xterm';

export class WebContainerService {
  private static instance: WebContainerService;
  private container: WebContainer | null = null;
  private isBooting = false;
  private serverUrl: string | null = null;
  private shellProcess: WebContainerProcess | null = null;
  private shellWriter: WritableStreamDefaultWriter<string> | null = null;
  
  // Callbacks
  private onServerReady: ((url: string) => void) | null = null;
  private onOutput: ((data: string) => void) | null = null;

  private constructor() {}

  public static getInstance(): WebContainerService {
    if (!WebContainerService.instance) {
      WebContainerService.instance = new WebContainerService();
    }
    return WebContainerService.instance;
  }

  public async boot(): Promise<void> {
    if (this.container || this.isBooting) return;
    
    this.isBooting = true;
    try {
      this.container = await WebContainer.boot();
      console.log('WebContainer booted');
      
      this.container.on('server-ready', (port, url) => {
        console.log('Server ready:', url);
        this.serverUrl = url;
        if (this.onServerReady) this.onServerReady(url);
      });

    } catch (e) {
      console.error('Failed to boot WebContainer:', e);
      // Check for COOP/COEP issues
      if (window.crossOriginIsolated === false) {
          console.error("App is not cross-origin isolated. WebContainer requires COOP/COEP headers.");
      }
      throw e;
    } finally {
      this.isBooting = false;
    }
  }

  public async mountProject(projectData: ProjectData): Promise<void> {
    if (!this.container) await this.boot();
    if (!this.container) throw new Error('Container failed to boot');

    const tree = this.convertToFileSystemTree(projectData.fileStructure || []);
    
    // Ensure vital config files exist for a React/Vite environment if missing
    if (!tree['package.json']) {
       const pkg = {
            name: "0relai-app",
            private: true,
            version: "0.0.0",
            type: "module",
            scripts: {
                "dev": "vite",
                "build": "vite build",
                "preview": "vite preview"
            },
            dependencies: {
                "react": "^18.2.0",
                "react-dom": "^18.2.0"
            },
            devDependencies: {
                "@types/react": "^18.2.66",
                "@types/react-dom": "^18.2.22",
                "@vitejs/plugin-react": "^4.2.1",
                "vite": "^5.2.0"
            }
        };
        tree['package.json'] = {
            file: { contents: JSON.stringify(pkg, null, 2) }
        };
    }

    if (!tree['vite.config.js'] && !tree['vite.config.ts']) {
        tree['vite.config.js'] = {
            file: { contents: `import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react'; export default defineConfig({ plugins: [react()] });` }
        };
    }

    if (!tree['index.html']) {
        tree['index.html'] = {
            file: { contents: `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>App</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>` }
        };
    }

    // Ensure src/main.jsx entry point exists if user hasn't defined it but we added index.html
    // This is a rough heuristic; ideally the AI provides a complete tree.
    // We assume the user structure is authoritative if present.

    await this.container.mount(tree);
  }

  public async startShell(terminal: Terminal): Promise<void> {
      if (!this.container) return;

      // Spawn jsh
      this.shellProcess = await this.container.spawn('jsh', {
          terminal: {
              cols: terminal.cols,
              rows: terminal.rows,
          },
      });

      // Pipe output to terminal
      this.shellProcess.output.pipeTo(new WritableStream({
          write: (data) => {
              terminal.write(data);
          }
      }));

      // Get input writer
      const input = this.shellProcess.input.getWriter();
      this.shellWriter = input;
  }

  public writeToShell(data: string) {
      if (this.shellWriter) {
          this.shellWriter.write(data);
      }
  }

  public resizeShell(cols: number, rows: number) {
      if (this.shellProcess) {
          this.shellProcess.resize({ cols, rows });
      }
  }

  public async runCommand(cmd: string, args: string[], terminal?: Terminal): Promise<void> {
    if (!this.container) throw new Error('Container not booted');
    
    const process = await this.container.spawn(cmd, args);
    
    process.output.pipeTo(new WritableStream({
      write: (data) => {
        if (terminal) terminal.write(data);
        if (this.onOutput) this.onOutput(data);
      }
    }));

    return process.exit.then((code) => {
        if (code !== 0) throw new Error(`${cmd} failed with code ${code}`);
    });
  }

  public async writeFile(path: string, content: string): Promise<void> {
      if (!this.container) return;
      try {
        await this.container.fs.writeFile(path, content);
      } catch (e) {
          console.error(`Failed to write ${path} to container`, e);
      }
  }

  public setServerReadyCallback(cb: (url: string) => void) {
      this.onServerReady = cb;
      if (this.serverUrl) cb(this.serverUrl); 
  }

  private convertToFileSystemTree(nodes: FileNode[]): FileSystemTree {
    const tree: FileSystemTree = {};
    
    nodes.forEach(node => {
      if (node.type === 'file' && node.content) {
        tree[node.name] = {
          file: {
            contents: node.content
          }
        };
      } else if (node.type === 'folder' && node.children) {
        tree[node.name] = {
          directory: this.convertToFileSystemTree(node.children)
        };
      }
    });

    return tree;
  }
}

export const webContainer = WebContainerService.getInstance();
