
import React from 'react';
import { ArchitectureData } from '../types';
import RefineBar from './RefineBar';

interface ArchitectureViewProps {
  architecture?: ArchitectureData;
  onContinue: () => void;
  hideActions?: boolean;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
}

const StackCard: React.FC<{ title: string; value: string; icon: string }> = ({ title, value, icon }) => (
  <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 flex flex-col items-start gap-2 hover:border-brand-accent transition-colors">
    <div className="flex items-center gap-2 text-brand-accent mb-1">
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-bold uppercase tracking-wider">{title}</span>
    </div>
    <div className="text-lg font-medium text-white">{value}</div>
  </div>
);

const ArchitectureView: React.FC<ArchitectureViewProps> = ({ architecture, onContinue, hideActions, onRefine, isRefining = false }) => {
  if (!architecture) return null;

  return (
    <div className="animate-slide-in-up">
      {!hideActions && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2 text-center">Technical Architecture Strategy</h2>
            <p className="text-center text-blue-200 mb-8 max-w-3xl mx-auto">
                Based on your requirements, here is the recommended technology stack and architectural approach.
            </p>
          </>
      )}

      {onRefine && !hideActions && (
        <div className="max-w-3xl mx-auto mb-8">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Switch frontend to Vue', 'Use a serverless architecture'" 
            />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StackCard title="Frontend Framework" value={architecture.stack.frontend} icon="💻" />
        <StackCard title="Backend Runtime" value={architecture.stack.backend} icon="⚙️" />
        <StackCard title="Database" value={architecture.stack.database} icon="🗄️" />
        <StackCard title="Styling System" value={architecture.stack.styling} icon="🎨" />
        <StackCard title="Deployment" value={architecture.stack.deployment} icon="🚀" />
        <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 flex flex-col items-start gap-2 hover:border-brand-accent transition-colors">
            <div className="flex items-center gap-2 text-brand-accent mb-1">
                <span className="text-xl">🏗️</span>
                <span className="text-sm font-bold uppercase tracking-wider">Design Patterns</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
                {architecture.patterns.map((p, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-brand-secondary/20 text-brand-accent border border-brand-secondary/30 rounded-full">
                        {p}
                    </span>
                ))}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-slate-800/80 p-6 rounded-lg border border-slate-600">
            <h3 className="text-xl font-bold text-white mb-3">Architectural Rationale</h3>
            <p className="text-blue-100 leading-relaxed italic border-l-4 border-brand-secondary pl-4">
                "{architecture.stack.rationale}"
            </p>
        </div>

        <div className="lg:col-span-1 bg-slate-900/50 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">📦</span>
                <h3 className="text-xl font-bold text-white">Core Dependencies</h3>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {architecture.dependencies?.map((dep, i) => (
                    <li key={i} className="text-sm bg-slate-800 p-2 rounded flex justify-between items-center group">
                        <span className="font-mono text-brand-accent font-bold">{dep.name}</span>
                        <span className="text-xs text-slate-500 truncate max-w-[120px]" title={dep.description}>{dep.description}</span>
                    </li>
                ))}
                {!architecture.dependencies?.length && (
                    <li className="text-sm text-slate-500 italic">No specific dependencies listed.</li>
                )}
            </ul>
        </div>
      </div>

      {!hideActions && (
        <div className="text-center">
            <button
            onClick={onContinue}
            className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
            >
            Generate Implementation Plan
            </button>
        </div>
      )}
    </div>
  );
};

export default ArchitectureView;
