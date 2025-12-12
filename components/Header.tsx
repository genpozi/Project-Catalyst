
import React from 'react';

interface HeaderProps {
  onReset: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset }) => {
  return (
    <header className="flex justify-between items-center mb-2 animate-fade-in px-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-accent rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <div>
            <h1 className="text-2xl font-bold text-white tracking-tight leading-none font-slashed-zero">
                0relai
            </h1>
            <span className="text-xs font-medium text-brand-secondary tracking-widest uppercase opacity-80">Architectural Engine</span>
        </div>
      </div>

      <button 
        onClick={onReset}
        className="px-4 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 text-glass-text rounded-full border border-white/10 transition-all"
        aria-label="Start a new project"
      >
        + New Project
      </button>
    </header>
  );
};

export default Header;
