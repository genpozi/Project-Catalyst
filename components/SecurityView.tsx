
import React, { useState, useEffect, useRef } from 'react';
import { SecurityContext, ComplianceItem, RBACMatrix, RateLimitConfig } from '../types';
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
  readOnly?: boolean;
}

const COMPLIANCE_STANDARDS = [
    { id: 'SOC2', label: 'SOC2 Type II', icon: '🏢' },
    { id: 'HIPAA', label: 'HIPAA', icon: '🏥' },
    { id: 'GDPR', label: 'GDPR', icon: '🇪🇺' },
    { id: 'PCI-DSS', label: 'PCI DSS', icon: '💳' },
    { id: 'ISO27001', label: 'ISO 27001', icon: '🌐' }
];

const SecurityView: React.FC<SecurityViewProps> = ({ securityContext, onUpdate, onContinue, hideActions, onRefine, isRefining = false, readOnly = false }) => {
  const { state } = useProject();
  const [activeTab, setActiveTab] = useState<'matrix' | 'policies' | 'compliance' | 'headers' | 'traffic'>('matrix');
  const [selectedStandard, setSelectedStandard] = useState(COMPLIANCE_STANDARDS[0].id);
  const [isGeneratingCompliance, setIsGeneratingCompliance] = useState(false);
  
  // Rate Limiting Simulator State
  const [requestRate, setRequestRate] = useState(60); // req/min
  const [burstCapacity, setBurstCapacity] = useState(10);
  const [bucketTokens, setBucketTokens] = useState(10);
  const [simTime, setSimTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  
  const gemini = React.useMemo(() => new GeminiService(), []);

  // Initialize Traffic Sim loop
  useEffect(() => {
      if (activeTab === 'traffic' && !readOnly) {
          const interval = 100; // ms
          let lastTime = Date.now();
          
          const loop = () => {
              const now = Date.now();
              const delta = (now - lastTime) / 1000;
              lastTime = now;
              
              setBucketTokens(prev => {
                  const refillRate = requestRate / 60; // tokens per second
                  const added = refillRate * delta;
                  return Math.min(burstCapacity, prev + added);
              });
              
              setSimTime(t => t + delta);
              animationRef.current = requestAnimationFrame(loop);
          };
          
          animationRef.current = requestAnimationFrame(loop);
          return () => {
              if (animationRef.current) cancelAnimationFrame(animationRef.current);
          };
      }
  }, [activeTab, requestRate, burstCapacity, readOnly]);

  if (!securityContext) return null;

  const handleUpdateRBAC = (matrix: RBACMatrix) => {
      if(onUpdate) onUpdate({ ...securityContext, rbacMatrix: matrix });
  };

  const handleToggleStatus = (id: string) => {
      if (!onUpdate || !securityContext.complianceChecklist || readOnly) return;
      
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
      if(!onUpdate || readOnly) return;
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

  const handleSimulateRequest = () => {
      if (bucketTokens >= 1) {
          setBucketTokens(prev => prev - 1);
      }
  };

  const handleRateConfigChange = (field: keyof RateLimitConfig, value: any) => {
      if(!onUpdate || !securityContext.rateLimitConfig) return;
      onUpdate({
          ...securityContext,
          rateLimitConfig: {
              ...securityContext.rateLimitConfig,
              [field]: value
          }
      });
  };

  const metCount = securityContext.complianceChecklist?.filter(i => i.status === 'Met').length || 0;
  const totalCount = securityContext.complianceChecklist?.length || 0;
  const progress = totalCount > 0 ? (metCount / totalCount) * 100 : 0;

  const rateLimitConfig = securityContext.rateLimitConfig || { strategy: 'token-bucket', limit: 100, windowInSeconds: 60, provider: 'middleware' };
  const headers = securityContext.securityHeaders || [
      { name: 'Content-Security-Policy', value: "default-src 'self'", status: 'warning', description: 'Prevents XSS' },
      { name: 'X-Frame-Options', value: 'DENY', status: 'compliant', description: 'Prevents Clickjacking' },
      { name: 'Strict-Transport-Security', value: 'max-age=31536000', status: 'compliant', description: 'Enforces HTTPS' }
  ];

  return (
    <div className="animate-fade-in flex flex-col h-full overflow-hidden">
      
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Security & QA</h2>
                <p className="text-xs text-glass-text-secondary">Risk assessment and access control.</p>
            </div>
            
            <div className="bg-black/20 p-1 rounded-lg flex border border-white/5 overflow-x-auto max-w-full">
                {[
                    { id: 'matrix', label: 'Access Matrix' },
                    { id: 'policies', label: 'Policies' },
                    { id: 'compliance', label: 'Compliance' },
                    { id: 'headers', label: 'Headers' },
                    { id: 'traffic', label: 'Traffic Sim' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
          </div>

          {onRefine && !hideActions && !readOnly && (
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Add a policy for rate limiting', 'Require HIPAA compliance'" 
                className="mb-2"
            />
          )}
      </div>

      <div className="flex-grow min-h-0 bg-[#0b0e14] rounded-xl border border-white/5 relative overflow-hidden flex flex-col">
        {activeTab === 'matrix' && (
            <div className="h-full flex flex-col overflow-hidden">
                <VisualRBAC matrix={securityContext.rbacMatrix} onUpdate={handleUpdateRBAC} />
                
                <div className="flex-grow overflow-y-auto custom-scrollbar p-6 bg-slate-900/30 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">🧪</span>
                        <h3 className="text-sm font-bold text-brand-accent uppercase tracking-wider">Testing Strategy</h3>
                    </div>
                    <div className="space-y-2">
                        {securityContext.testingStrategy.map((test, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 bg-slate-800/50 p-2.5 rounded hover:bg-slate-700/50 transition-colors border border-white/5">
                            <div>
                                <span className="font-bold text-white text-xs block">{test.name}</span>
                                <span className="text-[10px] text-slate-400">{test.description}</span>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded text-center min-w-[70px] uppercase ${
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
            <div className="h-full overflow-y-auto custom-scrollbar p-6 space-y-4">
                {securityContext.policies.map((policy, idx) => (
                  <div key={idx} className="bg-slate-800/30 p-4 rounded-xl border border-white/5 border-l-4 border-l-brand-secondary">
                    <h4 className="font-bold text-white text-sm uppercase tracking-wide mb-1">{policy.name}</h4>
                    <p className="text-slate-300 text-xs mb-3">{policy.description}</p>
                    <div className="text-[10px] font-mono text-brand-accent bg-black/20 p-2 rounded border border-white/5">
                       Implementation: {policy.implementationHint}
                    </div>
                  </div>
                ))}
            </div>
        )}

        {activeTab === 'compliance' && (
            <div className="h-full flex flex-col p-6 overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-slate-700">
                        <select 
                            value={selectedStandard}
                            onChange={(e) => setSelectedStandard(e.target.value)}
                            disabled={readOnly}
                            className="bg-transparent text-xs font-bold text-white outline-none border-none p-1 cursor-pointer"
                        >
                            {COMPLIANCE_STANDARDS.map(s => (
                                <option key={s.id} value={s.id} className="bg-slate-900">{s.icon} {s.label}</option>
                            ))}
                        </select>
                        <button 
                            onClick={handleGenerateCompliance}
                            disabled={isGeneratingCompliance || readOnly}
                            className="bg-brand-primary hover:bg-brand-secondary text-white text-[10px] px-3 py-1.5 rounded font-bold transition-all disabled:opacity-50"
                        >
                            {isGeneratingCompliance ? 'Scanning...' : 'Audit'}
                        </button>
                    </div>
                    
                    {totalCount > 0 && (
                        <div className="flex flex-col gap-1 w-48">
                            <div className="flex justify-between text-[10px] text-glass-text-secondary uppercase font-bold">
                                <span>Readiness</span>
                                <span className="font-mono">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-yellow-500 to-green-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    {(!securityContext.complianceChecklist || securityContext.complianceChecklist.length === 0) ? (
                        <div className="text-center text-slate-500 py-10 italic text-sm">
                            Run an audit to generate compliance requirements.
                        </div>
                    ) : (
                        securityContext.complianceChecklist.map((item, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => handleToggleStatus(item.id)}
                                className={`p-3 rounded-lg border flex flex-col gap-2 cursor-pointer transition-all ${
                                    item.status === 'Met' ? 'bg-green-900/10 border-green-800/50' : 
                                    item.status === 'N/A' ? 'bg-slate-800/50 border-slate-700/50 opacity-60' : 
                                    'bg-slate-900/50 border-white/5 hover:border-brand-secondary/50'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                            item.status === 'Met' ? 'bg-green-500 border-green-500 text-black' : 'border-slate-500'
                                        }`}>
                                            {item.status === 'Met' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary">{item.standard}</span>
                                    </div>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                        item.status === 'Met' ? 'text-green-400 bg-green-900/30' :
                                        item.status === 'N/A' ? 'text-slate-500 bg-slate-800' :
                                        'text-yellow-500 bg-yellow-900/20'
                                    }`}>
                                        {item.status}
                                    </span>
                                </div>
                                <div className={`text-xs font-semibold ${item.status === 'N/A' ? 'text-slate-500 line-through' : 'text-white'}`}>
                                    {item.requirement}
                                </div>
                                {item.status !== 'N/A' && (
                                    <div className="text-[10px] text-slate-400 bg-black/20 p-2 rounded flex gap-2 items-start border border-white/5">
                                        <span className="text-yellow-500">➜</span> 
                                        <span>{item.action}</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {activeTab === 'headers' && (
            <div className="h-full overflow-y-auto custom-scrollbar p-6">
                <div className="grid grid-cols-1 gap-4">
                    {headers.map((h, i) => (
                        <div key={i} className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex gap-4 items-start">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${
                                h.status === 'compliant' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                h.status === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                                <div className="text-xl font-bold leading-none">
                                    {h.status === 'compliant' ? '✓' : h.status === 'warning' ? '!' : '✕'}
                                </div>
                            </div>
                            <div className="flex-grow">
                                <h4 className="font-bold text-white text-xs">{h.name}</h4>
                                <p className="text-[10px] text-slate-400 mb-2">{h.description}</p>
                                <div className="bg-black/30 p-2 rounded text-[10px] font-mono text-brand-secondary border border-white/5 truncate">
                                    {h.value || 'Not Set'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'traffic' && (
            <div className="h-full p-6 flex flex-col overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                    <div className="space-y-6">
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                            <label className="text-[10px] font-bold text-glass-text-secondary uppercase mb-2 block">Strategy</label>
                            <div className="flex gap-2">
                                {['token-bucket', 'fixed-window', 'leaky-bucket'].map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => handleRateConfigChange('strategy', s)}
                                        disabled={readOnly}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded uppercase transition-all ${rateLimitConfig.strategy === s ? 'bg-brand-secondary text-white shadow' : 'bg-slate-700 text-slate-400'}`}
                                    >
                                        {s.replace('-', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-[10px] text-white font-bold mb-1">
                                    <span>Rate Limit (RPM)</span>
                                    <span>{requestRate}</span>
                                </div>
                                <input 
                                    type="range" min="10" max="600" step="10"
                                    value={requestRate}
                                    onChange={(e) => setRequestRate(Number(e.target.value))}
                                    disabled={readOnly}
                                    className="w-full accent-brand-primary h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] text-white font-bold mb-1">
                                    <span>Burst Capacity</span>
                                    <span>{burstCapacity}</span>
                                </div>
                                <input 
                                    type="range" min="1" max="50" step="1"
                                    value={burstCapacity}
                                    onChange={(e) => setBurstCapacity(Number(e.target.value))}
                                    disabled={readOnly}
                                    className="w-full accent-brand-primary h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-900 p-4 rounded-xl border border-white/5 mt-auto">
                            <button 
                                onClick={handleSimulateRequest}
                                className="w-full py-2 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-lg shadow-lg active:scale-95 transition-all"
                            >
                                Send Request ⚡
                            </button>
                        </div>
                    </div>

                    <div className="bg-black/40 rounded-xl border border-white/5 p-6 flex flex-col items-center justify-end relative overflow-hidden">
                        <div className="relative w-32 h-48 border-b-4 border-l-4 border-r-4 border-slate-500 rounded-b-xl flex flex-col-reverse items-center p-1 gap-1">
                            <div className="absolute -bottom-6 text-[10px] font-mono text-slate-500 uppercase font-bold">Bucket</div>
                            
                            {/* Tokens */}
                            {Array.from({ length: Math.floor(bucketTokens) }).map((_, i) => (
                                <div key={i} className="w-full h-3 bg-green-500 rounded-sm shadow-[0_0_5px_#22c55e] animate-fade-in" style={{ opacity: 0.8 }}></div>
                            ))}
                            
                            {/* Fill Line */}
                            <div 
                                className="absolute bottom-0 left-0 right-0 bg-green-500/20 transition-all duration-300"
                                style={{ height: `${(bucketTokens / burstCapacity) * 100}%` }}
                            ></div>
                        </div>

                        <div className="absolute top-4 text-center">
                            <div className="text-2xl">🚰</div>
                            <div className="text-[10px] text-glass-text-secondary font-mono">
                                +{(requestRate / 60).toFixed(1)}/s
                            </div>
                        </div>

                        {bucketTokens < 1 && (
                            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center animate-pulse backdrop-blur-sm">
                                <div className="bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-2xl border border-red-400">
                                    429 Too Many Requests
                                </div>
                            </div>
                        )}
                    </div>
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
            <span>Next: Blueprint Studio</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
        </div>
      )}
    </div>
  );
};

export default SecurityView;
