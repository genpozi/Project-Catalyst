
import React, { useState, useEffect, useRef } from 'react';
import Terminal from './Terminal';
import { webContainer } from '../utils/WebContainerService';
import { useProject } from '../ProjectContext';
import { Terminal as XTerm } from 'xterm';
import { flattenFileStructure } from '../utils/projectFileSystem';
import { useToast } from './Toast';

interface DevConsoleProps {
  onClose: () => void;
}

const DevConsole: React.FC<DevConsoleProps> = ({ onClose }) => {
  const { state, dispatch } = useProject();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'terminal' | 'preview'>('terminal');
  const [status, setStatus] = useState('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompatible, setIsCompatible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSyncingBack, setIsSyncingBack] = useState(false);
  
  const terminalInstance = useRef<XTerm | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check Compatibility
  useEffect(() => {
      if (!window.crossOriginIsolated) {
          setIsCompatible(false);
          setStatus('error');
      }
  }, []);

  // Mount/Boot Logic
  useEffect(() => {
    if (!isCompatible) return;

    webContainer.setServerReadyCallback((url) => {
        setPreviewUrl(url);
        setStatus('running');
        if (status !== 'running') setActiveTab('preview');
    });
  }, [isCompatible]);

  // Sync Files on Project Update (State -> Container)
  useEffect(() => {
      const syncFiles = async () => {
          if (status === 'idle' || !state.projectData.fileStructure || !isCompatible) return; 
          
          const flatFiles = flattenFileStructure(state.projectData.fileStructure);
          
          for (const { path, node } of flatFiles) {
              if (node.type === 'file' && node.content) {
                  await webContainer.writeFile(path, node.content);
              }
          }
      };
      
      const t = setTimeout(syncFiles, 2000); 
      return () => clearTimeout(t);
  }, [state.projectData.fileStructure, status, isCompatible]);

  const handleTerminalInput = (data: string) => {
      webContainer.writeToShell(data);
  };

  const handleTerminalResize = (cols: number, rows: number) => {
      webContainer.resizeShell(cols, rows);
  };

  const handleStart = async () => {
      if (!isCompatible) return;
      setStatus('booting');
      try {
          if (terminalInstance.current) {
              terminalInstance.current.reset();
              terminalInstance.current.writeln('\x1b[34m[0relai]\x1b[0m Booting WebContainer Runtime...');
          }
          
          await webContainer.mountProject(state.projectData);
          
          if (terminalInstance.current) {
              await webContainer.startShell(terminalInstance.current);
          }

          if (terminalInstance.current) terminalInstance.current.writeln('\x1b[34m[0relai]\x1b[0m Installing dependencies...');
          setStatus('installing');
          await webContainer.runCommand('npm', ['install'], terminalInstance.current || undefined);
          
          if (terminalInstance.current) terminalInstance.current.writeln('\x1b[34m[0relai]\x1b[0m Starting dev server...');
          setStatus('starting');
          
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

  const handleSyncFromContainer = async () => {
      setIsSyncingBack(true);
      try {
          const snapshot = await webContainer.getSnapshot();
          if (snapshot.length > 0) {
              dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { fileStructure: snapshot } });
              addToast("Project state updated from Container", "success");
          } else {
              addToast("Container appears empty or unreadable", "warning");
          }
      } catch (e) {
          console.error(e);
          addToast("Failed to sync from container", "error");
      } finally {
          setIsSyncingBack(false);
      }
  };

  const openNewTab = () => {
      if (previewUrl) window.open(previewUrl, '_blank');
  };

  return (
    <div 
        ref={containerRef}
        className={`fixed bottom-0 left-0 right-0 bg-[#0f172a] border-t border-glass-border shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col z-[100] transition-all duration-300 ease-in-out ${isMinimized ? 'h-10' : 'h-96'}`}
    >
        {/* Header */}
        <div 
            className="flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-glass-border cursor-pointer"
            onClick={(e) => {
                // Only toggle minimize if clicking the header bar background, not buttons
                if (e.target === e.currentTarget) setIsMinimized(!isMinimized);
            }}
        >
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsMinimized(!isMinimized)} className="text-slate-400 hover:text-white">
                        {isMinimized ? '🔼' : '🔽'}
                    </button>
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                        <span>⚡</span> Edge Runtime
                    </h3>
                </div>
                
                {!isMinimized && (
                    <>
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
                    </>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                {!isCompatible && (
                    <div className="text-[10px] text-red-300 bg-red-900/30 px-3 py-1.5 rounded border border-red-500/30 flex items-center gap-1">
                        <span>⚠️</span> Headers Missing
                    </div>
                )}
                
                {!isMinimized && status === 'running' && (
                    <>
                        <button 
                            onClick={handleSyncFromContainer}
                            disabled={isSyncingBack}
                            className="px-3 py-1.5 bg-brand-secondary/20 hover:bg-brand-secondary/40 text-brand-secondary border border-brand-secondary/30 text-[10px] font-bold rounded flex items-center gap-2 transition-all"
                            title="Pull changes from Container to Editor"
                        >
                            {isSyncingBack ? 'Syncing...' : '⬇ Pull to Editor'}
                        </button>
                        
                        <button 
                            onClick={openNewTab}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded border border-white/10 flex items-center gap-2"
                            title="Open in new tab"
                        >
                            <span>↗</span> Open
                        </button>
                    </>
                )}

                {status === 'idle' || status === 'error' ? (
                    <button 
                        onClick={handleStart}
                        disabled={!isCompatible}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-[10px] font-bold rounded flex items-center gap-2 transition-all shadow-lg"
                    >
                        <span>▶</span> {status === 'error' ? 'Reboot' : 'Boot Container'}
                    </button>
                ) : (
                    <button 
                        onClick={() => {
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
        {!isMinimized && (
            <div className="flex-grow relative bg-[#0b0e14]">
                {!isCompatible && activeTab === 'terminal' && (
                    <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center p-8">
                        <div className="text-center max-w-md">
                            <h3 className="text-red-400 font-bold text-lg mb-2">Browser Security Check Failed</h3>
                            <p className="text-slate-300 text-xs mb-4">
                                WebContainers require <strong>Cross-Origin Isolation</strong> to enable `SharedArrayBuffer`. 
                                Your current environment is missing the following headers:
                            </p>
                            <div className="text-left bg-slate-900 p-3 rounded border border-slate-700 font-mono text-[10px] text-brand-secondary mb-4">
                                Cross-Origin-Embedder-Policy: require-corp<br/>
                                Cross-Origin-Opener-Policy: same-origin
                            </div>
                        </div>
                    </div>
                )}

                <div className={`absolute inset-0 ${activeTab === 'terminal' ? 'z-10' : 'z-0'}`}>
                    <Terminal 
                        onMount={(term) => { terminalInstance.current = term; }} 
                        onInput={handleTerminalInput}
                        onResize={handleTerminalResize}
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
        )}
    </div>
  );
};

export default DevConsole;
