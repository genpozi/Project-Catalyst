
import React, { useState } from 'react';
import { DesignSystem } from '../types';
import RefineBar from './RefineBar';
import { useProject } from '../ProjectContext';
import { GeminiService } from '../GeminiService';

interface DesignSystemViewProps {
  designSystem?: DesignSystem;
  onContinue: () => void;
  hideActions?: boolean;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
}

const DesignSystemView: React.FC<DesignSystemViewProps> = ({ designSystem, onContinue, hideActions, onRefine, isRefining = false }) => {
  const [activeTab, setActiveTab] = useState<'tokens' | 'preview'>('tokens');
  const [isGeneratingWireframe, setIsGeneratingWireframe] = useState(false);
  const { state, dispatch } = useProject();
  const gemini = React.useMemo(() => new GeminiService(), []);

  if (!designSystem) return null;

  const handleGenerateWireframe = async () => {
    setIsGeneratingWireframe(true);
    try {
      const html = await gemini.generateWireframe(state.projectData);
      const updatedSystem = { ...designSystem, wireframeCode: html };
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { designSystem: updatedSystem } });
    } catch (e) {
      console.error("Wireframe generation failed", e);
      alert("Failed to generate wireframe. Please try again.");
    } finally {
      setIsGeneratingWireframe(false);
    }
  };

  return (
    <div className="animate-slide-in-up flex flex-col h-full">
      {!hideActions && (
          <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">UI/UX Design System</h2>
                <p className="text-glass-text-secondary text-sm">Visual language defined for your project.</p>
            </div>
            <div className="bg-white/5 p-1 rounded-xl flex">
                <button 
                  onClick={() => setActiveTab('tokens')}
                  className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'tokens' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                  Tokens
                </button>
                <button 
                  onClick={() => setActiveTab('preview')}
                  className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'preview' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                  Live Preview
                </button>
            </div>
          </div>
      )}

      {onRefine && !hideActions && (
        <div className="max-w-3xl mx-auto mb-8 w-full">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Use a pastel color palette', 'Add a floating action button component'" 
            />
        </div>
      )}

      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {activeTab === 'tokens' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Colors */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                <h3 className="text-xl font-bold text-brand-accent mb-6 border-b border-white/10 pb-4 uppercase tracking-widest text-xs">Color Palette</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {designSystem.colorPalette.map((color, idx) => (
                    <div key={idx} className="group">
                        <div 
                            className="h-16 w-full rounded-xl shadow-lg mb-3 ring-1 ring-white/10 transition-transform transform group-hover:scale-105"
                            style={{ backgroundColor: color.hex }}
                        ></div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-white">{color.name}</span>
                            <span className="text-[10px] font-mono text-glass-text-secondary">{color.hex}</span>
                        </div>
                        <p className="text-[10px] text-glass-text-secondary mt-1 leading-tight">{color.usage}</p>
                    </div>
                    ))}
                </div>
                </div>

                {/* Typography & Layout */}
                <div className="space-y-6">
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                        <h3 className="text-xl font-bold text-brand-accent mb-6 border-b border-white/10 pb-4 uppercase tracking-widest text-xs">Typography</h3>
                        <div className="space-y-4">
                            {designSystem.typography.map((type, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/5 p-4 rounded-xl border border-white/5">
                                <div>
                                    <span className="text-[10px] uppercase tracking-widest text-glass-text-secondary block font-bold mb-1">{type.role}</span>
                                    <span className="font-semibold text-white text-base">{type.fontFamily}</span>
                                </div>
                                <span className="text-xs font-mono bg-black/40 px-3 py-1 rounded-lg text-brand-secondary border border-white/5">{type.size}</span>
                            </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                        <h3 className="text-xl font-bold text-brand-accent mb-2 uppercase tracking-widest text-xs">Layout Strategy</h3>
                        <p className="text-sm text-blue-100 italic leading-relaxed">"{designSystem.layoutStrategy}"</p>
                    </div>
                </div>
            </div>
        ) : (
            <div className="animate-fade-in h-[600px] bg-white rounded-3xl overflow-hidden border border-white/10 relative">
                 {designSystem.wireframeCode ? (
                    <>
                      <iframe 
                        srcDoc={designSystem.wireframeCode}
                        className="w-full h-full border-0"
                        title="Live Preview"
                      />
                      <button 
                        onClick={handleGenerateWireframe}
                        disabled={isGeneratingWireframe}
                        className="absolute bottom-4 right-4 bg-black/80 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-md border border-white/20 transition-all flex items-center gap-2"
                      >
                        {isGeneratingWireframe ? 'Regenerating...' : '🔄 Regenerate Prototype'}
                      </button>
                    </>
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500">
                        <div className="w-20 h-20 bg-slate-200 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                            <span className="text-4xl">🎨</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Interactive Prototype</h3>
                        <p className="max-w-md text-center text-sm mb-8">
                            Generate a live HTML/Tailwind wireframe based on your specific idea and design tokens.
                        </p>
                        <button 
                            onClick={handleGenerateWireframe}
                            disabled={isGeneratingWireframe}
                            className="bg-brand-primary hover:bg-brand-secondary text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all transform hover:scale-105"
                        >
                            {isGeneratingWireframe ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                    <span>Designing Interface...</span>
                                </div>
                            ) : (
                                '✨ Generate Live Preview'
                            )}
                        </button>
                    </div>
                 )}
            </div>
        )}

        {activeTab === 'tokens' && (
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 mb-8">
                <h3 className="text-xl font-bold text-brand-accent mb-6 border-b border-white/10 pb-4 uppercase tracking-widest text-xs">Core Component Library</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {designSystem.coreComponents.map((comp, idx) => (
                        <div key={idx} className="bg-white/5 p-5 rounded-xl border border-white/5 hover:border-brand-secondary/30 transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-white tracking-tight">{comp.name}</h4>
                            </div>
                            <p className="text-xs text-glass-text-secondary mb-4 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">{comp.description}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {comp.states.map((state, sIdx) => (
                                    <span key={sIdx} className="text-[9px] font-bold px-2 py-0.5 bg-black/40 text-glass-text-secondary rounded-full border border-white/5 uppercase tracking-widest">
                                        {state}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {!hideActions && (
        <div className="text-center mt-6">
            <button
            onClick={onContinue}
            className="px-12 py-4 glass-button-primary text-white font-bold rounded-2xl shadow-xl hover:scale-105 transition-all"
            >
            Approve Visual Identity & Define API
            </button>
        </div>
      )}
    </div>
  );
};

export default DesignSystemView;
