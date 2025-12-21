
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
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors[method.toUpperCase()] || 'bg-slate-700 text-slate-300'}`}>
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
    <div className="animate-fade-in flex flex-col h-full overflow-hidden">
      
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-xl font-bold text-white tracking-tight">API Specification</h2>
                <p className="text-xs text-glass-text-secondary">Endpoints, methods, and data contracts.</p>
            </div>
            
            <div className="bg-black/20 p-1 rounded-lg flex border border-white/5">
                <button 
                    onClick={() => setActiveTab('visual')}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${activeTab === 'visual' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                    ✨ Workbench
                </button>
                <button 
                    onClick={() => setActiveTab('docs')}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${activeTab === 'docs' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                    Documentation
                </button>
                <button 
                    onClick={() => setActiveTab('openapi')}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${activeTab === 'openapi' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                    OpenAPI
                </button>
            </div>
          </div>

          {onRefine && !hideActions && !readOnly && (
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Add a search endpoint', 'Switch to OAuth2'" 
                className="mb-2"
            />
          )}
      </div>

      {/* Main Content */}
      <div className="flex-grow min-h-0 bg-[#0b0e14] rounded-xl border border-white/5 relative overflow-hidden flex flex-col">
        {activeTab === 'visual' && (
            <div className="h-full">
                <VisualApiDesigner apiSpec={apiSpec} onUpdate={handleUpdate} />
            </div>
        )}

        {activeTab === 'docs' && (
            <div className="h-full overflow-y-auto custom-scrollbar p-6">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-brand-accent/20 mb-6 flex justify-between items-center">
                    <div>
                        <span className="text-xs font-bold text-brand-accent uppercase tracking-wider block mb-1">Authentication Strategy</span>
                        <span className="text-sm font-mono text-white">{apiSpec.authMechanism}</span>
                    </div>
                    <div className="text-3xl opacity-20">🔐</div>
                </div>

                <div className="space-y-4">
                    {apiSpec.endpoints.map((endpoint, idx) => (
                    <div key={idx} className="bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden">
                        <div 
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors gap-3"
                            onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <MethodBadge method={endpoint.method} />
                                <code className="text-xs font-mono text-white truncate">{endpoint.path}</code>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span className="truncate">{endpoint.summary}</span>
                                <svg 
                                    className={`w-4 h-4 transition-transform ${expandedIndex === idx ? 'rotate-180' : ''}`} 
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                        
                        {expandedIndex === idx && (
                            <div className="p-4 bg-[#080a0f] border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Request Body</h4>
                                    {endpoint.requestBody ? (
                                        <pre className="text-[10px] text-blue-200 font-mono bg-[#111] p-3 rounded border border-white/5 overflow-x-auto custom-scrollbar">
                                            {endpoint.requestBody}
                                        </pre>
                                    ) : (
                                        <span className="text-[10px] text-slate-600 italic">No request body</span>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Success Response</h4>
                                    {endpoint.responseSuccess ? (
                                        <pre className="text-[10px] text-green-200 font-mono bg-[#111] p-3 rounded border border-white/5 overflow-x-auto custom-scrollbar">
                                            {endpoint.responseSuccess}
                                        </pre>
                                    ) : (
                                        <span className="text-[10px] text-slate-600 italic">No response body</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'openapi' && (
            <div className="h-full flex flex-col">
                <div className="bg-slate-900 px-4 py-2 border-b border-white/5 flex justify-between items-center flex-shrink-0">
                    <span className="text-xs font-mono text-brand-accent">openapi.json</span>
                    <button 
                        onClick={() => navigator.clipboard.writeText(openApiYaml)}
                        className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-2 py-1 rounded transition-all"
                    >
                        Copy JSON
                    </button>
                </div>
                <div className="flex-grow relative overflow-hidden">
                    <CodeEditor value={openApiYaml} language="json" readOnly={true} />
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
            <span>Next: Security</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
        </div>
      )}
    </div>
  );
};

export default ApiSpecView;
