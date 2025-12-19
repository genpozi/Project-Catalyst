
import React from 'react';
import { AppPhase } from '../types';

interface PhaseStepperProps {
  currentPhase: AppPhase;
  unlockedPhases: AppPhase[];
}

const PhaseStepper: React.FC<PhaseStepperProps> = ({ currentPhase, unlockedPhases }) => {
  const phases = Object.values(AppPhase);
  const currentIndex = phases.indexOf(currentPhase);
  
  // Calculate progress percentage
  const progress = ((currentIndex) / (phases.length - 1)) * 100;

  return (
    <div className="w-full mb-6 relative">
      <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-glass-text-secondary mb-2 px-1">
        <span>Initiation</span>
        <span>Strategy</span>
        <span>Architecture</span>
        <span>Specs</span>
        <span>Execution</span>
      </div>
      
      {/* Track Background */}
      <div className="h-1.5 w-full bg-brand-surface rounded-full overflow-hidden">
        {/* Active Progress */}
        <div 
          className="h-full bg-gradient-to-r from-brand-primary to-tech-cyan transition-all duration-700 ease-out relative"
          style={{ width: `${progress}%` }}
        >
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 animate-pulse"></div>
        </div>
      </div>

      {/* Current Phase Indicator Badge */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-glass-text-secondary">Current Phase:</span>
        <div className="flex items-center gap-2 px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-brand-primary uppercase tracking-wide">{currentPhase}</span>
        </div>
        <div className="ml-auto text-xs text-glass-text-secondary font-mono">
            {currentIndex + 1} / {phases.length}
        </div>
      </div>
    </div>
  );
};

export default PhaseStepper;
