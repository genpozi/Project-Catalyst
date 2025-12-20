
import React, { useState, useEffect } from 'react';
import { LocalIntelligence } from '../LocalIntelligence';
import { useProject } from '../ProjectContext';
import ModelManager from './ModelManager';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { state } = useProject();
  const [dataUsage, setDataUsage] = useState<string>('Calculating...');
  const [fineTuningOptIn, setFineTuningOptIn] = useState(localStorage.getItem('0relai-opt-in') === 'true');
  const [gpuStatus, setGpuStatus] = useState<{ supported: boolean; message?: string }>({ supported: true });
  const engine = LocalIntelligence.getInstance();

  useEffect(() => {
    estimateStorage();
    checkGpu();
  }, []);

  const checkGpu = async () => {
      const status = await engine.checkCompatibility();
      setGpuStatus(status);
  };

  const estimateStorage = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      if (usage > 1024 * 1024) {
        setDataUsage(`${(usage / (1024 * 1024)).toFixed(2)} MB`);
      } else {
        setDataUsage(`${(usage / 1024).toFixed(2)} KB`);
      }
    } else {
      setDataUsage('Unknown');
    }
  };

  const handleClearCache = async () => {
    if (window.confirm("This will clear all locally saved projects. This action cannot be undone. Are you sure?")) {
      localStorage.clear();
      alert("Local cache cleared. Please refresh the page.");
      window.location.reload();
    }
  };

  const toggleOptIn = () => {
    const newVal = !fineTuningOptIn;
    setFineTuningOptIn(newVal);
    localStorage.setItem('0relai-opt-in', newVal.toString());
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-[#0f172a] border border-glass-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-6 border-b border-glass-border flex justify-between items-center bg-slate-900/50">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>⚙️</span> System Settings
                </h3>
                <button onClick={onClose} className="text-glass-text-secondary hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
                {/* Local Intelligence */}
                <section>
                    <h4 className="text-xs font-bold text-brand-secondary uppercase tracking-wider mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
                        <span className="text-lg">🧠</span> Neural Engine (WebGPU)
                    </h4>
                    
                    {!gpuStatus.supported ? (
                        <div className="mb-4 bg-red-900/20 border border-red-500/30 p-4 rounded-xl text-xs text-red-200 flex items-start gap-3">
                            <span className="text-lg">⚠️</span>
                            <div>
                                <strong className="block mb-1">WebGPU Unavailable</strong>
                                {gpuStatus.message}
                                <br/><span className="opacity-70 mt-1 block">Use Chrome/Edge 113+ or enable flags.</span>
                            </div>
                        </div>
                    ) : (
                        <ModelManager />
                    )}
                </section>

                {/* Data & Privacy */}
                <section>
                    <h4 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Privacy & Storage</h4>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-sm font-bold text-white">Contribute to Fine-Tuning</div>
                            <div className="text-xs text-slate-400 max-w-xs">
                                Allow 0relai to use anonymous architectural patterns to improve future model performance.
                            </div>
                        </div>
                        <button 
                            onClick={toggleOptIn}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${fineTuningOptIn ? 'bg-brand-primary' : 'bg-slate-700'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${fineTuningOptIn ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                    
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-lg">💾</div>
                            <div>
                                <div className="text-sm font-bold text-white">Local Usage</div>
                                <div className="text-xs text-brand-secondary font-mono">{dataUsage}</div>
                            </div>
                        </div>
                        <button 
                            onClick={handleClearCache}
                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded transition-all border border-red-500/20"
                        >
                            Clear Data
                        </button>
                    </div>
                </section>

                {/* About */}
                <div className="text-center pt-4">
                    <p className="text-xs text-glass-text-secondary">
                        0relai v3.2.0 (Hybrid Intelligence)<br/>
                        Built with Gemini 2.0 & WebLLM
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SettingsModal;
