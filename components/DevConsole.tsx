
import React, { useState, useEffect, useRef } from 'react';
import Terminal from './Terminal';
import { webContainer } from '../utils/WebContainerService';
import { useProject } from '../ProjectContext';
import { Terminal as XTerm } from 'xterm';
import { flattenFileStructure } from '../utils/projectFileSystem';

interface DevConsoleProps {
  onClose: () => void;
}

const DevConsole: React.FC<DevConsoleProps> = ({ onClose }) => {
  const { state } = useProject();
  const [activeTab, setActiveTab] = useState<'terminal' | 'preview'>('terminal');
  const [status, setStatus] = useState('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const terminalInstance = useRef<XTerm | null>(null);
  
  // Track last synced time to prevent loops if we implement bidirectional sync later
  const lastSyncRef = useRef<number>(Date.now());

  // Mount/Boot Logic
  useEffect(() => {
    webContainer.setServerReadyCallback((url) => {
        setPreviewUrl(url);
        setStatus('running');
        // Auto-switch to preview on first successful load if user hasn't switched manually
        if (status !== 'running') setActiveTab('preview');
    });
  }, []);

  // Sync Files on Project Update
  useEffect(() => {
      // Sync happens when fileStructure changes in state
      // We debounce heavily or just write changed files if we could track diffs.
      // For now, we write everything on change but WebContainer fs is fast for small trees.
      // Optimization: Only write if file content actually differs? 
      // The Service is efficient enough for now.
      
      const syncFiles = async () => {
          if (status === 'idle') return; // Don't sync if not running
          
          if (state.projectData.fileStructure) {
              // Flatten structure to get paths
              // We need a helper to traverse. 
              // Using the projectFileSystem util logic locally here for simplicity in iterating
              const writeRecursive = async (nodes: any[], path = '') => {
                  for (const node of nodes) {
                      const currentPath = path ? `${path}/${node.name}` : node.name;
                      if (node.type === 'file' && node.content) {
                          await webContainer.writeFile(currentPath, node.content);
                      }
                      if (node.children) {
                          await writeRecursive(node.children, currentPath);
                      }
                  }
              };
              await writeRecursive(state.projectData.fileStructure);
              // console.log(" synced files to container");
          }
      };
      
      const t = setTimeout(syncFiles, 2000); // Debounce sync
      return () => clearTimeout(t);
  }, [state.projectData.fileStructure, status]);

  const handleTerminalInput = (data: string) => {
      webContainer.writeToShell(data);
  };

  const handleStart = async () => {
      setStatus('booting');
      try {
          if (terminalInstance.current) {
              terminalInstance.current.reset();
              terminalInstance.current.writeln('\x1b[34m[0relai]\x1b[0m Booting WebContainer Runtime...');
          }
          
          await webContainer.mountProject(state.projectData);
          
          // Start the interactive shell first so we can interact
          if (terminalInstance.current) {
              await webContainer.startShell(terminalInstance.current);
          }

          if (terminalInstance.current) terminalInstance.current.writeln('\x1b[34m[0relai]\x1b[0m Installing dependencies...');
          setStatus('installing');
          await webContainer.runCommand('npm', ['install'], terminalInstance.current || undefined);
          
          if (terminalInstance.current) terminalInstance.current.writeln('\x1b[34m[0relai]\x1b[0m Starting dev server...');
          setStatus('starting');
          
          // Run dev in background, output still pipes to terminal via the runCommand implementation
          // Note: In a real shell, we might just type 'npm run dev' into the shell writer.
          // But `spawn` gives us better lifecycle control.
          webContainer.runCommand('npm', ['run', 'dev'], terminalInstance.current || undefined)
            .catch(e => {
                if (terminalInstance.current) terminalInstance.current.writeln(`\r\n\x1b[31mServer Process Exited: ${e.message}\x1b[0m`);
                setStatus('error');
            });
          
      } catch (e: any) {
          if (terminalInstance.current) terminalInstance.current.writeln(`\r\n\x1b[31mError: ${e.message}\x1b[0m`);
          setStatus('error');
      }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-96 bg-[#0f172a] border-t border-glass-border shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col z-[100] animate-slide-in-up">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-glass-border">
            <div className="flex items-center gap-4">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <span>⚡</span> Edge Runtime
                </h3>
                <div className="flex bg-black/20 rounded p-0.5 border border-white/5">
                    <button 
                        onClick={() => setActiveTab('terminal')}
                        className={`px-3 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-2 ${activeTab === 'terminal' ? 'bg-brand-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        <span>_</span> Terminal
                    </button>
                    <button 
                        onClick={() => setActiveTab('preview')}
                        className={`px-3 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-2 ${activeTab === 'preview' ? 'bg-brand-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`}></span>
                        Live Preview
                    </button>
                </div>
                <div className="text-[10px] font-mono text-glass-text-secondary border-l border-white/10 pl-3 flex items-center gap-2">
                    <span>STATUS:</span>
                    <span className={`font-bold uppercase ${
                        status === 'error' ? 'text-red-400' : 
                        status === 'running' ? 'text-green-400' : 
                        status === 'idle' ? 'text-slate-500' : 'text-yellow-400'
                    }`}>
                        {status}
                    </span>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                {status === 'idle' ? (
                    <button 
                        onClick={handleStart}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold rounded flex items-center gap-2 transition-all shadow-lg"
                    >
                        <span>▶</span> Boot Container
                    </button>
                ) : (
                    <button 
                        onClick={() => {
                            // Reload logic if needed, or simply let user type in terminal
                            if(previewUrl) {
                                const iframe = document.getElementById('preview-frame') as HTMLIFrameElement;
                                if(iframe) iframe.src = previewUrl;
                            }
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded border border-white/10"
                    >
                        ↻ Refresh
                    </button>
                )}
                <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-grow relative bg-[#0b0e14]">
            <div className={`absolute inset-0 ${activeTab === 'terminal' ? 'z-10' : 'z-0'}`}>
                <Terminal 
                    onMount={(term) => { terminalInstance.current = term; }} 
                    onInput={handleTerminalInput}
                />
            </div>
            
            <div className={`absolute inset-0 bg-white ${activeTab === 'preview' ? 'z-10' : 'z-0 hidden'}`}>
                {previewUrl ? (
                    <iframe 
                        id="preview-frame"
                        src={previewUrl} 
                        className="w-full h-full border-0" 
                        title="App Preview"
                        allow="cross-origin-isolated"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 bg-slate-50">
                        <div className="w-12 h-12 border-4 border-slate-300 border-t-brand-primary rounded-full animate-spin"></div>
                        <p className="text-xs font-bold uppercase tracking-wider">Waiting for server...</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default DevConsole;
