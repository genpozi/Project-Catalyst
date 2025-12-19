
import React, { useState, useEffect, useMemo } from 'react';
import { ArchitectureData } from '../types';
import RefineBar from './RefineBar';
import { useProject } from '../ProjectContext';
import { GeminiService } from '../GeminiService';

interface ArchitectureViewProps {
  architecture?: ArchitectureData;
  onContinue: () => void;
  hideActions?: boolean;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
}

const StackCard: React.FC<{ title: string; value: string; icon: string }> = ({ title, value, icon }) => (
  <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 flex flex-col items-start gap-2 hover:border-brand-accent transition-colors">
    <div className="flex items-center gap-2 text-brand-accent mb-1">
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-bold uppercase tracking-wider">{title}</span>
    </div>
    <div className="text-lg font-medium text-white">{value}</div>
  </div>
);

const ArchitectureView: React.FC<ArchitectureViewProps> = ({ architecture, onContinue, hideActions, onRefine, isRefining = false }) => {
  const [activeTab, setActiveTab] = useState<'strategy' | 'diagram' | 'iac'>('strategy');
  const [isGeneratingCloud, setIsGeneratingCloud] = useState(false);
  const { state, dispatch } = useProject();
  const gemini = useMemo(() => new GeminiService(), []);

  // Initialize mermaid when tab changes
  useEffect(() => {
    if (activeTab === 'diagram' && architecture?.cloudDiagram) {
        // @ts-ignore
        if (window.mermaid) {
            // @ts-ignore
            window.mermaid.initialize({ startOnLoad: true, theme: 'dark' });
            // @ts-ignore
            window.mermaid.run();
        }
    }
  }, [activeTab, architecture?.cloudDiagram]);

  if (!architecture) return null;

  const handleGenerateInfrastructure = async () => {
    setIsGeneratingCloud(true);
    try {
        const result = await gemini.generateCloudInfrastructure(state.projectData);
        const updatedArch = { ...architecture, iacCode: result.iacCode, cloudDiagram: result.cloudDiagram };
        dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { architecture: updatedArch } });
    } catch (e) {
        console.error("Cloud Infra generation failed", e);
        alert("Failed to generate infrastructure. Please try again.");
    } finally {
        setIsGeneratingCloud(false);
    }
  };

  const handleOpenMermaidLive = () => {
    if (!architecture.cloudDiagram) return;
    const state = {
      code: architecture.cloudDiagram,
      mermaid: { theme: 'dark' },
    };
    const json = JSON.stringify(state);
    const encoded = btoa(json);
    window.open(`https://mermaid.live/edit#base64:${encoded}`, '_blank');
  };

  const hasCloudData = architecture.iacCode || architecture.cloudDiagram;

  return (
    <div className="animate-slide-in-up h-full flex flex-col">
      {!hideActions && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2 text-center">Technical Architecture Strategy</h2>
            <p className="text-center text-blue-200 mb-8 max-w-3xl mx-auto">
                Based on your requirements, here is the recommended technology stack and architectural approach.
            </p>
          </>
      )}

      {onRefine && !hideActions && (
        <div className="max-w-3xl mx-auto mb-6 w-full">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Switch frontend to Vue', 'Use a serverless architecture'" 
            />
        </div>
      )}

      <div className="flex justify-center mb-6">
        <div className="bg-white/5 p-1 rounded-xl flex">
            <button 
                onClick={() => setActiveTab('strategy')}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'strategy' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
            >
                Stack Strategy
            </button>
            <button 
                onClick={() => setActiveTab('diagram')}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'diagram' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
            >
                System Diagram
            </button>
            <button 
                onClick={() => setActiveTab('iac')}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'iac' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
            >
                Infrastructure (IaC)
            </button>
        </div>
      </div>

      <div className="flex-grow">
        {activeTab === 'strategy' && (
            <div className="animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <StackCard title="Frontend Framework" value={architecture.stack.frontend} icon="💻" />
                    <StackCard title="Backend Runtime" value={architecture.stack.backend} icon="⚙️" />
                    <StackCard title="Database" value={architecture.stack.database} icon="🗄️" />
                    <StackCard title="Styling System" value={architecture.stack.styling} icon="🎨" />
                    <StackCard title="Deployment" value={architecture.stack.deployment} icon="🚀" />
                    <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 flex flex-col items-start gap-2 hover:border-brand-accent transition-colors">
                        <div className="flex items-center gap-2 text-brand-accent mb-1">
                            <span className="text-xl">🏗️</span>
                            <span className="text-sm font-bold uppercase tracking-wider">Design Patterns</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {architecture.patterns.map((p, i) => (
                                <span key={i} className="px-2 py-1 text-xs bg-brand-secondary/20 text-brand-accent border border-brand-secondary/30 rounded-full">
                                    {p}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 bg-slate-800/80 p-6 rounded-lg border border-slate-600">
                        <h3 className="text-xl font-bold text-white mb-3">Architectural Rationale</h3>
                        <p className="text-blue-100 leading-relaxed italic border-l-4 border-brand-secondary pl-4">
                            "{architecture.stack.rationale}"
                        </p>
                    </div>

                    <div className="lg:col-span-1 bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">📦</span>
                            <h3 className="text-xl font-bold text-white">Core Dependencies</h3>
                        </div>
                        <ul className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {architecture.dependencies?.map((dep, i) => (
                                <li key={i} className="text-sm bg-slate-800 p-2 rounded flex justify-between items-center group">
                                    <span className="font-mono text-brand-accent font-bold">{dep.name}</span>
                                    <span className="text-xs text-slate-500 truncate max-w-[120px]" title={dep.description}>{dep.description}</span>
                                </li>
                            ))}
                            {!architecture.dependencies?.length && (
                                <li className="text-sm text-slate-500 italic">No specific dependencies listed.</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'diagram' && (
            <div className="animate-fade-in bg-slate-800/50 rounded-lg ring-1 ring-slate-700 min-h-[400px] p-6 relative flex flex-col items-center justify-center">
                {architecture.cloudDiagram ? (
                    <div className="w-full h-full flex flex-col">
                        <div className="flex justify-end mb-2">
                            <button 
                                onClick={handleOpenMermaidLive}
                                className="text-xs bg-slate-700 hover:bg-brand-primary text-white px-3 py-2 rounded shadow flex items-center gap-2 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                Edit Diagram
                            </button>
                        </div>
                        <div className="mermaid flex justify-center">
                            {architecture.cloudDiagram}
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                         <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">🕸️</span>
                         </div>
                         <h3 className="text-xl font-bold text-white mb-2">Visual Cloud Architecture</h3>
                         <p className="text-glass-text-secondary max-w-md mx-auto mb-6">
                            Generate a C4 System Context diagram to visualize how your containers, databases, and external systems interact.
                         </p>
                         <button
                            onClick={handleGenerateInfrastructure}
                            disabled={isGeneratingCloud}
                            className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all"
                         >
                            {isGeneratingCloud ? 'Architecting...' : 'Generate System Diagram'}
                         </button>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'iac' && (
             <div className="animate-fade-in h-[500px] flex flex-col">
                {architecture.iacCode ? (
                    <div className="bg-slate-950 rounded-lg border border-slate-700 h-full overflow-hidden flex flex-col">
                        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                            <span className="text-xs font-mono text-brand-accent">main.tf</span>
                            <button 
                                onClick={() => navigator.clipboard.writeText(architecture.iacCode || '')}
                                className="text-xs text-slate-400 hover:text-white"
                            >
                                Copy Code
                            </button>
                        </div>
                        <pre className="p-4 overflow-auto custom-scrollbar flex-grow text-sm font-mono text-blue-200">
                            {architecture.iacCode}
                        </pre>
                    </div>
                ) : (
                    <div className="bg-slate-800/50 rounded-lg ring-1 ring-slate-700 h-full flex flex-col items-center justify-center text-center p-8">
                         <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">🏗️</span>
                         </div>
                         <h3 className="text-xl font-bold text-white mb-2">Infrastructure as Code (IaC)</h3>
                         <p className="text-glass-text-secondary max-w-md mx-auto mb-6">
                            Generate production-ready Terraform scripts tailored to your {architecture.stack.deployment} environment.
                         </p>
                         <button
                            onClick={handleGenerateInfrastructure}
                            disabled={isGeneratingCloud}
                            className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all"
                         >
                            {isGeneratingCloud ? 'Coding Infrastructure...' : 'Generate Terraform Config'}
                         </button>
                    </div>
                )}
             </div>
        )}
      </div>

      {!hideActions && activeTab === 'strategy' && (
        <div className="text-center mt-8">
            <button
            onClick={onContinue}
            className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
            >
            Generate Implementation Plan
            </button>
        </div>
      )}
    </div>
  );
};

export default ArchitectureView;
