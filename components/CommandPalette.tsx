
import React, { useState, useEffect, useRef } from 'react';
import { AppPhase } from '../types';
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
  const { state } = useProject();

  // Define commands
  const commands = [
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

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

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
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
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
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-[#1e293b] border border-glass-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in ring-1 ring-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-glass-border">
          <svg className="w-5 h-5 text-glass-text-secondary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-grow bg-transparent text-white placeholder-glass-text-secondary focus:outline-none text-lg"
            placeholder="Type a command..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
          />
          <div className="text-xs text-glass-text-secondary font-mono bg-white/5 px-2 py-0.5 rounded">Esc</div>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-glass-text-secondary text-sm">No commands found.</div>
          ) : (
            filteredCommands.map((cmd, idx) => (
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
                <div className="flex items-center gap-3">
                  <span className={`w-5 text-center ${idx === selectedIndex ? 'text-white' : 'text-glass-text-secondary'}`}>{cmd.icon}</span>
                  <span className={idx === selectedIndex ? 'font-medium' : ''}>{cmd.label}</span>
                </div>
                {cmd.group && (
                  <span className={`text-[10px] uppercase tracking-wider ${idx === selectedIndex ? 'text-white/70' : 'text-glass-text-secondary'}`}>
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
             <span>Actions</span>
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
