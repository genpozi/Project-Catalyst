
import React, { useState } from 'react';

interface RefineBarProps {
  onRefine: (prompt: string) => Promise<void>;
  isRefining: boolean;
  placeholder?: string;
  className?: string;
}

const RefineBar: React.FC<RefineBarProps> = ({ onRefine, isRefining, placeholder, className = '' }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isRefining) return;
    await onRefine(prompt);
    setPrompt('');
  };

  return (
    <form onSubmit={handleSubmit} className={`relative group ${className}`}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-secondary to-brand-accent rounded-xl opacity-30 group-hover:opacity-60 transition duration-500 blur"></div>
      <div className="relative flex gap-2 bg-slate-900 rounded-xl p-1 items-center">
        <div className="pl-3 text-glass-text-secondary">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder || "Ask AI to refine this... (e.g. 'Make it mobile-first', 'Switch to Go')"}
            className="flex-grow bg-transparent border-none text-white focus:ring-0 placeholder-glass-text-secondary text-sm py-2"
        />
        <button 
            type="submit" 
            disabled={!prompt.trim() || isRefining}
            className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all border border-white/5"
        >
            {isRefining ? 'Thinking...' : 'Refine'}
        </button>
      </div>
    </form>
  );
};

export default RefineBar;
