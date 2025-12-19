
import React, { useEffect, useState } from 'react';
import { SchemaData } from '../types';
import RefineBar from './RefineBar';

interface DataModelViewProps {
  data?: SchemaData;
  onContinue: () => void;
  hideActions?: boolean;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
}

const DataModelView: React.FC<DataModelViewProps> = ({ data, onContinue, hideActions, onRefine, isRefining = false }) => {
  const [activeTab, setActiveTab] = useState<'diagram' | 'tables' | 'prisma' | 'sql'>('diagram');

  useEffect(() => {
    if (activeTab === 'diagram' && data?.mermaidChart) {
      // @ts-ignore
      if (window.mermaid) {
        // @ts-ignore
        window.mermaid.initialize({ startOnLoad: true, theme: 'dark' });
        // @ts-ignore
        window.mermaid.run();
      }
    }
  }, [activeTab, data]);

  if (!data) return null;

  const handleOpenMermaidLive = () => {
      const state = {
        code: data.mermaidChart,
        mermaid: { theme: 'dark' },
      };
      const json = JSON.stringify(state);
      const encoded = btoa(json);
      window.open(`https://mermaid.live/edit#base64:${encoded}`, '_blank');
  };

  return (
    <div className="animate-slide-in-up">
      {!hideActions && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2 text-center">Data Model & Schema</h2>
            <p className="text-center text-blue-200 mb-8 max-w-3xl mx-auto">
                The blueprint for your data. Review the relationship diagram and the generated schemas below.
            </p>
          </>
      )}

      {onRefine && !hideActions && (
        <div className="max-w-3xl mx-auto mb-8">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Add a status column to users', 'Change relation to Many-to-Many'" 
            />
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-800 p-1 rounded-lg inline-flex">
          {['diagram', 'tables', 'prisma', 'sql'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-md text-sm font-semibold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-brand-secondary text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'sql' ? 'SQL' : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg ring-1 ring-slate-700 min-h-[400px] p-6 overflow-hidden relative">
        {/* Mermaid Diagram */}
        {activeTab === 'diagram' && (
            <div className="flex justify-center overflow-x-auto relative">
               <div className="mermaid">
                 {data.mermaidChart}
               </div>
               <button 
                 onClick={handleOpenMermaidLive}
                 className="absolute top-0 right-0 bg-slate-700 hover:bg-brand-primary text-white text-xs px-3 py-2 rounded shadow flex items-center gap-2 transition-colors"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                 Edit in Mermaid Live
               </button>
            </div>
        )}

        {/* Table View */}
        {activeTab === 'tables' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.tables.map((table, idx) => (
              <div key={idx} className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
                <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-brand-accent">{table.name}</h3>
                  <span className="text-xs text-slate-400">{table.description}</span>
                </div>
                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-700">
                        <th className="pb-2">Column</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Constraints</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {table.columns.map((col, cIdx) => (
                        <tr key={cIdx} className="border-b border-slate-700/50 last:border-0">
                          <td className="py-2 font-mono text-brand-light">{col.name}</td>
                          <td className="py-2 text-yellow-500/80">{col.type}</td>
                          <td className="py-2 text-slate-400 italic">{col.constraints || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Code Views */}
        {(activeTab === 'prisma' || activeTab === 'sql') && (
          <div className="relative group">
             <button 
                onClick={() => navigator.clipboard.writeText(activeTab === 'prisma' ? data.prismaSchema : data.sqlSchema)}
                className="absolute top-2 right-2 px-3 py-1 text-xs bg-slate-700 hover:bg-brand-secondary text-white rounded transition-colors opacity-0 group-hover:opacity-100"
             >
                Copy
             </button>
             <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto text-sm font-mono text-blue-100 border border-slate-800">
                {activeTab === 'prisma' ? data.prismaSchema : data.sqlSchema}
             </pre>
          </div>
        )}
      </div>

      {!hideActions && (
        <div className="text-center mt-8">
            <button
            onClick={onContinue}
            className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
            >
            Finalize & Generate Plan
            </button>
        </div>
      )}
    </div>
  );
};

export default DataModelView;
