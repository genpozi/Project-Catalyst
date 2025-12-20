
import React, { useState, useEffect, useMemo } from 'react';
import { ArchitectureData, ArchitectureNode, ArchitectureEdge } from '../types';
import RefineBar from './RefineBar';
import { useProject } from '../ProjectContext';
import { GeminiService } from '../GeminiService';
import VisualArchitecture, { NodeStatusMap } from './VisualArchitecture';
import { useToast } from './Toast';
import CodeEditor from './CodeEditor';

interface ArchitectureViewProps {
  architecture?: ArchitectureData;
  onContinue: () => void;
  hideActions?: boolean;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
  readOnly?: boolean;
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

const ArchitectureView: React.FC<ArchitectureViewProps> = ({ architecture, onContinue, hideActions, onRefine, isRefining = false, readOnly = false }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'strategy' | 'diagram' | 'iac' | 'cost'>('visual');
  const [isGeneratingCloud, setIsGeneratingCloud] = useState(false);
  const [isGeneratingCost, setIsGeneratingCost] = useState(false);
  
  // Cost Metric State
  const [userCount, setUserCount] = useState(1000);
  const [storageGB, setStorageGB] = useState(10);

  const { state, dispatch } = useProject();
  const { addToast } = useToast();
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

  // Derive Node Status from Cost/Risks
  const nodeStatuses = useMemo<NodeStatusMap>(() => {
      if (!state.projectData.costEstimation?.risks) return {};
      
      const map: NodeStatusMap = {};
      const risks = state.projectData.costEstimation.risks;

      risks.forEach(risk => {
          const desc = risk.description.toLowerCase();
          let targetType = '';
          
          if (desc.includes('database') || desc.includes('storage') || desc.includes('sql') || desc.includes('db')) targetType = 'database';
          else if (desc.includes('api') || desc.includes('server') || desc.includes('backend') || desc.includes('cpu')) targetType = 'backend';
          else if (desc.includes('client') || desc.includes('frontend') || desc.includes('browser') || desc.includes('bundle')) targetType = 'frontend';
          else if (desc.includes('cache') || desc.includes('redis')) targetType = 'cache';
          
          if (targetType) {
              map[targetType] = {
                  status: risk.impact.toLowerCase().includes('high') ? 'critical' : 'warning',
                  message: risk.description
              };
          }
      });
      return map;
  }, [state.projectData.costEstimation]);

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

  const handleGenerateCost = async () => {
    setIsGeneratingCost(true);
    try {
        const cost = await gemini.generateScaledCost({ users: userCount, storage: storageGB }, state.projectData);
        dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { costEstimation: cost } });
        // Also switch to visual tab to show impact if risks found
        if (cost.risks.some(r => r.impact.toLowerCase().includes('high'))) {
            addToast("High risks detected. Check Visual Builder.", "warning");
        }
    } catch (e) {
        console.error("Cost generation failed", e);
        alert("Failed to calculate costs.");
    } finally {
        setIsGeneratingCost(false);
    }
  };

  const handleUpdateArchitecture = (updated: ArchitectureData) => {
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { architecture: updated } });
  };

  const handleSyncToSpec = async (nodes: ArchitectureNode[], edges: ArchitectureEdge[]) => {
      try {
          const updatedArch = await gemini.syncSpecFromGraph(architecture, nodes, edges);
          // Preserve nodes/edges state
          const mergedArch = { ...updatedArch, visualLayout: nodes, visualEdges: edges };
          dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { architecture: mergedArch } });
          addToast("Tech Stack updated from Visual Graph", "success");
      } catch (e) {
          console.error(e);
          addToast("Failed to sync architecture.", "error");
      }
  };

  const handleGenerateFromSpec = async () => {
      try {
          const layout = await gemini.generateGraphLayout(architecture.stack);
          const updatedArch = { ...architecture, visualLayout: layout.nodes, visualEdges: layout.edges };
          dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { architecture: updatedArch } });
          addToast("Graph auto-generated from Tech Stack", "success");
      } catch (e) {
          console.error(e);
          addToast("Failed to generate layout.", "error");
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

  const hasCostData = !!state.projectData.costEstimation;

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

      {onRefine && !hideActions && !readOnly && (
        <div className="max-w-3xl mx-auto mb-6 w-full">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Switch frontend to Vue', 'Use a serverless architecture'" 
            />
        </div>
      )}

      <div className="flex justify-center mb-6">
        <div className="bg-white/5 p-1 rounded-xl flex overflow-x-auto max-w-full">
            <button 
                onClick={() => setActiveTab('visual')}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'visual' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
            >
                <span>✨</span> Visual Builder
            </button>
            <button 
                onClick={() => setActiveTab('strategy')}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all whitespace-nowrap ${activeTab === 'strategy' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
            >
                Stack Strategy
            </button>
            <button 
                onClick={() => setActiveTab('diagram')}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all whitespace-nowrap ${activeTab === 'diagram' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
            >
                System Diagram
            </button>
            <button 
                onClick={() => setActiveTab('iac')}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all whitespace-nowrap ${activeTab === 'iac' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
            >
                Infrastructure (IaC)
            </button>
            <button 
                onClick={() => setActiveTab('cost')}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all whitespace-nowrap ${activeTab === 'cost' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
            >
                Cost & Scale
            </button>
        </div>
      </div>

      <div className="flex-grow">
        {activeTab === 'visual' && (
            <div className="animate-fade-in h-full relative">
                {/* Cost Estimator Mini-Bar */}
                <div className="absolute top-4 left-20 z-10 flex flex-col gap-2 bg-slate-900/80 backdrop-blur border border-white/10 p-3 rounded-xl max-w-xs shadow-xl">
                    <h4 className="text-[10px] font-bold text-brand-secondary uppercase tracking-wider mb-2">Live Load Simulation</h4>
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-[10px] text-glass-text-secondary mb-1">
                                <span>Users (MAU)</span>
                                <span>{userCount.toLocaleString()}</span>
                            </div>
                            <input 
                                type="range" 
                                min="100" max="1000000" step="100"
                                value={userCount}
                                onChange={(e) => setUserCount(parseInt(e.target.value))}
                                disabled={readOnly}
                                className="w-full accent-brand-secondary cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-glass-text-secondary mb-1">
                                <span>Storage (GB)</span>
                                <span>{storageGB}</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" max="1000" step="1"
                                value={storageGB}
                                onChange={(e) => setStorageGB(parseInt(e.target.value))}
                                disabled={readOnly}
                                className="w-full accent-brand-secondary cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                            />
                        </div>
                        <button 
                            onClick={handleGenerateCost}
                            disabled={isGeneratingCost || readOnly}
                            className="w-full py-1.5 bg-brand-primary/20 hover:bg-brand-primary text-brand-primary hover:text-white text-[10px] font-bold rounded border border-brand-primary/30 transition-all flex justify-center gap-2"
                        >
                            {isGeneratingCost ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : '⚡ Apply Load'}
                        </button>
                    </div>
                </div>

                <VisualArchitecture 
                    architecture={architecture} 
                    onUpdate={handleUpdateArchitecture}
                    onSyncToSpec={handleSyncToSpec}
                    onGenerateFromSpec={handleGenerateFromSpec}
                    nodeStatuses={nodeStatuses}
                    fileStructure={state.projectData.fileStructure}
                    readOnly={readOnly}
                />
                <p className="text-center text-[10px] text-glass-text-secondary mt-2 opacity-70">
                    Interactive Canvas: Drag nodes to rearrange. Adjust load sliders to test scalability. Click nodes to link code.
                </p>
            </div>
        )}

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
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
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
                            disabled={isGeneratingCloud || readOnly}
                            className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
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
                        <div className="flex-grow overflow-hidden relative">
                            <CodeEditor 
                                value={architecture.iacCode}
                                readOnly={true}
                                language="hcl" // Terraform/HCL approximation
                            />
                        </div>
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
                            disabled={isGeneratingCloud || readOnly}
                            className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
                         >
                            {isGeneratingCloud ? 'Coding Infrastructure...' : 'Generate Terraform Config'}
                         </button>
                    </div>
                )}
             </div>
        )}

        {activeTab === 'cost' && (
            <div className="animate-fade-in">
                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 min-h-[400px] flex flex-col">
                     <div className="flex flex-col gap-6 mb-6 border-b border-slate-700 pb-6">
                         <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-brand-accent flex items-center gap-2">
                                <span>💰</span> Cloud Cost Intelligence
                            </h3>
                            <button 
                                onClick={handleGenerateCost}
                                disabled={isGeneratingCost || readOnly}
                                className="bg-brand-primary hover:bg-brand-secondary text-white text-xs px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
                            >
                                {isGeneratingCost ? 'Calculating...' : 'Recalculate Estimate'}
                            </button>
                         </div>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-black/20 p-4 rounded-xl border border-slate-700/50">
                             <div>
                                 <label className="text-xs font-bold text-glass-text-secondary uppercase mb-2 block">Monthly Active Users (MAU)</label>
                                 <div className="flex items-center gap-3">
                                     <input 
                                        type="range" 
                                        min="100" max="1000000" step="100"
                                        value={userCount}
                                        onChange={(e) => setUserCount(parseInt(e.target.value))}
                                        disabled={readOnly}
                                        className="w-full accent-brand-secondary cursor-pointer"
                                     />
                                     <span className="text-sm font-mono text-white min-w-[80px] text-right">{userCount.toLocaleString()}</span>
                                 </div>
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-glass-text-secondary uppercase mb-2 block">Database Storage (GB)</label>
                                 <div className="flex items-center gap-3">
                                     <input 
                                        type="range" 
                                        min="1" max="1000" step="1"
                                        value={storageGB}
                                        onChange={(e) => setStorageGB(parseInt(e.target.value))}
                                        disabled={readOnly}
                                        className="w-full accent-brand-secondary cursor-pointer"
                                     />
                                     <span className="text-sm font-mono text-white min-w-[80px] text-right">{storageGB} GB</span>
                                 </div>
                             </div>
                         </div>
                     </div>

                     {hasCostData ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow animate-fade-in">
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Monthly Estimates</h4>
                                {state.projectData.costEstimation?.monthlyInfrastructure.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-900/30 p-3 rounded-lg border border-slate-700/50">
                                        <div>
                                            <div className="font-bold text-white text-sm">{item.service}</div>
                                            <div className="text-xs text-slate-400">{item.reason}</div>
                                        </div>
                                        <div className="font-mono text-brand-secondary font-bold">{item.estimatedCost}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600 text-center">
                                        <div className="text-xs uppercase text-slate-500 font-bold mb-1">Dev Hours</div>
                                        <div className="text-xl font-bold text-white">{state.projectData.costEstimation?.totalProjectHours}</div>
                                    </div>
                                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600 text-center">
                                        <div className="text-xs uppercase text-slate-500 font-bold mb-1">Team Size</div>
                                        <div className="text-xl font-bold text-white">{state.projectData.costEstimation?.suggestedTeamSize}</div>
                                    </div>
                                </div>
                                
                                <div className="bg-red-900/10 p-4 rounded-lg border border-red-900/30 flex-grow">
                                    <h3 className="text-xs font-bold text-red-400 mb-3 uppercase tracking-wider">Risk Factors</h3>
                                    <ul className="space-y-2">
                                        {state.projectData.costEstimation?.risks.map((risk, i) => (
                                            <li key={i} className="flex gap-2 text-xs text-red-200">
                                                <span>⚠️</span>
                                                <span><strong>{risk.impact}:</strong> {risk.description}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                     ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">📊</span>
                            </div>
                            <p>Adjust scale parameters and hit recalculate to generate estimates.</p>
                        </div>
                     )}
                </div>
            </div>
        )}
      </div>

      {!hideActions && activeTab === 'visual' && !readOnly && (
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
