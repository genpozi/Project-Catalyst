
import React from 'react';
import { SecurityContext } from '../types';
import RefineBar from './RefineBar';

interface SecurityViewProps {
  securityContext?: SecurityContext;
  onContinue: () => void;
  hideActions?: boolean;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
}

const SecurityView: React.FC<SecurityViewProps> = ({ securityContext, onContinue, hideActions, onRefine, isRefining = false }) => {
  if (!securityContext) return null;

  return (
    <div className="animate-slide-in-up">
      {!hideActions && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2 text-center">Security & Quality Assurance</h2>
            <p className="text-center text-blue-200 mb-8 max-w-3xl mx-auto">
                Ensuring your application is secure, compliant, and rigorously tested before a single line of code is written.
            </p>
          </>
      )}

      {onRefine && !hideActions && (
        <div className="max-w-3xl mx-auto mb-8">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Add a policy for rate limiting', 'Require HIPAA compliance'" 
            />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Security Policies */}
        <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
            <span className="text-2xl">🛡️</span>
            <h3 className="text-xl font-bold text-brand-accent">Access Control Policies</h3>
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

        {/* Testing & Compliance */}
        <div className="space-y-8">
            
            {/* Testing Strategy */}
            <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700">
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

            {/* Compliance */}
            <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                    <span className="text-2xl">⚖️</span>
                    <h3 className="text-xl font-bold text-brand-accent">Compliance & Validation</h3>
                </div>
                <ul className="space-y-2">
                    {securityContext.compliance.map((rule, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                            <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>
                                <strong className="text-white">{rule.standard}:</strong> {rule.requirement}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
      </div>

      {!hideActions && (
        <div className="text-center">
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
