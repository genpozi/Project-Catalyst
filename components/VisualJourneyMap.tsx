
import React from 'react';
import { UserJourney } from '../types';

interface VisualJourneyMapProps {
  journey: UserJourney;
  onUpdate: (journey: UserJourney) => void;
  onDelete: () => void;
}

const VisualJourneyMap: React.FC<VisualJourneyMapProps> = ({ journey, onUpdate, onDelete }) => {
  
  const handleUpdateField = (field: keyof UserJourney, value: any) => {
    onUpdate({ ...journey, [field]: value });
  };

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...journey.steps];
    newSteps[index] = value;
    onUpdate({ ...journey, steps: newSteps });
  };

  const addStep = (index: number) => {
    const newSteps = [...journey.steps];
    newSteps.splice(index + 1, 0, "New interaction...");
    onUpdate({ ...journey, steps: newSteps });
  };

  const removeStep = (index: number) => {
    const newSteps = [...journey.steps];
    newSteps.splice(index, 1);
    onUpdate({ ...journey, steps: newSteps });
  };

  return (
    <div className="bg-[#0b0e14] rounded-xl border border-white/5 p-6 relative overflow-hidden group">
        {/* Background Track Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-brand-secondary/20 via-brand-accent/20 to-green-500/20 -translate-y-1/2 z-0"></div>

        {/* Delete Journey Button */}
        <button 
            onClick={onDelete}
            className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
            title="Delete Journey"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>

        <div className="flex gap-6 overflow-x-auto pb-4 pt-2 custom-scrollbar relative z-10 items-start">
            
            {/* Start Node: Persona */}
            <div className="flex-shrink-0 w-64 bg-slate-900 border border-brand-secondary/50 rounded-xl p-4 shadow-[0_0_20px_rgba(59,130,246,0.15)] flex flex-col gap-2 relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center text-white text-lg shadow-lg">
                    👤
                </div>
                <div className="text-[10px] uppercase font-bold text-brand-secondary tracking-wider ml-4">Persona</div>
                <input 
                    value={journey.personaRole}
                    onChange={(e) => handleUpdateField('personaRole', e.target.value)}
                    className="bg-transparent text-lg font-bold text-white border-b border-transparent hover:border-white/20 focus:border-brand-secondary focus:outline-none w-full"
                    placeholder="Role Name"
                />
                <button 
                    onClick={() => addStep(-1)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-700 hover:bg-white text-white hover:text-brand-dark flex items-center justify-center text-sm font-bold shadow-lg transition-all z-20 border border-slate-600"
                    title="Add Step"
                >
                    +
                </button>
            </div>

            {/* Steps */}
            {journey.steps.map((step, idx) => (
                <div key={idx} className="flex-shrink-0 w-48 relative group/step pt-8">
                    {/* Connection Node */}
                    <div className="absolute top-[38px] -left-3 w-2 h-2 rounded-full bg-slate-600"></div>
                    
                    <div className="bg-slate-800/80 backdrop-blur-sm border border-white/10 rounded-lg p-3 hover:border-white/30 transition-all flex flex-col gap-2 shadow-lg">
                        <div className="flex justify-between items-center">
                            <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono text-slate-400 border border-white/5">
                                {idx + 1}
                            </span>
                            <button 
                                onClick={() => removeStep(idx)}
                                className="text-slate-600 hover:text-red-400 opacity-0 group-hover/step:opacity-100 transition-opacity"
                            >
                                ×
                            </button>
                        </div>
                        <textarea 
                            value={step}
                            onChange={(e) => handleStepChange(idx, e.target.value)}
                            className="bg-transparent text-sm text-slate-200 w-full resize-none focus:outline-none h-20 leading-relaxed"
                            placeholder="Describe interaction..."
                        />
                    </div>

                    {/* Add Button */}
                    <button 
                        onClick={() => addStep(idx)}
                        className="absolute -right-3 top-[50px] -translate-y-1/2 w-6 h-6 rounded-full bg-slate-700 hover:bg-white text-white hover:text-brand-dark flex items-center justify-center text-sm font-bold shadow-lg transition-all z-20 border border-slate-600 opacity-0 group-hover/step:opacity-100"
                        title="Add Step"
                    >
                        +
                    </button>
                </div>
            ))}

            {/* End Node: Goal */}
            <div className="flex-shrink-0 w-64 bg-slate-900 border border-green-500/50 rounded-xl p-4 shadow-[0_0_20px_rgba(34,197,94,0.15)] flex flex-col gap-2 relative ml-2">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-lg shadow-lg">
                    🏁
                </div>
                <div className="text-[10px] uppercase font-bold text-green-500 tracking-wider text-right mr-4">Success Goal</div>
                <textarea 
                    value={journey.goal}
                    onChange={(e) => handleUpdateField('goal', e.target.value)}
                    className="bg-transparent text-sm font-medium text-white border border-transparent hover:border-white/20 focus:border-green-500 focus:outline-none w-full rounded p-1 resize-none h-20 text-right"
                    placeholder="Desired Outcome"
                />
            </div>

        </div>
    </div>
  );
};

export default VisualJourneyMap;
