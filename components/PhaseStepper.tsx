
import React from 'react';
import { AppPhase } from '../types';

interface PhaseStepperProps {
  currentPhase: AppPhase;
  unlockedPhases: AppPhase[];
}

const PhaseStepper: React.FC<PhaseStepperProps> = ({ currentPhase, unlockedPhases }) => {
  const phases = Object.values(AppPhase);
  const currentIndex = phases.indexOf(currentPhase);

  return (
    <div className="w-full py-4 mb-6 overflow-x-auto custom-scrollbar">
      <div className="flex items-center justify-between min-w-[800px] px-4">
        {phases.map((phase, index) => {
          const isCurrent = phase === currentPhase;
          const isCompleted = index < currentIndex;
          const isUnlocked = unlockedPhases.includes(phase);
          
          return (
            <React.Fragment key={phase}>
              <div className="flex flex-col items-center group relative">
                <div 
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 z-10
                    ${isCurrent ? 'bg-brand-primary text-white ring-4 ring-brand-primary/20 scale-110 shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 
                      isCompleted ? 'bg-green-500 text-white' : 
                      isUnlocked ? 'bg-slate-700 text-slate-300 border border-slate-600' : 'bg-slate-800 text-slate-600 border border-slate-700'}
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`
                  absolute -bottom-6 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors duration-300
                  ${isCurrent ? 'text-brand-accent' : isCompleted ? 'text-green-400' : 'text-slate-500'}
                `}>
                  {phase}
                </span>
              </div>
              
              {index < phases.length - 1 && (
                <div className="flex-grow h-[2px] mx-2 relative overflow-hidden bg-slate-800">
                  <div 
                    className={`absolute inset-0 transition-all duration-700 ${isCompleted ? 'bg-green-500' : isCurrent ? 'bg-brand-primary animate-pulse' : 'bg-transparent'}`}
                    style={{ width: isCompleted ? '100%' : '0%' }}
                  ></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default PhaseStepper;
