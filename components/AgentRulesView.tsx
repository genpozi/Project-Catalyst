
import React, { useState, useEffect } from 'react';
import { AgentRuleConfig } from '../types';
import { useProject } from '../ProjectContext';
import { GeminiService } from '../GeminiService';
import { useToast } from './Toast';

interface AgentRulesViewProps {
  rules?: string;
  onContinue: () => void;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
}

const AgentRulesView: React.FC<AgentRulesViewProps> = ({ rules, onContinue, onRefine, isRefining = false }) => {
  const { state, dispatch } = useProject();
  const { addToast } = useToast();
  const gemini = React.useMemo(() => new GeminiService(), []);
  
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Default config derived from architecture if possible, or generic defaults
  const stack = state.projectData.architecture?.stack;
  const initialConfig: AgentRuleConfig = state.projectData.agentRuleConfig || {
      tone: 'Concise',
      language: stack?.backend.includes('Python') ? 'Python' : 'TypeScript',
      documentationStyle: 'JSDoc',
      errorHandling: 'TryCatch',
      testingFramework: 'Jest',
      preferredPatterns: []
  };

  const [config, setConfig] = useState<AgentRuleConfig>(initialConfig);
  const [customPattern, setCustomPattern] = useState('');

  // Auto-save config when it changes
  useEffect(() => {
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { agentRuleConfig: config } });
  }, [config, dispatch]);

  const handleCopy = () => {
    if (!rules) return;
    navigator.clipboard.writeText(rules);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!rules) return;
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

  const handleRegenerate = async () => {
      setIsGenerating(true);
      try {
          const newRules = await gemini.generateAgentRules(state.projectData, config);
          dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { agentRules: newRules } });
          addToast("Rules regenerated based on configuration.", "success");
      } catch (e) {
          console.error(e);
          addToast("Failed to regenerate rules.", "error");
      } finally {
          setIsGenerating(false);
      }
  };

  const addPattern = () => {
      if (customPattern && !config.preferredPatterns.includes(customPattern)) {
          setConfig({ ...config, preferredPatterns: [...config.preferredPatterns, customPattern] });
          setCustomPattern('');
      }
  };

  const removePattern = (idx: number) => {
      const newPatterns = [...config.preferredPatterns];
      newPatterns.splice(idx, 1);
      setConfig({ ...config, preferredPatterns: newPatterns });
  };

  return (
    <div className="animate-slide-in-up h-full flex flex-col">
      <div className="mb-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2">Agent Protocol Engine</h2>
        <p className="text-blue-200 max-w-2xl mx-auto">
            Configure the "Brain" of your AI coding assistant (Cursor, Windsurf, Copilot). 
            Define strict behavioral rules to ensure code consistency.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-grow min-h-[500px]">
          
          {/* Left: Configurator */}
          <div className="w-full lg:w-1/3 bg-slate-900/50 rounded-xl border border-white/5 p-6 flex flex-col">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                  <span>⚙️</span> Rule Configuration
              </h3>
              
              <div className="space-y-6 flex-grow overflow-y-auto custom-scrollbar pr-2">
                  <div>
                      <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-2">Agent Tone</label>
                      <div className="grid grid-cols-3 gap-2">
                          {['Concise', 'Detailed', 'Educational'].map(t => (
                              <button
                                key={t}
                                onClick={() => setConfig({ ...config, tone: t as any })}
                                className={`py-2 rounded-lg text-xs font-bold transition-all border ${config.tone === t ? 'bg-brand-primary text-white border-brand-primary' : 'bg-slate-800 text-slate-400 border-transparent hover:border-slate-600'}`}
                              >
                                  {t}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div>
                      <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-2">Documentation Style</label>
                      <select 
                        value={config.documentationStyle}
                        onChange={(e) => setConfig({ ...config, documentationStyle: e.target.value as any })}
                        className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 focus:border-brand-primary outline-none"
                      >
                          <option value="JSDoc">Standard (JSDoc/Docstring)</option>
                          <option value="Inline">Inline Comments Only</option>
                          <option value="Minimal">Minimal / Self-Documenting</option>
                      </select>
                  </div>

                  <div>
                      <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-2">Error Handling</label>
                      <div className="flex gap-2">
                          {['TryCatch', 'ResultType'].map(eh => (
                              <button
                                key={eh}
                                onClick={() => setConfig({ ...config, errorHandling: eh as any })}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${config.errorHandling === eh ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-800 text-slate-400 border-transparent hover:border-slate-600'}`}
                              >
                                  {eh === 'TryCatch' ? 'Try/Catch' : 'Result<T,E>'}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div>
                      <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-2">Testing Framework</label>
                      <input 
                        value={config.testingFramework}
                        onChange={(e) => setConfig({ ...config, testingFramework: e.target.value })}
                        className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 focus:border-brand-primary outline-none"
                        placeholder="e.g. Vitest"
                      />
                  </div>

                  <div>
                      <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-2">Enforced Patterns</label>
                      <div className="flex gap-2 mb-2">
                          <input 
                            value={customPattern}
                            onChange={(e) => setCustomPattern(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addPattern()}
                            className="flex-grow bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 focus:border-brand-primary outline-none"
                            placeholder="e.g. 'Use Zod for validation'"
                          />
                          <button onClick={addPattern} className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded-lg text-xs font-bold">+</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                          {config.preferredPatterns.map((p, i) => (
                              <span key={i} className="flex items-center gap-1 bg-brand-secondary/20 text-brand-secondary px-2 py-1 rounded text-[10px] border border-brand-secondary/30">
                                  {p}
                                  <button onClick={() => removePattern(i)} className="hover:text-white">×</button>
                              </span>
                          ))}
                      </div>
                  </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/5">
                  <button 
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="w-full py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                      {isGenerating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                            <span>Synthesizing Rules...</span>
                          </>
                      ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            <span>Regenerate Rules</span>
                          </>
                      )}
                  </button>
              </div>
          </div>

          {/* Right: Preview */}
          <div className="w-full lg:w-2/3 flex flex-col bg-[#0b0e14] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
              <div className="bg-slate-900 px-4 py-3 border-b border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-brand-accent">.cursorrules</span>
                      {isGenerating && <span className="text-[10px] text-glass-text-secondary animate-pulse">Updating...</span>}
                  </div>
                  <div className="flex gap-2">
                      <button 
                          onClick={handleCopy}
                          className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-white/5"
                      >
                          {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <button 
                          onClick={handleDownload}
                          className="px-3 py-1.5 text-xs bg-brand-secondary/20 hover:bg-brand-secondary/40 text-brand-secondary border border-brand-secondary/50 rounded-lg transition-colors flex items-center gap-1"
                      >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                          Download
                      </button>
                  </div>
              </div>
              
              <div className="flex-grow relative">
                  <pre className="absolute inset-0 p-6 text-sm font-mono text-slate-300 overflow-auto custom-scrollbar leading-relaxed whitespace-pre-wrap">
                      {rules || "// Configure settings on the left and click Regenerate to create your agent rules."}
                  </pre>
              </div>
          </div>
      </div>

      <div className="text-center mt-8">
        <button
          onClick={onContinue}
          className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
        >
          Finalize Plan & Tasks
        </button>
      </div>
    </div>
  );
};

export default AgentRulesView;
