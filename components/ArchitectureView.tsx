
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
  <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 flex flex-col items-start gap-1 hover:border-brand-primary/50 transition-colors">
    <div className="flex items-center gap-2 text-glass-text-secondary mb-1">
      <span className="text-sm grayscale">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
    </div>
    <div className="text-sm font-bold text-white truncate w-full" title={value}>{value}</div>
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

  const hasCostData = !!state.projectData.costEstimation;

  return (
    <div className="animate-fade-in h-full flex flex-col overflow-hidden">
      {/* Header Section */}
      <div className="flex-shrink-0 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-xl font-bold text-white tracking-tight">System Architecture</h2>
                <p className="text-xs text-glass-text-secondary">Core components and technical strategy.</p>
            </div>
            
            {/* Tabs */}
            <div className="bg-black/20 p-1 rounded-lg flex border border-white/5">
                {[
                    { id: 'visual', label: 'Builder', icon: '✨' },
                    { id: 'strategy', label: 'Stack', icon: '📚' },
                    { id: 'diagram', label: 'C4 View', icon: '🕸️' },
                    { id: 'iac', label: 'IaC', icon: '🏗️' },
                    { id: 'cost', label: 'Scale', icon: '💰' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                    >
                        <span>{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>
          </div>

          {onRefine && !hideActions && !readOnly && (
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Switch frontend to Vue', 'Use a serverless architecture'" 
                className="mb-2"
            />
          )}
      </div>

      {/* Main Content Area - Flex Grow to take remaining height */}
      <div className="flex-grow min-h-0 relative overflow-hidden bg-[#0b0e14] rounded-xl border border-white/5">
        
        {activeTab === 'visual' && (
            <div className="h-full w-full relative">
                {/* Cost Estimator Mini-Bar Overlay */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-slate-900/90 backdrop-blur border border-white/10 p-3 rounded-xl max-w-xs shadow-2xl">
                    <h4 className="text-[10px] font-bold text-brand-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span>⚡</span> Load Sim
                    </h4>
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-[10px] text-glass-text-secondary mb-1">
                                <span>Users</span>
                                <span className="font-mono text-white">{userCount.toLocaleString()}</span>
                            </div>
                            <input 
                                type="range" 
                                min="100" max="1000000" step="100"
                                value={userCount}
                                onChange={(e) => setUserCount(parseInt(e.target.value))}
                                disabled={readOnly}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <button 
                            onClick={handleGenerateCost}
                            disabled={isGeneratingCost || readOnly}
                            className="w-full py-1 bg-brand-primary/20 hover:bg-brand-primary text-brand-primary hover:text-white text-[10px] font-bold rounded border border-brand-primary/30 transition-all"
                        >
                            {isGeneratingCost ? '...' : 'Simulate'}
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
            </div>
        )}

        {activeTab === 'strategy' && (
            <div className="h-full overflow-y-auto custom-scrollbar p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StackCard title="Frontend" value={architecture.stack.frontend} icon="💻" />
                    <StackCard title="Backend" value={architecture.stack.backend} icon="⚙️" />
                    <StackCard title="Database" value={architecture.stack.database} icon="🗄️" />
                    <StackCard title="Deploy" value={architecture.stack.deployment} icon="🚀" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-slate-900/50 p-6 rounded-xl border border-white/5">
                        <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Rationale</h3>
                        <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-brand-secondary pl-4">
                            "{architecture.stack.rationale}"
                        </p>
                    </div>

                    <div className="lg:col-span-1 bg-slate-900/50 p-6 rounded-xl border border-white/5">
                        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Patterns</h3>
                        <div className="flex flex-wrap gap-2">
                            {architecture.patterns.map((p, i) => (
                                <span key={i} className="px-2 py-1 text-[10px] font-bold bg-white/5 text-glass-text-secondary border border-white/10 rounded">
                                    {p}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'diagram' && (
            <div className="h-full flex flex-col items-center justify-center p-6">
                {architecture.cloudDiagram ? (
                    <div className="w-full h-full flex flex-col">
                        <div className="mermaid flex-grow flex items-center justify-center overflow-auto custom-scrollbar">
                            {architecture.cloudDiagram}
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                         <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">🕸️</span>
                         </div>
                         <h3 className="text-lg font-bold text-white mb-2">C4 Context Diagram</h3>
                         <button
                            onClick={handleGenerateInfrastructure}
                            disabled={isGeneratingCloud || readOnly}
                            className="mt-4 bg-brand-primary hover:bg-brand-secondary text-white px-6 py-2 rounded-lg text-xs font-bold shadow-lg transition-all disabled:opacity-50"
                         >
                            {isGeneratingCloud ? 'Generating...' : 'Generate Diagram'}
                         </button>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'iac' && (
             <div className="h-full flex flex-col">
                {architecture.iacCode ? (
                    <div className="h-full flex flex-col">
                        <div className="bg-black/20 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                            <span className="text-xs font-mono text-brand-accent">main.tf</span>
                            <button 
                                onClick={() => navigator.clipboard.writeText(architecture.iacCode || '')}
                                className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-2 py-1 rounded"
                            >
                                Copy
                            </button>
                        </div>
                        <div className="flex-grow overflow-hidden">
                            <CodeEditor 
                                value={architecture.iacCode}
                                readOnly={true}
                                language="hcl"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                         <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">🏗️</span>
                         </div>
                         <h3 className="text-lg font-bold text-white mb-2">Infrastructure as Code</h3>
                         <button
                            onClick={handleGenerateInfrastructure}
                            disabled={isGeneratingCloud || readOnly}
                            className="mt-4 bg-brand-primary hover:bg-brand-secondary text-white px-6 py-2 rounded-lg text-xs font-bold shadow-lg transition-all disabled:opacity-50"
                         >
                            {isGeneratingCloud ? 'Coding...' : 'Generate Terraform'}
                         </button>
                    </div>
                )}
             </div>
        )}

        {activeTab === 'cost' && (
            <div className="h-full overflow-y-auto custom-scrollbar p-6">
                 {hasCostData ? (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider">Monthly Infrastructure</h4>
                                {state.projectData.costEstimation?.monthlyInfrastructure.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                        <div>
                                            <div className="font-bold text-white text-sm">{item.service}</div>
                                            <div className="text-[10px] text-slate-400">{item.reason}</div>
                                        </div>
                                        <div className="font-mono text-brand-secondary font-bold text-sm">{item.estimatedCost}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 text-center">
                                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Dev Hours</div>
                                        <div className="text-xl font-bold text-white">{state.projectData.costEstimation?.totalProjectHours}</div>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 text-center">
                                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Team Size</div>
                                        <div className="text-xl font-bold text-white">{state.projectData.costEstimation?.suggestedTeamSize}</div>
                                    </div>
                                </div>
                                
                                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
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
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">📊</span>
                        </div>
                        <p className="text-sm">Use the visual builder to simulate load and generate estimates.</p>
                        <button 
                            onClick={handleGenerateCost}
                            className="mt-4 bg-brand-primary hover:bg-brand-secondary text-white px-6 py-2 rounded-lg text-xs font-bold"
                        >
                            Calculate Initial Estimate
                        </button>
                    </div>
                 )}
            </div>
        )}
      </div>

      {/* Footer */}
      {!hideActions && activeTab === 'visual' && !readOnly && (
        <div className="flex-shrink-0 pt-4 flex justify-end">
            <button
            onClick={onContinue}
            className="px-6 py-2 bg-white/5 hover:bg-brand-primary text-white text-xs font-bold rounded-lg border border-white/10 transition-all flex items-center gap-2"
            >
            <span>Next: Data Model</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
        </div>
      )}
    </div>
  );
};

export default ArchitectureView;
