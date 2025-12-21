
import React, { useState, useMemo } from 'react';
import { useProject } from '../ProjectContext';
import { AppPhase, FileNode } from '../types';

interface SearchPanelProps {
  onNavigate: (phase: AppPhase) => void;
  onClose: () => void;
}

export default function SearchPanel({ onNavigate, onClose }: SearchPanelProps) {
  const { state, dispatch } = useProject();
  const [query, setQuery] = useState('');

  // Helper to flatten file tree
  const flattenFiles = (nodes: FileNode[] = [], parentPath = ''): { name: string; path: string; type: string }[] => {
    let results: { name: string; path: string; type: string }[] = [];
    nodes.forEach(node => {
      const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
      results.push({ name: node.name, path: currentPath, type: node.type });
      if (node.children) {
        results = [...results, ...flattenFiles(node.children, currentPath)];
      }
    });
    return results;
  };

  const results = useMemo(() => {
    if (!query.trim()) return { files: [], tasks: [], docs: [] };
    const lowerQuery = query.toLowerCase();

    const files = flattenFiles(state.projectData.fileStructure)
      .filter(f => f.name.toLowerCase().includes(lowerQuery));

    const tasks = (state.projectData.tasks || [])
      .filter(t => t.content.toLowerCase().includes(lowerQuery));

    const docs = (state.projectData.knowledgeBase || [])
      .filter(d => d.title.toLowerCase().includes(lowerQuery));

    return { files, tasks, docs };
  }, [query, state.projectData]);

  const hasResults = results.files.length > 0 || results.tasks.length > 0 || results.docs.length > 0;

  return (
    <div className="h-full bg-[#0b0e14] border-r border-white/5 flex flex-col w-[260px] flex-shrink-0 animate-fade-in">
      <div className="p-3 border-b border-white/5 bg-[#151b26]">
        <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-glass-text-secondary uppercase tracking-widest">Search</span>
            <span className="text-[10px] bg-white/5 px-1.5 rounded text-glass-text-secondary">{hasResults ? 'Found' : ''}</span>
        </div>
        <div className="relative">
            <input 
                autoFocus
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-[#0b0e14] border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-primary placeholder-white/20"
            />
            {query && (
                <button 
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1.5 text-slate-500 hover:text-white"
                >
                    ✕
                </button>
            )}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
        {!query && (
            <div className="text-center mt-10 text-slate-600 text-xs">
                Type to search across files, tasks, and docs.
            </div>
        )}

        {query && !hasResults && (
            <div className="text-center mt-10 text-slate-500 text-xs">
                No results found.
            </div>
        )}

        {results.files.length > 0 && (
            <div className="mb-4">
                <div className="px-2 py-1 text-[10px] font-bold text-brand-secondary uppercase tracking-wider mb-1">Files</div>
                {results.files.map((file, i) => (
                    <div 
                        key={i}
                        onClick={() => {
                            dispatch({ type: 'SET_SELECTED_FILE', payload: file.path });
                            onNavigate(AppPhase.FILE_STRUCTURE);
                        }}
                        className="px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer flex items-center gap-2 group"
                    >
                        <span className="text-slate-500">{file.type === 'folder' ? '📂' : '📄'}</span>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs text-slate-300 truncate font-mono">{file.name}</span>
                            <span className="text-[9px] text-slate-600 truncate">{file.path}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {results.tasks.length > 0 && (
            <div className="mb-4">
                <div className="px-2 py-1 text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1">Tasks</div>
                {results.tasks.map((task, i) => (
                    <div 
                        key={i}
                        onClick={() => onNavigate(AppPhase.WORKSPACE)}
                        className="px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer flex items-center gap-2"
                    >
                        <span className="text-slate-500">✅</span>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs text-slate-300 truncate">{task.content}</span>
                            <span className="text-[9px] text-slate-600">{task.status}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {results.docs.length > 0 && (
            <div className="mb-4">
                <div className="px-2 py-1 text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">Docs</div>
                {results.docs.map((doc, i) => (
                    <div 
                        key={i}
                        onClick={() => {
                            dispatch({ type: 'SET_SELECTED_DOC', payload: doc.id });
                            onNavigate(AppPhase.KNOWLEDGE_BASE);
                        }}
                        className="px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer flex items-center gap-2"
                    >
                        <span className="text-slate-500">🧠</span>
                        <span className="text-xs text-slate-300 truncate">{doc.title}</span>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
