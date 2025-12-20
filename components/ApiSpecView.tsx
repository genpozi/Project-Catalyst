
import React, { useState } from 'react';
import { ApiSpecification } from '../types';
import RefineBar from './RefineBar';
import VisualApiDesigner from './VisualApiDesigner';
import { generateOpenApiSpec } from '../utils/codeGenerators';
import CodeEditor from './CodeEditor';
import { useProject } from '../ProjectContext';

interface ApiSpecViewProps {
  apiSpec?: ApiSpecification;
  onUpdate?: (spec: ApiSpecification) => void;
  onContinue: () => void;
  hideActions?: boolean;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
  readOnly?: boolean;
}

const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const colors: Record<string, string> = {
    GET: 'bg-blue-900/50 text-blue-300 border-blue-700',
    POST: 'bg-green-900/50 text-green-300 border-green-700',
    PUT: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
    DELETE: 'bg-red-900/50 text-red-300 border-red-700',
    PATCH: 'bg-purple-900/50 text-purple-300 border-purple-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${colors[method.toUpperCase()] || 'bg-slate-700 text-slate-300'}`}>
      {method.toUpperCase()}
    </span>
  );
};

const ApiSpecView: React.FC<ApiSpecViewProps> = ({ apiSpec, onUpdate, onContinue, hideActions, onRefine, isRefining = false, readOnly = false }) => {
  const { state } = useProject();
  const [activeTab, setActiveTab] = useState<'visual' | 'docs' | 'openapi'>('visual');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!apiSpec) return null;

  const handleUpdate = (updatedSpec: ApiSpecification) => {
      if(onUpdate) onUpdate(updatedSpec);
  };

  const openApiYaml = generateOpenApiSpec(apiSpec, state.projectData.name);

  return (
    <div className="animate-slide-in-up">
      {!hideActions && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2 text-center">API Surface Specification</h2>
            <p className="text-center text-blue-200 mb-8 max-w-3xl mx-auto">
                The contract between your client and server. These definitions guide backend implementation.
            </p>
          </>
      )}

      {onRefine && !hideActions && !readOnly && (
        <div className="max-w-3xl mx-auto mb-8">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Add a search endpoint', 'Switch to OAuth2'" 
            />
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-800 p-1 rounded-lg inline-flex">
            <button 
                onClick={() => setActiveTab('visual')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'visual' ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
            >
                ✨ Workbench
            </button>
            <button 
                onClick={() => setActiveTab('docs')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'docs' ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
            >
                Documentation
            </button>
            <button 
                onClick={() => setActiveTab('openapi')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'openapi' ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
            >
                OpenAPI (JSON)
            </button>
        </div>
      </div>

      {activeTab === 'visual' && (
          <div className="mb-8">
              <VisualApiDesigner apiSpec={apiSpec} onUpdate={handleUpdate} />
              <p className="text-center text-[10px] text-glass-text-secondary mt-2 opacity-70">
                  API Workbench: Define routes manually or use the Refine bar to generate them via AI.
              </p>
          </div>
      )}

      {activeTab === 'docs' && (
        <div className="space-y-4 mb-8">
            <div className="bg-slate-800/80 p-4 rounded-lg border border-brand-accent/20 mb-8 text-center sm:text-left">
                <span className="text-sm font-bold text-brand-accent uppercase tracking-wider mr-2">Authentication Strategy:</span>
                <span className="text-blue-100">{apiSpec.authMechanism}</span>
            </div>

            {apiSpec.endpoints.map((endpoint, idx) => (
            <div key={idx} className="bg-slate-800/50 rounded-lg ring-1 ring-slate-700 overflow-hidden">
                <div 
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors gap-3"
                    onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <MethodBadge method={endpoint.method} />
                        <code className="text-sm font-mono text-white truncate">{endpoint.path}</code>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span className="truncate">{endpoint.summary}</span>
                        <svg 
                            className={`w-5 h-5 transition-transform ${expandedIndex === idx ? 'rotate-180' : ''}`} 
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
                
                {expandedIndex === idx && (
                    <div className="p-4 bg-slate-900/50 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Request Body (JSON)</h4>
                            {endpoint.requestBody ? (
                                <pre className="text-xs text-blue-200 font-mono bg-slate-950 p-3 rounded border border-slate-800 overflow-x-auto">
                                    {endpoint.requestBody}
                                </pre>
                            ) : (
                                <span className="text-xs text-slate-600 italic">No request body</span>
                            )}
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Success Response (200 OK)</h4>
                            {endpoint.responseSuccess ? (
                                <pre className="text-xs text-green-200 font-mono bg-slate-950 p-3 rounded border border-slate-800 overflow-x-auto">
                                    {endpoint.responseSuccess}
                                </pre>
                            ) : (
                                <span className="text-xs text-slate-600 italic">No response body</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
            ))}
        </div>
      )}

      {activeTab === 'openapi' && (
          <div className="h-[600px] mb-8 bg-[#0b0e14] rounded-2xl border border-white/10 overflow-hidden flex flex-col">
              <div className="bg-slate-900 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                  <span className="text-xs font-mono text-brand-accent">openapi.json</span>
                  <button 
                      onClick={() => navigator.clipboard.writeText(openApiYaml)}
                      className="text-xs bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded transition-all"
                  >
                      Copy JSON
                  </button>
              </div>
              <div className="flex-grow relative">
                  <CodeEditor value={openApiYaml} language="json" readOnly={true} />
              </div>
          </div>
      )}

      {!hideActions && !readOnly && (
        <div className="text-center">
            <button
            onClick={onContinue}
            className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
            >
            Confirm Specs & Generate Plan
            </button>
        </div>
      )}
    </div>
  );
};

export default ApiSpecView;
