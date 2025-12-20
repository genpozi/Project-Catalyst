
import React from 'react';
import { ResearchReportData } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import RefineBar from './RefineBar';

interface ResearchReportProps {
  report?: ResearchReportData;
  onContinue: () => void;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
}

const ResearchReport: React.FC<ResearchReportProps> = ({ report, onContinue, onRefine, isRefining = false }) => {
  if (!report) return null;

  return (
    <div className="animate-slide-in-up">
      <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-6 text-center">Feasibility & Market Research</h2>
      
      {onRefine && (
        <div className="max-w-3xl mx-auto mb-8">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Focus more on mobile competitors', 'Find open source alternatives'" 
            />
        </div>
      )}

      {/* Summary */}
      <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700 mb-8">
        <h3 className="text-xl font-semibold text-brand-accent mb-4 flex items-center gap-2">
            <span>📊</span> Technical Feasibility Analysis
        </h3>
        <MarkdownRenderer content={report.summary} />
      </div>

      {/* Competitors */}
      {report.competitors && report.competitors.length > 0 && (
          <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <span>⚔️</span> Competitive Landscape
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {report.competitors.map((comp, idx) => (
                      <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 hover:border-brand-primary/50 transition-colors flex flex-col">
                          <div className="flex justify-between items-start mb-3">
                              <h4 className="font-bold text-lg text-white">{comp.name}</h4>
                              <span className="text-[10px] uppercase font-bold bg-slate-800 text-glass-text-secondary px-2 py-1 rounded border border-slate-700">
                                  {comp.priceModel}
                              </span>
                          </div>
                          {comp.url && (
                              <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mb-4 truncate block">
                                  {comp.url}
                              </a>
                          )}
                          
                          <div className="space-y-4 flex-grow">
                              <div>
                                  <span className="text-xs font-bold text-green-400 uppercase tracking-wider block mb-1">Strengths</span>
                                  <ul className="space-y-1">
                                      {comp.strengths.map((s, i) => (
                                          <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                                              <span className="text-green-500 mt-0.5">+</span> {s}
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                              <div>
                                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1">Weaknesses</span>
                                  <ul className="space-y-1">
                                      {comp.weaknesses.map((w, i) => (
                                          <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                                              <span className="text-red-500 mt-0.5">-</span> {w}
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
      
      {/* Sources */}
      {report.sources.length > 0 && (
        <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700">
          <h3 className="text-xl font-semibold text-brand-accent mb-4 flex items-center gap-2">
             <span>📚</span> Verified Sources
          </h3>
          <ul className="space-y-3">
            {report.sources.map((source, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-brand-secondary mt-1">↗</span>
                <a
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-white hover:underline transition-colors text-sm"
                >
                  {source.title || source.uri}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-center mt-8">
        <button
          onClick={onContinue}
          className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
        >
          Generate Action Plan
        </button>
      </div>
    </div>
  );
};

export default ResearchReport;
