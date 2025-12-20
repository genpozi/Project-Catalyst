
import React from 'react';
import { PLUGIN_REGISTRY } from '../utils/plugins';
import { useProject } from '../ProjectContext';

interface PluginStoreProps {
  onClose: () => void;
}

const PluginStore: React.FC<PluginStoreProps> = ({ onClose }) => {
  const { state, dispatch } = useProject();
  const activePlugins = state.projectData.activePlugins || [];

  const handleToggle = (id: string) => {
      dispatch({ type: 'TOGGLE_PLUGIN', payload: id });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-[#0f172a] border border-glass-border w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-8 border-b border-glass-border flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                        <span>📦</span> Plugin Ecosystem
                    </h2>
                    <p className="text-blue-200 text-sm max-w-lg">
                        Extend the Architect's capabilities. Plugins inject specialized code, configurations, and assets directly into your final code bundle.
                    </p>
                </div>
                <button 
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-black/20 hover:bg-white/10 text-white flex items-center justify-center transition-colors"
                >
                    ✕
                </button>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-8 bg-[#0b0e14]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {PLUGIN_REGISTRY.map(plugin => {
                        const isActive = activePlugins.includes(plugin.id);
                        return (
                            <div 
                                key={plugin.id} 
                                className={`relative p-5 rounded-xl border transition-all group ${
                                    isActive 
                                    ? 'bg-brand-primary/10 border-brand-primary/50' 
                                    : 'bg-slate-900/50 border-white/5 hover:border-white/10 hover:bg-slate-800'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-2xl border border-white/5 shadow-inner">
                                            {plugin.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-base">{plugin.name}</h3>
                                            <span className="text-[10px] text-glass-text-secondary bg-white/5 px-1.5 py-0.5 rounded border border-white/5">v{plugin.version} by {plugin.author}</span>
                                        </div>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-slate-700'}`}></div>
                                </div>
                                
                                <p className="text-sm text-slate-400 mb-4 h-10 leading-relaxed">
                                    {plugin.description}
                                </p>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-glass-text-secondary">
                                        {plugin.category}
                                    </span>
                                    <button 
                                        onClick={() => handleToggle(plugin.id)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            isActive
                                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                                            : 'bg-brand-secondary text-white hover:bg-blue-600 shadow-lg'
                                        }`}
                                    >
                                        {isActive ? 'Uninstall' : 'Install'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Footer */}
            <div className="bg-slate-900 p-4 border-t border-glass-border flex justify-between items-center text-xs text-glass-text-secondary">
                <span>{activePlugins.length} active extensions</span>
                <span>Want to build a plugin? Check the docs.</span>
            </div>
        </div>
    </div>
  );
};

export default PluginStore;
