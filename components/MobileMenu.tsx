
import React from 'react';
import { AppPhase } from '../types';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhase: AppPhase;
  onNavigate: (phase: AppPhase) => void;
  unlockedPhases: AppPhase[];
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, currentPhase, onNavigate, unlockedPhases }) => {
  if (!isOpen) return null;

  const phases = Object.values(AppPhase);

  const handleNavigate = (phase: AppPhase) => {
    onNavigate(phase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] sm:hidden flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Menu Content */}
      <div className="relative w-64 bg-[#0f172a] border-r border-glass-border h-full flex flex-col animate-slide-in-up">
        <div className="p-4 border-b border-glass-border flex justify-between items-center bg-slate-900/50">
            <h3 className="font-bold text-white text-lg">Menu</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1">
            {phases.map((phase) => {
                const isUnlocked = unlockedPhases.includes(phase);
                const isActive = currentPhase === phase;

                return (
                    <button
                        key={phase}
                        onClick={() => isUnlocked && handleNavigate(phase)}
                        disabled={!isUnlocked}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${
                            isActive 
                            ? 'bg-brand-primary text-white' 
                            : isUnlocked 
                                ? 'text-slate-300 hover:bg-white/5' 
                                : 'text-slate-600 cursor-not-allowed'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : isUnlocked ? 'bg-slate-500' : 'bg-slate-800'}`}></span>
                        {phase}
                    </button>
                );
            })}
        </div>

        <div className="p-4 border-t border-glass-border bg-slate-900/50">
            <div className="text-xs text-center text-slate-500">
                0relai Mobile
            </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
