
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
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <input 
        type="text" 
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder || "Ask AI to change something... (e.g. 'Add a dark mode', 'Switch to React')"}
        className="flex-grow bg-slate-900/80 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-secondary placeholder-slate-500 shadow-inner"
      />
      <button 
        type="submit" 
        disabled={!prompt.trim() || isRefining}
        className="bg-brand-secondary hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg whitespace-nowrap"
      >
        {isRefining ? (
             <>
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
               <span>Refining...</span>
             </>
        ) : (
             <>
                <span>✨ Refine</span>
             </>
        )}
      </button>
    </form>
  );
};

export default RefineBar;
