
import React from 'react';

interface HeaderProps {
  onReset: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset }) => {
  return (
    <header className="text-center animate-fade-in">
      <div className="flex justify-end mb-2">
        <button 
          onClick={onReset}
          className="px-4 py-2 text-sm bg-slate-700/50 text-slate-300 font-semibold rounded-lg shadow-md hover:bg-slate-600/70 hover:text-white transition-all transform hover:scale-105"
          aria-label="Start a new project"
        >
          New Project
        </button>
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-secondary">
        AI Project Catalyst
      </h1>
      <p className="mt-2 text-lg text-blue-200">
        From Idea to Action Plan, Powered by Gemini
      </p>
    </header>
  );
};

export default Header;
