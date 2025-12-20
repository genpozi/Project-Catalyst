
import React from 'react';
import { LocalIntelligence } from '../LocalIntelligence';
import { useProject } from '../ProjectContext';

const ModelManager: React.FC = () => {
  const { state, dispatch } = useProject();
  const engine = LocalIntelligence.getInstance();

  const handleDownload = async () => {
      if (state.localEngine.status === 'loading') return;
      
      dispatch({ 
          type: 'UPDATE_LOCAL_ENGINE', 
          payload: { status: 'loading', progress: 'Starting...', progressValue: 0, progressPhase: 'init' } 
      });

      try {
          await engine.initialize((phase, progress, text) => {
              dispatch({ 
                  type: 'UPDATE_LOCAL_ENGINE', 
                  payload: { 
                      status: 'loading', 
                      progress: text, 
                      progressValue: progress, 
                      progressPhase: phase as any 
                  } 
              });
          });
          
          dispatch({ 
              type: 'UPDATE_LOCAL_ENGINE', 
              payload: { status: 'ready', progress: 'Ready', progressValue: 1, progressPhase: 'load' } 
          });
      } catch (e) {
          dispatch({ type: 'UPDATE_LOCAL_ENGINE', payload: { status: 'error', progress: 'Failed to load model' } });
      }
  };

  const isReady = state.localEngine.status === 'ready';
  const isLoading = state.localEngine.status === 'loading';
  const progressPercent = Math.round(state.localEngine.progressValue * 100);

  return (
    <div className="bg-slate-900/80 rounded-xl border border-white/10 overflow-hidden relative">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center border border-purple-500/30">
                    <span className="text-xl">🧠</span>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white">Gemma-2B-IT</h4>
                    <span className="text-[10px] text-glass-text-secondary uppercase tracking-wider">Quantized (q4f32_1) • ~1.4GB</span>
                </div>
            </div>
            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                isReady ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                isLoading ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                state.localEngine.status === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
                {state.localEngine.status}
            </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
                Run Google's lightweight open model directly in your browser using WebGPU. 
                Provides offline chat and basic architectural reasoning without sending data to the cloud.
            </p>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-bold text-glass-text-secondary">
                    <span>{state.localEngine.progress || 'Waiting to download...'}</span>
                    <span>{progressPercent}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className={`h-full transition-all duration-300 ${
                            state.localEngine.status === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                        }`} 
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/5 p-2 rounded text-center border border-white/5">
                    <div className="text-[10px] text-slate-500 uppercase">VRAM</div>
                    <div className="text-xs font-mono text-white">~2GB</div>
                </div>
                <div className="bg-white/5 p-2 rounded text-center border border-white/5">
                    <div className="text-[10px] text-slate-500 uppercase">Context</div>
                    <div className="text-xs font-mono text-white">2k Tokens</div>
                </div>
                <div className="bg-white/5 p-2 rounded text-center border border-white/5">
                    <div className="text-[10px] text-slate-500 uppercase">Speed</div>
                    <div className="text-xs font-mono text-white">Fast</div>
                </div>
            </div>

            <button 
                onClick={handleDownload}
                disabled={isReady || isLoading}
                className={`w-full py-3 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                    isReady 
                    ? 'bg-green-600/20 text-green-400 cursor-default border border-green-500/30' 
                    : isLoading 
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
            >
                {isReady ? (
                    <><span>✓</span> Engine Active</>
                ) : isLoading ? (
                    <><div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> Installing...</>
                ) : (
                    <><span>⬇</span> Download & Initialize</>
                )}
            </button>
        </div>
    </div>
  );
};

export default ModelManager;
