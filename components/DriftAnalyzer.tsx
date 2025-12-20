
import React, { useState, useEffect, useRef } from 'react';
import { GeminiService } from '../GeminiService';
import { FileNode, CLIEvent } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { cliSync } from '../utils/CLISyncService';
import { useProject } from '../ProjectContext';

interface DriftAnalyzerProps {
  plannedStructure: FileNode[];
  onSyncBlueprint?: (newStructure: FileNode[]) => void;
}

const DriftAnalyzer: React.FC<DriftAnalyzerProps> = ({ plannedStructure, onSyncBlueprint }) => {
  const { state } = useProject();
  const [mode, setMode] = useState<'manual' | 'live'>('manual');
  
  // Manual State
  const [actualInput, setActualInput] = useState('');
  
  // Live State
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  
  // Shared State
  const [report, setReport] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const gemini = React.useMemo(() => new GeminiService(), []);
  const logsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
      if(logsRef.current) {
          logsRef.current.scrollTop = logsRef.current.scrollHeight;
      }
  }, [liveLogs]);

  // Subscribe to CLI events in live mode
  useEffect(() => {
      if (mode === 'live') {
          const unsub = cliSync.subscribe((event: CLIEvent) => {
              if (event.type === 'tree') {
                  setLiveLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🌳 Filesystem updated. Analyzing...`]);
                  handleAnalyze(event.payload);
              } else if (event.type === 'file_change') {
                  setLiveLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📝 Change detected: ${event.payload.path}`]);
              }
          });
          
          // If not connected, try connecting
          if (state.syncStatus === 'disconnected') {
              cliSync.connect();
          }

          return () => unsub();
      }
  }, [mode]);

  const handleAnalyze = async (input: string) => {
    if (!input.trim()) return;
    setIsAnalyzing(true);
    setActualInput(input); // Keep sync input updated for Sync button
    try {
        const result = await gemini.analyzeDrift(plannedStructure, input);
        setReport(result);
        if (mode === 'live') {
            setLiveLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ Analysis complete.`]);
        }
    } catch (e) {
        if (mode === 'live') {
            setLiveLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Analysis failed.`]);
        } else {
            alert("Failed to analyze drift.");
        }
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleSync = async () => {
      if(!actualInput.trim() || !onSyncBlueprint) return;
      setIsSyncing(true);
      try {
          const newStructure = await gemini.parseTreeToStructure(actualInput);
          onSyncBlueprint(newStructure);
          alert("Blueprint synchronized successfully!");
          setReport(null);
          if (mode === 'live') setLiveLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔄 Blueprint synced with local.`]);
      } catch (e) {
          alert("Failed to sync structure.");
      } finally {
          setIsSyncing(false);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <span>🩺</span> Architectural Drift Check
                    </h3>
                    <p className="text-sm text-glass-text-secondary">
                        Verify if your implementation matches the planned blueprint.
                    </p>
                </div>
                
                {/* Mode Toggle */}
                <div className="flex bg-black/20 p-1 rounded-xl">
                    <button 
                        onClick={() => setMode('manual')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'manual' ? 'bg-brand-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        Manual Paste
                    </button>
                    <button 
                        onClick={() => setMode('live')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${mode === 'live' ? 'bg-brand-secondary text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        {state.syncStatus === 'connected' && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>}
                        Live Bridge (Beta)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN: Input Source */}
                <div className="flex flex-col h-full">
                    {mode === 'manual' ? (
                        <>
                            <label className="text-xs font-bold text-glass-text-secondary uppercase mb-2">Current Codebase Structure</label>
                            <textarea 
                                value={actualInput}
                                onChange={(e) => setActualInput(e.target.value)}
                                placeholder={`Paste 'tree' output here...\n\nExample:\n.\n├── src\n│   ├── App.tsx\n│   └── index.css\n├── package.json\n└── README.md`}
                                className="flex-grow min-h-[300px] w-full bg-[#0b0e14] border border-glass-border rounded-xl p-4 text-sm font-mono text-slate-300 focus:outline-none focus:border-brand-primary"
                            />
                            <div className="flex gap-2 mt-4">
                                <button 
                                    onClick={() => handleAnalyze(actualInput)}
                                    disabled={!actualInput.trim() || isAnalyzing}
                                    className="flex-1 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                            <span>Scanning...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span>Verify Integrity</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-grow flex flex-col bg-[#0b0e14] border border-glass-border rounded-xl p-6 relative overflow-hidden">
                            {/* Live Status Header */}
                            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${state.syncStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : state.syncStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
                                    <span className="font-bold text-white uppercase tracking-wider text-xs">
                                        {state.syncStatus === 'connected' ? 'CLI Connected' : state.syncStatus === 'connecting' ? 'Searching for Bridge...' : 'Disconnected'}
                                    </span>
                                </div>
                                {state.syncStatus === 'disconnected' && (
                                    <button onClick={() => cliSync.connect()} className="text-xs text-brand-primary hover:text-white underline">Retry</button>
                                )}
                            </div>

                            {/* Console Output */}
                            <div ref={logsRef} className="flex-grow font-mono text-xs text-slate-400 space-y-2 overflow-y-auto custom-scrollbar mb-4 bg-black/20 p-2 rounded">
                                {state.syncStatus === 'disconnected' && (
                                    <div className="text-center py-10 opacity-50">
                                        <p className="mb-2">Bridge not found.</p>
                                        <code className="bg-white/10 px-2 py-1 rounded text-white block w-fit mx-auto mb-2">npx @0relai/cli watch</code>
                                        <p>Run this in your terminal to enable live sync.</p>
                                        <button onClick={() => cliSync.simulateConnection()} className="mt-4 text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded text-white border border-white/10">
                                            Run Simulation (Demo)
                                        </button>
                                    </div>
                                )}
                                {liveLogs.map((log, i) => (
                                    <div key={i} className="border-l-2 border-brand-primary/30 pl-2">{log}</div>
                                ))}
                                {state.syncStatus === 'connected' && (
                                    <div className="animate-pulse text-brand-primary">_ Listening for filesystem events...</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Report */}
                <div className="bg-[#0f172a] rounded-xl border border-glass-border p-6 flex flex-col h-full overflow-hidden relative">
                    <label className="text-xs font-bold text-glass-text-secondary uppercase mb-2">Audit Report</label>
                    {report ? (
                        <>
                            <div className="flex-grow overflow-y-auto custom-scrollbar mb-4">
                                <MarkdownRenderer content={report} />
                            </div>
                            {onSyncBlueprint && (
                                <button
                                    onClick={handleSync}
                                    disabled={isSyncing}
                                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSyncing ? 'Syncing...' : 'Sync Blueprint to Match Reality'}
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">⚖️</span>
                            </div>
                            <p>Waiting for analysis...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default DriftAnalyzer;
