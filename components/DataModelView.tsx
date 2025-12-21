
import React, { useEffect, useState } from 'react';
import { SchemaData } from '../types';
import RefineBar from './RefineBar';
import VisualERD from './VisualERD';

interface DataModelViewProps {
  data?: SchemaData;
  onUpdate?: (data: SchemaData) => void;
  onContinue: () => void;
  hideActions?: boolean;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
  readOnly?: boolean;
}

const DataModelView: React.FC<DataModelViewProps> = ({ data, onUpdate, onContinue, hideActions, onRefine, isRefining = false, readOnly = false }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'diagram' | 'tables' | 'prisma' | 'sql'>('visual');

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

  const handleUpdate = (newData: SchemaData) => {
      if (onUpdate) onUpdate(newData);
  };

  return (
    <div className="animate-fade-in flex flex-col h-full overflow-hidden">
      
      {/* Header Section */}
      <div className="flex-shrink-0 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Data Model</h2>
                <p className="text-xs text-glass-text-secondary">Schema design and relationships.</p>
            </div>
            
            {/* Tabs */}
            <div className="bg-black/20 p-1 rounded-lg flex border border-white/5">
                {[
                    { id: 'visual', label: 'Builder' },
                    { id: 'diagram', label: 'Diagram' },
                    { id: 'tables', label: 'Tables' },
                    { id: 'prisma', label: 'Prisma' },
                    { id: 'sql', label: 'SQL' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all ${activeTab === tab.id ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
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
                placeholder="e.g. 'Add a status column to users', 'Change relation to Many-to-Many'" 
                className="mb-2"
            />
          )}
      </div>

      {/* Main Content */}
      <div className="flex-grow min-h-0 bg-[#0b0e14] rounded-xl border border-white/5 relative overflow-hidden flex flex-col">
        
        {/* Visual Builder */}
        {activeTab === 'visual' && (
            <div className="h-full w-full">
                <VisualERD schema={data} onUpdate={handleUpdate} readOnly={readOnly} />
            </div>
        )}

        {/* Mermaid Diagram */}
        {activeTab === 'diagram' && (
            <div className="h-full w-full relative flex items-center justify-center overflow-auto custom-scrollbar bg-slate-900/20">
               <div className="mermaid">
                 {data.mermaidChart}
               </div>
               <button 
                 onClick={handleOpenMermaidLive}
                 className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold px-3 py-1.5 rounded border border-white/10 flex items-center gap-2 transition-colors shadow-lg"
               >
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                 Edit
               </button>
            </div>
        )}

        {/* Table View */}
        {activeTab === 'tables' && (
          <div className="h-full overflow-y-auto custom-scrollbar p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.tables.map((table, idx) => (
                <div key={idx} className="bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden h-fit">
                    <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm">{table.name}</h3>
                    <span className="text-[10px] text-glass-text-secondary">{table.description}</span>
                    </div>
                    <div className="p-0">
                    <table className="w-full text-[10px] text-left">
                        <thead className="bg-black/20 text-glass-text-secondary uppercase font-bold">
                        <tr>
                            <th className="px-4 py-2">Column</th>
                            <th className="px-4 py-2">Type</th>
                            <th className="px-4 py-2">Constraints</th>
                        </tr>
                        </thead>
                        <tbody className="text-slate-300 divide-y divide-white/5">
                        {table.columns.map((col, cIdx) => (
                            <tr key={cIdx} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-2 font-mono text-blue-200">{col.name}</td>
                            <td className="px-4 py-2 text-yellow-500/80 font-mono">{col.type}</td>
                            <td className="px-4 py-2 text-slate-500 italic">{col.constraints || '-'}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>
                ))}
            </div>
          </div>
        )}

        {/* Code Views */}
        {(activeTab === 'prisma' || activeTab === 'sql') && (
          <div className="h-full flex flex-col relative group">
             <div className="bg-black/20 px-4 py-2 border-b border-white/5 flex justify-between items-center flex-shrink-0">
                <span className="text-xs font-mono text-brand-secondary">{activeTab === 'prisma' ? 'schema.prisma' : 'schema.sql'}</span>
                <button 
                    onClick={() => navigator.clipboard.writeText(activeTab === 'prisma' ? data.prismaSchema : data.sqlSchema)}
                    className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-2 py-1 rounded transition-colors"
                >
                    Copy
                </button>
             </div>
             <pre className="flex-grow p-6 overflow-auto text-xs font-mono text-blue-100 custom-scrollbar leading-relaxed">
                {activeTab === 'prisma' ? data.prismaSchema : data.sqlSchema}
             </pre>
          </div>
        )}
      </div>

      {/* Footer Action */}
      {!hideActions && !readOnly && (
        <div className="flex-shrink-0 pt-4 flex justify-end">
            <button
            onClick={onContinue}
            className="px-6 py-2 bg-white/5 hover:bg-brand-primary text-white text-xs font-bold rounded-lg border border-white/10 transition-all flex items-center gap-2"
            >
            <span>Next: File Structure</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
        </div>
      )}
    </div>
  );
};

export default DataModelView;
