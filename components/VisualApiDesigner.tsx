
import React, { useState } from 'react';
import { ApiSpecification, ApiEndpoint } from '../types';

interface VisualApiDesignerProps {
  apiSpec: ApiSpecification;
  onUpdate: (data: ApiSpecification) => void;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

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

const VisualApiDesigner: React.FC<VisualApiDesignerProps> = ({ apiSpec, onUpdate }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedEndpoint = apiSpec.endpoints[selectedIndex];

  const handleAddEndpoint = () => {
    const newEndpoint: ApiEndpoint = {
      method: 'GET',
      path: '/new-resource',
      summary: 'Fetch resources',
      requestBody: '{}',
      responseSuccess: '{}'
    };
    onUpdate({
      ...apiSpec,
      endpoints: [...apiSpec.endpoints, newEndpoint]
    });
    setSelectedIndex(apiSpec.endpoints.length); // Select new item
  };

  const handleDeleteEndpoint = (index: number) => {
    if (confirm('Delete this endpoint?')) {
      const newEndpoints = [...apiSpec.endpoints];
      newEndpoints.splice(index, 1);
      onUpdate({ ...apiSpec, endpoints: newEndpoints });
      setSelectedIndex(Math.max(0, index - 1));
    }
  };

  const handleUpdateEndpoint = (field: keyof ApiEndpoint, value: string) => {
    const newEndpoints = [...apiSpec.endpoints];
    newEndpoints[selectedIndex] = { ...newEndpoints[selectedIndex], [field]: value };
    onUpdate({ ...apiSpec, endpoints: newEndpoints });
  };

  const handleUpdateAuth = (value: string) => {
      onUpdate({ ...apiSpec, authMechanism: value });
  };

  const filteredEndpoints = apiSpec.endpoints.map((e, i) => ({ ...e, originalIndex: i }))
    .filter(e => e.path.toLowerCase().includes(searchTerm.toLowerCase()) || e.summary.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col md:flex-row h-[600px] bg-[#0b0e14] rounded-xl border border-white/5 overflow-hidden">
      
      {/* Sidebar: Route List */}
      <div className="w-full md:w-1/3 bg-slate-900/50 border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5 space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider">Endpoints ({apiSpec.endpoints.length})</span>
                <button 
                    onClick={handleAddEndpoint}
                    className="text-xs bg-brand-primary hover:bg-brand-secondary text-white px-2 py-1 rounded transition-colors"
                >
                    + New
                </button>
            </div>
            <input 
                type="text" 
                placeholder="Filter routes..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0f172a] border border-glass-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-primary transition-all"
            />
        </div>
        
        <div className="flex-grow overflow-y-auto custom-scrollbar">
            {filteredEndpoints.map((endpoint, idx) => (
                <div 
                    key={idx}
                    onClick={() => setSelectedIndex(endpoint.originalIndex)}
                    className={`p-3 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 flex flex-col gap-1 ${selectedIndex === endpoint.originalIndex ? 'bg-brand-primary/10 border-l-2 border-l-brand-primary' : 'border-l-2 border-l-transparent'}`}
                >
                    <div className="flex items-center justify-between">
                        <MethodBadge method={endpoint.method} />
                        <span className="text-[10px] text-glass-text-secondary">{endpoint.summary}</span>
                    </div>
                    <div className={`text-xs font-mono truncate ${selectedIndex === endpoint.originalIndex ? 'text-white' : 'text-slate-400'}`}>
                        {endpoint.path}
                    </div>
                </div>
            ))}
            {filteredEndpoints.length === 0 && (
                <div className="p-4 text-center text-xs text-glass-text-secondary italic">
                    No matching routes found.
                </div>
            )}
        </div>
        
        <div className="p-4 border-t border-white/5 bg-black/20">
            <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Global Auth</label>
            <input 
                value={apiSpec.authMechanism}
                onChange={(e) => handleUpdateAuth(e.target.value)}
                className="w-full bg-transparent border-b border-slate-700 focus:border-brand-primary outline-none text-xs text-brand-accent font-mono py-1"
                placeholder="e.g. Bearer JWT"
            />
        </div>
      </div>

      {/* Main: Editor */}
      <div className="w-full md:w-2/3 bg-[#0b0e14] flex flex-col">
        {selectedEndpoint ? (
            <>
                {/* Editor Header */}
                <div className="p-6 border-b border-white/5 flex flex-col gap-4">
                    <div className="flex gap-4 items-start">
                        <div className="w-24 flex-shrink-0">
                            <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Method</label>
                            <select 
                                value={selectedEndpoint.method}
                                onChange={(e) => handleUpdateEndpoint('method', e.target.value)}
                                className="w-full bg-slate-800 text-white text-xs rounded border border-slate-700 px-2 py-1.5 focus:border-brand-primary outline-none"
                            >
                                {METHODS.map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="flex-grow">
                            <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Path</label>
                            <input 
                                value={selectedEndpoint.path}
                                onChange={(e) => handleUpdateEndpoint('path', e.target.value)}
                                className="w-full bg-slate-800 text-white text-sm font-mono rounded border border-slate-700 px-3 py-1.5 focus:border-brand-primary outline-none"
                            />
                        </div>
                        <button 
                            onClick={() => handleDeleteEndpoint(selectedIndex)}
                            className="mt-5 text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete Endpoint"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Summary / Description</label>
                        <input 
                            value={selectedEndpoint.summary}
                            onChange={(e) => handleUpdateEndpoint('summary', e.target.value)}
                            className="w-full bg-transparent border-b border-slate-700 focus:border-brand-primary outline-none text-sm text-slate-300 py-1"
                            placeholder="Describe what this endpoint does..."
                        />
                    </div>
                </div>

                {/* JSON Editors */}
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5 overflow-hidden">
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="px-4 py-2 bg-slate-900/30 border-b border-white/5 text-[10px] font-bold text-glass-text-secondary uppercase flex justify-between">
                            <span>Request Body</span>
                            <span className="text-slate-500">JSON</span>
                        </div>
                        <textarea 
                            value={selectedEndpoint.requestBody || ''}
                            onChange={(e) => handleUpdateEndpoint('requestBody', e.target.value)}
                            className="flex-grow w-full bg-[#0b0e14] text-blue-100 font-mono text-xs p-4 resize-none focus:outline-none"
                            placeholder="{}"
                            spellCheck={false}
                        />
                    </div>
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="px-4 py-2 bg-slate-900/30 border-b border-white/5 text-[10px] font-bold text-glass-text-secondary uppercase flex justify-between">
                            <span>Response (200 OK)</span>
                            <span className="text-slate-500">JSON</span>
                        </div>
                        <textarea 
                            value={selectedEndpoint.responseSuccess || ''}
                            onChange={(e) => handleUpdateEndpoint('responseSuccess', e.target.value)}
                            className="flex-grow w-full bg-[#0b0e14] text-green-100 font-mono text-xs p-4 resize-none focus:outline-none"
                            placeholder="{}"
                            spellCheck={false}
                        />
                    </div>
                </div>
            </>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <div className="text-4xl mb-4">🔌</div>
                <p>Select an endpoint to edit or create a new one.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default VisualApiDesigner;
