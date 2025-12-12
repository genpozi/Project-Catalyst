
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
      <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-6 text-center">Feasibility & Research Report</h2>
      
      {onRefine && (
        <div className="max-w-3xl mx-auto mb-8">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Focus more on mobile competitors', 'Find open source alternatives'" 
            />
        </div>
      )}

      <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700 mb-8">
        <h3 className="text-xl font-semibold text-brand-accent mb-4">AI-Generated Summary</h3>
        <MarkdownRenderer content={report.summary} />
      </div>
      
      {report.sources.length > 0 && (
        <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700">
          <h3 className="text-xl font-semibold text-brand-accent mb-4">Web Sources</h3>
          <ul className="space-y-3">
            {report.sources.map((source, index) => (
              <li key={index}>
                <a
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
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
