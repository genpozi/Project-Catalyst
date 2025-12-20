
import React, { useState } from 'react';
import { SecurityContext, ComplianceItem, RBACMatrix } from '../types';
import RefineBar from './RefineBar';
import { GeminiService } from '../GeminiService';
import { useProject } from '../ProjectContext';
import VisualRBAC from './VisualRBAC';

interface SecurityViewProps {
  securityContext?: SecurityContext;
  onUpdate?: (context: SecurityContext) => void;
  onContinue: () => void;
  hideActions?: boolean;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
}

const COMPLIANCE_STANDARDS = [
    { id: 'SOC2', label: 'SOC2 Type II', icon: '🏢' },
    { id: 'HIPAA', label: 'HIPAA', icon: '🏥' },
    { id: 'GDPR', label: 'GDPR', icon: '🇪🇺' },
    { id: 'PCI-DSS', label: 'PCI DSS', icon: '💳' },
    { id: 'ISO27001', label: 'ISO 27001', icon: '🌐' }
];

const SecurityView: React.FC<SecurityViewProps> = ({ securityContext, onUpdate, onContinue, hideActions, onRefine, isRefining = false }) => {
  const { state } = useProject();
  const [activeTab, setActiveTab] = useState<'matrix' | 'policies' | 'compliance'>('matrix');
  const [selectedStandard, setSelectedStandard] = useState(COMPLIANCE_STANDARDS[0].id);
  const [isGeneratingCompliance, setIsGeneratingCompliance] = useState(false);
  const gemini = React.useMemo(() => new GeminiService(), []);

  if (!securityContext) return null;

  const handleUpdateRBAC = (matrix: RBACMatrix) => {
      if(onUpdate) onUpdate({ ...securityContext, rbacMatrix: matrix });
  };

  const handleToggleStatus = (id: string) => {
      if (!onUpdate || !securityContext.complianceChecklist) return;
      
      const newChecklist = securityContext.complianceChecklist.map(item => {
          if (item.id === id) {
              const nextStatus = item.status === 'Met' ? 'Pending' : (item.status === 'Pending' ? 'N/A' : 'Met');
              return { ...item, status: nextStatus };
          }
          return item;
      });
      
      onUpdate({ ...securityContext, complianceChecklist: newChecklist as ComplianceItem[] });
  };

  const handleGenerateCompliance = async () => {
      if(!onUpdate) return;
      setIsGeneratingCompliance(true);
      try {
          const checklist = await gemini.generateComplianceChecklist(selectedStandard, state.projectData);
          onUpdate({ ...securityContext, complianceChecklist: checklist });
      } catch(e) {
          alert("Failed to generate compliance report.");
      } finally {
          setIsGeneratingCompliance(false);
      }
  };

  const metCount = securityContext.complianceChecklist?.filter(i => i.status === 'Met').length || 0;
  const totalCount = securityContext.complianceChecklist?.length || 0;
  const progress = totalCount > 0 ? (metCount / totalCount) * 100 : 0;

  return (
    <div className="animate-slide-in-up flex flex-col h-full">
      {!hideActions && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2 text-center">Security & Quality Assurance</h2>
            <p className="text-center text-blue-200 mb-8 max-w-3xl mx-auto">
                Define access controls, ensure compliance, and establish testing strategies.
            </p>
          </>
      )}

      {onRefine && !hideActions && (
        <div className="max-w-3xl mx-auto mb-8 w-full">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Add a policy for rate limiting', 'Require HIPAA compliance'" 
            />
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-800 p-1 rounded-lg inline-flex">
            <button 
                onClick={() => setActiveTab('matrix')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'matrix' ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
            >
                🔑 Access Matrix
            </button>
            <button 
                onClick={() => setActiveTab('policies')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'policies' ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
            >
                🛡️ Policies
            </button>
            <button 
                onClick={() => setActiveTab('compliance')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'compliance' ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
            >
                ⚖️ Compliance
            </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar min-h-[500px]">
        {activeTab === 'matrix' && (
            <div className="animate-fade-in space-y-6">
                <VisualRBAC matrix={securityContext.rbacMatrix} onUpdate={handleUpdateRBAC} />
                
                {/* Testing Strategy Below Matrix */}
                <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700 mt-8">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                        <span className="text-2xl">🧪</span>
                        <h3 className="text-xl font-bold text-brand-accent">Testing Strategy</h3>
                    </div>
                    <div className="space-y-3">
                        {securityContext.testingStrategy.map((test, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-700/30 p-3 rounded hover:bg-slate-700/50 transition-colors">
                            <div>
                                <span className="font-medium text-white block">{test.name}</span>
                                <span className="text-xs text-slate-400">{test.description}</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded text-center min-w-[80px] ${
                                test.type === 'E2E' ? 'bg-purple-900/50 text-purple-200 border border-purple-700' :
                                test.type === 'Integration' ? 'bg-blue-900/50 text-blue-200 border border-blue-700' :
                                'bg-green-900/50 text-green-200 border border-green-700'
                            }`}>
                                {test.type}
                            </span>
                        </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'policies' && (
            <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700 animate-fade-in">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                <span className="text-2xl">📜</span>
                <h3 className="text-xl font-bold text-brand-accent">Security Policies</h3>
              </div>
              <div className="space-y-4">
                {securityContext.policies.map((policy, idx) => (
                  <div key={idx} className="bg-slate-700/30 p-4 rounded-lg border-l-4 border-brand-secondary">
                    <h4 className="font-bold text-white text-sm uppercase tracking-wide">{policy.name}</h4>
                    <p className="text-slate-300 text-sm mt-1">{policy.description}</p>
                    <div className="mt-2 text-xs font-mono text-brand-accent bg-slate-900/50 p-2 rounded">
                       Implementation: {policy.implementationHint}
                    </div>
                  </div>
                ))}
              </div>
            </div>
        )}

        {activeTab === 'compliance' && (
            <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700 animate-fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 border-b border-slate-700 pb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">⚖️</span>
                        <h3 className="text-xl font-bold text-brand-accent">Compliance Audit</h3>
                    </div>
                    
                    {/* Compliance Selector */}
                    <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-slate-700">
                        <select 
                            value={selectedStandard}
                            onChange={(e) => setSelectedStandard(e.target.value)}
                            className="bg-transparent text-xs font-bold text-white outline-none border-none p-1 cursor-pointer"
                        >
                            {COMPLIANCE_STANDARDS.map(s => (
                                <option key={s.id} value={s.id} className="bg-slate-900">{s.icon} {s.label}</option>
                            ))}
                        </select>
                        <button 
                            onClick={handleGenerateCompliance}
                            disabled={isGeneratingCompliance}
                            className="bg-brand-primary hover:bg-brand-secondary text-white text-[10px] px-2 py-1 rounded font-bold transition-all disabled:opacity-50"
                        >
                            {isGeneratingCompliance ? 'Scanning...' : 'Audit'}
                        </button>
                    </div>
                </div>
                
                {/* Progress Bar */}
                {totalCount > 0 && (
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-glass-text-secondary mb-1">
                            <span>Readiness Score</span>
                            <span className="font-mono">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-yellow-500 to-green-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}

                {/* Checklist */}
                {(!securityContext.complianceChecklist || securityContext.complianceChecklist.length === 0) && (
                    <div className="text-center text-slate-500 py-8 italic text-sm border border-dashed border-slate-700 rounded">
                        Select a standard above and run an audit to generate compliance requirements.
                    </div>
                )}

                {securityContext.complianceChecklist && securityContext.complianceChecklist.length > 0 && (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {securityContext.complianceChecklist.map((item, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => handleToggleStatus(item.id)}
                                className={`p-3 rounded border flex flex-col gap-2 cursor-pointer transition-all ${
                                    item.status === 'Met' ? 'bg-green-900/10 border-green-800' : 
                                    item.status === 'N/A' ? 'bg-slate-800 border-slate-700 opacity-50' : 
                                    'bg-slate-900/50 border-slate-700 hover:border-brand-secondary/50'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                            item.status === 'Met' ? 'bg-green-500 border-green-500 text-black' : 'border-slate-500'
                                        }`}>
                                            {item.status === 'Met' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-brand-secondary bg-brand-secondary/10 px-2 py-0.5 rounded">{item.standard}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                        item.status === 'Met' ? 'text-green-400 bg-green-900/30' :
                                        item.status === 'N/A' ? 'text-slate-500 bg-slate-800' :
                                        'text-yellow-500 bg-yellow-900/20'
                                    }`}>
                                        {item.status}
                                    </span>
                                </div>
                                <div className={`text-sm font-semibold ${item.status === 'N/A' ? 'text-slate-500 line-through' : 'text-white'}`}>
                                    {item.requirement}
                                </div>
                                {item.status !== 'N/A' && (
                                    <div className="text-xs text-slate-400 bg-black/20 p-2 rounded flex gap-2 items-start">
                                        <span className="text-yellow-500 mt-0.5">⚡</span> 
                                        <span>{item.action}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>

      {!hideActions && (
        <div className="text-center mt-6">
            <button
            onClick={onContinue}
            className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
            >
            Generate Final Agent Rules
            </button>
        </div>
      )}
    </div>
  );
};

export default SecurityView;
