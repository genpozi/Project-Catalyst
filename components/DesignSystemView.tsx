
import React, { useState } from 'react';
import { DesignSystem } from '../types';
import RefineBar from './RefineBar';
import { useProject } from '../ProjectContext';
import { GeminiService } from '../GeminiService';
import VisualDesignEditor from './VisualDesignEditor';
import { generateTailwindConfig } from '../utils/codeGenerators';
import CodeEditor from './CodeEditor';

interface DesignSystemViewProps {
  designSystem?: DesignSystem;
  onContinue: () => void;
  hideActions?: boolean;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
  readOnly?: boolean;
}

const DesignSystemView: React.FC<DesignSystemViewProps> = ({ designSystem, onContinue, hideActions, onRefine, isRefining = false, readOnly = false }) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'config'>('editor');
  const [isGeneratingWireframe, setIsGeneratingWireframe] = useState(false);
  const { dispatch, state } = useProject();
  const gemini = React.useMemo(() => new GeminiService(), []);

  if (!designSystem) return null;

  const handleUpdate = (updatedSystem: DesignSystem) => {
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { designSystem: updatedSystem } });
  };

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

  const configCode = generateTailwindConfig(designSystem);

  return (
    <div className="animate-fade-in flex flex-col h-full overflow-hidden">
      
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-xl font-bold text-white tracking-tight">UI/UX Design System</h2>
                <p className="text-xs text-glass-text-secondary">Visual language and component tokens.</p>
            </div>
            
            <div className="bg-black/20 p-1 rounded-lg flex border border-white/5">
                <button 
                  onClick={() => setActiveTab('editor')}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${activeTab === 'editor' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                  ✨ Editor
                </button>
                <button 
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${activeTab === 'preview' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                  HTML Prototype
                </button>
                <button 
                  onClick={() => setActiveTab('config')}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${activeTab === 'config' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                  Config
                </button>
            </div>
          </div>

          {onRefine && !hideActions && !readOnly && (
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Use a pastel color palette', 'Add a floating action button component'" 
                className="mb-2"
            />
          )}
      </div>

      <div className="flex-grow min-h-0 bg-[#0b0e14] rounded-xl border border-white/5 relative overflow-hidden flex flex-col">
        {activeTab === 'editor' && (
            <div className="h-full overflow-y-auto custom-scrollbar">
                <div className="space-y-8 p-6">
                    <VisualDesignEditor system={designSystem} onUpdate={handleUpdate} />
                    
                    {/* Core Component Specs */}
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
                        <h3 className="text-sm font-bold text-brand-accent mb-6 border-b border-white/10 pb-4 uppercase tracking-widest">Core Component Library</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {designSystem.coreComponents.map((comp, idx) => (
                                <div key={idx} className="bg-white/5 p-5 rounded-xl border border-white/5 hover:border-brand-secondary/30 transition-all group">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-bold text-white tracking-tight text-sm">{comp.name}</h4>
                                    </div>
                                    <p className="text-[10px] text-glass-text-secondary mb-4 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">{comp.description}</p>
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
                </div>
            </div>
        )}

        {activeTab === 'preview' && (
            <div className="h-full w-full relative bg-white">
                 {designSystem.wireframeCode ? (
                    <>
                      <iframe 
                        srcDoc={designSystem.wireframeCode}
                        className="w-full h-full border-0"
                        title="Live Preview"
                      />
                      <button 
                        onClick={handleGenerateWireframe}
                        disabled={isGeneratingWireframe || readOnly}
                        className="absolute bottom-4 right-4 bg-black/80 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-md border border-white/20 transition-all flex items-center gap-2 shadow-xl"
                      >
                        {isGeneratingWireframe ? 'Regenerating...' : '🔄 Regenerate Prototype'}
                      </button>
                    </>
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500">
                        <div className="w-16 h-16 bg-slate-200 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                            <span className="text-3xl">🎨</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">Interactive Prototype</h3>
                        <p className="max-w-md text-center text-xs mb-8">
                            Generate a live HTML/Tailwind wireframe based on your specific idea and design tokens.
                        </p>
                        <button 
                            onClick={handleGenerateWireframe}
                            disabled={isGeneratingWireframe || readOnly}
                            className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

        {activeTab === 'config' && (
            <div className="h-full flex flex-col">
                <div className="bg-slate-900 px-4 py-2 border-b border-white/5 flex justify-between items-center flex-shrink-0">
                    <span className="text-xs font-mono text-brand-accent">tailwind.config.js</span>
                    <button 
                        onClick={() => navigator.clipboard.writeText(configCode)}
                        className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-2 py-1 rounded transition-all"
                    >
                        Copy
                    </button>
                </div>
                <div className="flex-grow relative overflow-hidden">
                    <CodeEditor value={configCode} language="javascript" readOnly={true} />
                </div>
            </div>
        )}
      </div>

      {!hideActions && !readOnly && (
        <div className="flex-shrink-0 pt-4 flex justify-end">
            <button
            onClick={onContinue}
            className="px-6 py-2 bg-white/5 hover:bg-brand-primary text-white text-xs font-bold rounded-lg border border-white/10 transition-all flex items-center gap-2"
            >
            <span>Next: API Spec</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
        </div>
      )}
    </div>
  );
};

export default DesignSystemView;
