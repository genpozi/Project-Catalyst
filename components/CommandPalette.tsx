
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppPhase, FileNode, Task, KnowledgeDoc } from '../types';
import { useProject } from '../ProjectContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (phase: AppPhase) => void;
  onReset: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate, onReset }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, dispatch } = useProject();

  // Flatten recursive file structure for search
  const flattenFiles = (nodes?: FileNode[], parentPath = ''): { name: string; path: string; type: string }[] => {
      if (!nodes) return [];
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

  const projectFiles = useMemo(() => flattenFiles(state.projectData.fileStructure), [state.projectData.fileStructure]);
  const projectTasks = state.projectData.tasks || [];
  const projectDocs = state.projectData.knowledgeBase || [];

  // Define commands & search results
  const commands = useMemo(() => {
      const basicCommands = [
        // Navigation
        ...Object.values(AppPhase).map(phase => ({
          id: `nav-${phase}`,
          label: `Go to ${phase}`,
          group: 'Navigation',
          icon: '➔',
          action: () => onNavigate(phase),
          disabled: !state.unlockedPhases.includes(phase)
        })),
        // Actions
        {
          id: 'act-export',
          label: 'Export Project JSON',
          group: 'Actions',
          icon: '⤓',
          action: () => {
            const dataStr = JSON.stringify(state.projectData, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${state.projectData.name.replace(/\s+/g, '-').toLowerCase()}-0relai-blueprint.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          },
          disabled: false
        },
        {
          id: 'act-reset',
          label: 'Reset / New Project',
          group: 'Actions',
          icon: '↻',
          action: onReset,
          disabled: false
        }
      ];

      // Add Search Results if query exists
      if (!query.trim()) return basicCommands;

      const fileResults = projectFiles
        .filter(f => f.name.toLowerCase().includes(query.toLowerCase()) || f.path.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
        .map(f => ({
            id: `file-${f.path}`,
            label: f.name,
            subLabel: f.path,
            group: 'Files',
            icon: f.type === 'folder' ? '📂' : '📄',
            action: () => {
                dispatch({ type: 'SET_SELECTED_FILE', payload: f.path });
                onNavigate(AppPhase.FILE_STRUCTURE);
            },
            disabled: false
        }));

      const taskResults = projectTasks
        .filter(t => t.content.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map(t => ({
            id: `task-${t.id}`,
            label: t.content,
            subLabel: t.status,
            group: 'Tasks',
            icon: '✅',
            action: () => onNavigate(AppPhase.WORKSPACE), // Ideally open specific task, but nav is good start
            disabled: false
        }));

      const docResults = projectDocs
        .filter(d => d.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map(d => ({
            id: `doc-${d.id}`,
            label: d.title,
            subLabel: d.type,
            group: 'Knowledge',
            icon: '🧠',
            action: () => {
                dispatch({ type: 'SET_SELECTED_DOC', payload: d.id });
                onNavigate(AppPhase.KNOWLEDGE_BASE);
            },
            disabled: false
        }));

      return [...basicCommands.filter(c => c.label.toLowerCase().includes(query.toLowerCase())), ...fileResults, ...taskResults, ...docResults];
  }, [query, state.unlockedPhases, onNavigate, onReset, projectFiles, projectTasks, projectDocs, dispatch, state.projectData]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation within the palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % commands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + commands.length) % commands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = commands[selectedIndex];
        if (cmd && !cmd.disabled) {
          cmd.action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, commands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-[#1e293b] border border-glass-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in ring-1 ring-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-glass-border">
          <svg className="w-5 h-5 text-glass-text-secondary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-grow bg-transparent text-white placeholder-glass-text-secondary focus:outline-none text-lg"
            placeholder="Go to, search files, tasks..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
          />
          <div className="text-xs text-glass-text-secondary font-mono bg-white/5 px-2 py-0.5 rounded">Esc</div>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
          {commands.length === 0 ? (
            <div className="p-4 text-center text-glass-text-secondary text-sm">No matching results.</div>
          ) : (
            commands.map((cmd, idx) => (
              <button
                key={cmd.id}
                onClick={() => {
                  if (!cmd.disabled) {
                    cmd.action();
                    onClose();
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                  idx === selectedIndex ? 'bg-brand-primary text-white' : 'text-slate-300 hover:bg-white/5'
                } ${cmd.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className={`w-5 text-center ${idx === selectedIndex ? 'text-white' : 'text-glass-text-secondary'}`}>{cmd.icon}</span>
                  <div className="flex flex-col overflow-hidden">
                      <span className={`${idx === selectedIndex ? 'font-medium' : ''} truncate`}>{cmd.label}</span>
                      {/* @ts-ignore */}
                      {cmd.subLabel && (
                          // @ts-ignore
                          <span className={`text-[10px] truncate ${idx === selectedIndex ? 'text-white/80' : 'text-slate-500'}`}>{cmd.subLabel}</span>
                      )}
                  </div>
                </div>
                {cmd.group && (
                  <span className={`text-[10px] uppercase tracking-wider flex-shrink-0 ml-2 ${idx === selectedIndex ? 'text-white/70' : 'text-glass-text-secondary'}`}>
                    {cmd.group}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
        
        <div className="px-4 py-2 bg-black/20 border-t border-glass-border flex justify-between items-center text-[10px] text-glass-text-secondary">
          <div className="flex gap-3">
             <span>Navigation</span>
             <span>Files</span>
             <span>Tasks</span>
          </div>
          <div className="flex gap-2">
             <span>Select ↵</span>
             <span>Move ↑↓</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
