
import React from 'react';
import { AppPhase } from '../types';

interface PhaseStepperProps {
  currentPhase: AppPhase;
}

const phases = Object.values(AppPhase);

const PhaseStepper: React.FC<PhaseStepperProps> = ({ currentPhase }) => {
  const currentIndex = phases.indexOf(currentPhase);

  return (
    <nav className="p-4 sm:p-6 border-b border-white/10 overflow-x-auto">
      <ol className="flex items-center justify-between space-x-2 min-w-max sm:min-w-0 sm:space-x-4">
        {phases.map((phase, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <li key={phase} className="flex-1 flex items-center">
              <div className="flex items-center text-sm font-medium">
                <span className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-300 ${isCurrent ? 'bg-brand-secondary text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className={`hidden lg:inline-block ml-3 transition-colors duration-300 ${isCurrent ? 'text-brand-secondary' : isCompleted ? 'text-green-300' : 'text-slate-400'}`}>
                  {phase}
                </span>
              </div>
               {index < phases.length - 1 && (
                  <div className={`hidden sm:block flex-auto w-8 lg:w-full h-0.5 transition-colors duration-300 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-slate-700'}`}></div>
                )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default PhaseStepper;
