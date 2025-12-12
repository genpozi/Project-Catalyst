
import React, { useState } from 'react';

interface AgentRulesViewProps {
  rules?: string;
  onContinue: () => void;
}

const AgentRulesView: React.FC<AgentRulesViewProps> = ({ rules, onContinue }) => {
  const [copied, setCopied] = useState(false);

  if (!rules) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(rules);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([rules], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.cursorrules';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-slide-in-up">
      <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2 text-center">Agent Instructions (.cursorrules)</h2>
      <p className="text-center text-blue-200 mb-8 max-w-3xl mx-auto">
        This is the "Brain" of your project. Feed this file to an AI coding agent (Cursor, Copilot, Windsurf) to ensure it builds exactly what we designed.
      </p>

      <div className="relative group bg-slate-900 rounded-lg border border-slate-700 shadow-2xl overflow-hidden mb-8">
        <div className="flex justify-between items-center bg-slate-800 px-4 py-2 border-b border-slate-700">
            <span className="font-mono text-sm text-brand-accent">.cursorrules</span>
            <div className="flex gap-2">
                <button 
                    onClick={handleCopy}
                    className="px-3 py-1 text-xs bg-slate-700 hover:bg-brand-secondary text-white rounded transition-colors"
                >
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
                <button 
                    onClick={handleDownload}
                    className="px-3 py-1 text-xs bg-brand-primary hover:bg-blue-600 text-white rounded transition-colors flex items-center gap-1"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download
                </button>
            </div>
        </div>
        <pre className="p-6 text-sm font-mono text-slate-300 overflow-x-auto max-h-[600px] custom-scrollbar leading-relaxed whitespace-pre-wrap">
            {rules}
        </pre>
      </div>

      <div className="text-center">
        <button
          onClick={onContinue}
          className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
        >
          Generate Action Plan & Start Building
        </button>
      </div>
    </div>
  );
};

export default AgentRulesView;
