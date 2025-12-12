
import React from 'react';
import { DesignSystem } from '../types';
import RefineBar from './RefineBar';

interface DesignSystemViewProps {
  designSystem?: DesignSystem;
  onContinue: () => void;
  hideActions?: boolean;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
}

const DesignSystemView: React.FC<DesignSystemViewProps> = ({ designSystem, onContinue, hideActions, onRefine, isRefining = false }) => {
  if (!designSystem) return null;

  return (
    <div className="animate-slide-in-up">
      {!hideActions && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2 text-center">UI/UX Design System</h2>
            <p className="text-center text-blue-200 mb-8 max-w-3xl mx-auto">
                A visual language defined for your project. These tokens ensure consistency across your application.
            </p>
          </>
      )}

      {onRefine && !hideActions && (
        <div className="max-w-3xl mx-auto mb-8">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Use a pastel color palette', 'Add a floating action button component'" 
            />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Colors */}
        <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700">
          <h3 className="text-xl font-bold text-brand-accent mb-4 border-b border-slate-700 pb-2">Color Palette</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {designSystem.colorPalette.map((color, idx) => (
              <div key={idx} className="group">
                <div 
                    className="h-20 w-full rounded-lg shadow-lg mb-2 ring-1 ring-white/10 transition-transform transform group-hover:scale-105"
                    style={{ backgroundColor: color.hex }}
                ></div>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-white">{color.name}</span>
                    <span className="text-xs font-mono text-slate-400">{color.hex}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{color.usage}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Typography & Layout */}
        <div className="space-y-8">
            <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700">
                <h3 className="text-xl font-bold text-brand-accent mb-4 border-b border-slate-700 pb-2">Typography</h3>
                <div className="space-y-4">
                    {designSystem.typography.map((type, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-700/30 p-3 rounded">
                        <div>
                            <span className="text-xs uppercase tracking-wider text-slate-500 block">{type.role}</span>
                            <span className="font-medium text-white text-lg">{type.fontFamily}</span>
                        </div>
                        <span className="text-sm font-mono bg-slate-900 px-2 py-1 rounded text-brand-secondary">{type.size}</span>
                    </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700">
                <h3 className="text-xl font-bold text-brand-accent mb-2">Layout Strategy</h3>
                <p className="text-blue-100 italic">{designSystem.layoutStrategy}</p>
            </div>
        </div>
      </div>

      {/* Components */}
      <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700 mb-8">
        <h3 className="text-xl font-bold text-brand-accent mb-4 border-b border-slate-700 pb-2">Core Component Library</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {designSystem.coreComponents.map((comp, idx) => (
                <div key={idx} className="bg-slate-700/40 p-4 rounded border border-slate-600/50 hover:border-brand-secondary/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white">{comp.name}</h4>
                    </div>
                    <p className="text-sm text-slate-300 mb-3 line-clamp-2">{comp.description}</p>
                    <div className="flex flex-wrap gap-1">
                        {comp.states.map((state, sIdx) => (
                            <span key={sIdx} className="text-[10px] px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded-full border border-slate-700">
                                {state}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {!hideActions && (
        <div className="text-center">
            <button
            onClick={onContinue}
            className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
            >
            Approve Design & Define API
            </button>
        </div>
      )}
    </div>
  );
};

export default DesignSystemView;
