
import React from 'react';

interface ShortcutsModalProps {
  onClose: () => void;
}

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
  const shortcuts = [
    { keys: ['⌘', 'K'], desc: 'Open Command Palette' },
    { keys: ['?'], desc: 'Show Shortcuts' },
    { keys: ['Esc'], desc: 'Close Modal / Dialog' },
    { keys: ['Shift', 'Drag'], desc: 'Connect Nodes (Architecture)' },
    { keys: ['Space'], desc: 'Next Slide (Presentation)' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-[#0f172a] border border-glass-border w-full max-w-lg rounded-2xl shadow-2xl p-8 relative"
        onClick={e => e.stopPropagation()}
      >
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-glass-text-secondary hover:text-white transition-colors"
            aria-label="Close Shortcuts"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="text-3xl">⌨️</span> Keyboard Shortcuts
        </h3>

        <div className="space-y-4">
            {shortcuts.map((s, i) => (
                <div key={i} className="flex justify-between items-center group">
                    <div className="flex gap-1">
                        {s.keys.map((k, ki) => (
                            <kbd key={ki} className="bg-slate-800 border-b-2 border-slate-600 rounded-lg px-2 py-1 text-sm font-mono text-white min-w-[30px] text-center shadow-lg">
                                {k}
                            </kbd>
                        ))}
                    </div>
                    <span className="text-slate-400 text-sm font-medium">{s.desc}</span>
                </div>
            ))}
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-glass-text-secondary">
            Power user? Try voice commands with the Architect Agent.
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
