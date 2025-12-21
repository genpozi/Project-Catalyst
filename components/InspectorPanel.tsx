
import React, { useEffect, useState } from 'react';
import { AppPhase, ArchitectureNode, SchemaTable, FileNode } from '../types';
import { useProject } from '../ProjectContext';

interface InspectorPanelProps {
  currentPhase: AppPhase;
  projectData: any;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ currentPhase, projectData }) => {
    const { state, dispatch } = useProject();
    const [localNode, setLocalNode] = useState<ArchitectureNode | null>(null);
    const [localTable, setLocalTable] = useState<SchemaTable | null>(null);
    const [localFile, setLocalFile] = useState<FileNode | null>(null);

    // Sync local state when selection changes
    useEffect(() => {
        // Architecture Selection
        if (state.ui.selectedNodeId && projectData.architecture?.visualLayout) {
            const node = projectData.architecture.visualLayout.find((n: any) => n.id === state.ui.selectedNodeId);
            setLocalNode(node || null);
        } else {
            setLocalNode(null);
        }

        // Schema Selection (reusing selectedNodeId for table names in ERD)
        if (state.ui.selectedNodeId && projectData.schema?.tables) {
            const table = projectData.schema.tables.find((t: any) => t.name === state.ui.selectedNodeId);
            setLocalTable(table || null);
        } else {
            setLocalTable(null);
        }

        // File Selection (uses selectedFilePath)
        if (state.ui.selectedFilePath && projectData.fileStructure) {
            // Helper to find node
            const findNode = (nodes: any[], path: string[]): any => {
                if(!path.length) return null;
                const [current, ...rest] = path;
                const node = nodes.find(n => n.name === current);
                if(node) {
                    if(rest.length === 0) return node;
                    return findNode(node.children || [], rest);
                }
                return null;
            };
            const node = findNode(projectData.fileStructure, state.ui.selectedFilePath.split('/'));
            setLocalFile(node);
        } else {
            setLocalFile(null);
        }

    }, [state.ui.selectedNodeId, state.ui.selectedFilePath, projectData]);

    const handleNodeUpdate = (field: string, value: any) => {
        if (!localNode) return;
        const updatedNode = { ...localNode, [field]: value };
        setLocalNode(updatedNode);
        const newLayout = projectData.architecture.visualLayout.map((n: any) => 
            n.id === localNode.id ? updatedNode : n
        );
        dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { architecture: { ...projectData.architecture, visualLayout: newLayout } } });
    };

    const renderContent = () => {
        // 1. Architecture Node Inspector
        if (state.ui.selectedNodeId && localNode && currentPhase === AppPhase.ARCHITECTURE) {
            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                        <div className="w-8 h-8 rounded bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold border border-brand-primary/30">
                            {localNode.type.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="text-[10px] uppercase text-glass-text-secondary font-bold">Component</div>
                            <div className="text-sm font-bold text-white">{localNode.label}</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Label</label>
                            <input 
                                value={localNode.label}
                                onChange={(e) => handleNodeUpdate('label', e.target.value)}
                                className="w-full glass-input px-2 py-1.5 rounded text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Type</label>
                            <select 
                                value={localNode.type}
                                onChange={(e) => handleNodeUpdate('type', e.target.value)}
                                className="w-full glass-input px-2 py-1.5 rounded text-xs bg-slate-900"
                            >
                                <option value="frontend">Frontend</option>
                                <option value="backend">Backend</option>
                                <option value="database">Database</option>
                                <option value="cache">Cache</option>
                                <option value="queue">Queue</option>
                                <option value="external">External API</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Linked File</label>
                            <input 
                                value={localNode.linkedPath || ''}
                                onChange={(e) => handleNodeUpdate('linkedPath', e.target.value)}
                                className="w-full glass-input px-2 py-1.5 rounded text-xs font-mono"
                                placeholder="src/components/..."
                            />
                        </div>
                    </div>
                </div>
            );
        }

        // 2. Data Model Table Inspector
        if (state.ui.selectedNodeId && localTable && currentPhase === AppPhase.DATAMODEL) {
            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                        <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">
                            🗄️
                        </div>
                        <div>
                            <div className="text-[10px] uppercase text-glass-text-secondary font-bold">Table</div>
                            <div className="text-sm font-bold text-white">{localTable.name}</div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="bg-black/20 rounded p-3 border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Columns ({localTable.columns.length})</span>
                            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                {localTable.columns.map((col: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs text-slate-300">
                                        <span className="font-mono">{col.name}</span>
                                        <span className="text-yellow-500/80">{col.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // 3. File Inspector
        if (state.ui.selectedFilePath && localFile && (currentPhase === AppPhase.FILE_STRUCTURE || currentPhase === AppPhase.WORKSPACE)) {
            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                        <div className="w-8 h-8 rounded bg-slate-700/50 flex items-center justify-center text-slate-300 font-bold border border-white/10">
                            {localFile.type === 'folder' ? '📂' : '📄'}
                        </div>
                        <div className="flex-grow min-w-0">
                            <div className="text-[10px] uppercase text-glass-text-secondary font-bold">{localFile.type}</div>
                            <div className="text-sm font-bold text-white truncate" title={localFile.name}>{localFile.name}</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Full Path</label>
                            <div className="text-xs font-mono text-slate-300 bg-black/20 p-2 rounded break-all border border-white/5">
                                {state.ui.selectedFilePath}
                            </div>
                        </div>
                        {localFile.type === 'file' && (
                            <div>
                                <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Size</label>
                                <div className="text-xs text-slate-400">
                                    {localFile.content ? `${localFile.content.length} chars` : 'Empty'}
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Description</label>
                            <p className="text-xs text-slate-400 leading-relaxed italic">
                                {localFile.description || "No description provided."}
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        // Default Phase Summaries
        if (currentPhase === AppPhase.ARCHITECTURE) {
            const stack = projectData.architecture?.stack;
            if (!stack) return <div className="text-slate-500 text-xs italic">No stack defined.</div>;
            return (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Frontend</label>
                        <div className="p-3 bg-black/20 rounded border border-white/5 text-xs text-white font-mono">{stack.frontend}</div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Backend</label>
                        <div className="p-3 bg-black/20 rounded border border-white/5 text-xs text-white font-mono">{stack.backend}</div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Design Patterns</label>
                        <div className="flex flex-wrap gap-2">
                            {projectData.architecture.patterns?.map((p: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-brand-primary/10 border border-brand-primary/20 text-[10px] text-brand-primary rounded">{p}</span>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }
        
        if (currentPhase === AppPhase.WORKSPACE) {
            const stats = {
                total: projectData.tasks?.length || 0,
                done: projectData.tasks?.filter((t: any) => t.status === 'Done').length || 0,
                high: projectData.tasks?.filter((t: any) => t.priority === 'High').length || 0
            };
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-black/20 rounded border border-white/5 text-center">
                            <div className="text-xl font-bold text-white">{stats.total}</div>
                            <div className="text-[10px] text-slate-500 uppercase mt-1">Total Tasks</div>
                        </div>
                        <div className="p-3 bg-black/20 rounded border border-white/5 text-center">
                            <div className="text-xl font-bold text-green-400">{Math.round((stats.done/stats.total)*100 || 0)}%</div>
                            <div className="text-[10px] text-slate-500 uppercase mt-1">Completion</div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Priority Breakdown</label>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                            <div className="h-full bg-red-500" style={{ width: `${(stats.high/stats.total)*100}%` }}></div>
                            <div className="h-full bg-slate-600 flex-grow"></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                            <span>High Priority</span>
                            <span>{stats.high}</span>
                        </div>
                    </div>
                </div>
            );
        }

        if (currentPhase === AppPhase.BRAINSTORM) {
             const personas = projectData.brainstormingResults?.personas || [];
             return (
                 <div className="space-y-4">
                     <label className="text-[10px] font-bold text-slate-500 uppercase">Identified Personas</label>
                     {personas.map((p: any, i: number) => (
                         <div key={i} className="bg-white/5 p-3 rounded-lg border border-white/5">
                             <div className="text-xs font-bold text-white mb-1">{p.role}</div>
                             <div className="text-[10px] text-slate-400 line-clamp-2">{p.description}</div>
                         </div>
                     ))}
                 </div>
             );
        }

        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs">
                <svg className="w-8 h-8 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p>Select an item to view properties.</p>
            </div>
        );
    };

    return (
        <div className="h-full bg-ide-panel ide-border-l w-[300px] flex-shrink-0 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/5 text-xs font-bold text-slate-400 uppercase tracking-wider h-12 flex items-center bg-[#151b26]">
                Inspector
            </div>
            <div className="p-4 flex-grow overflow-y-auto custom-scrollbar">
                {renderContent()}
            </div>
        </div>
    );
};
