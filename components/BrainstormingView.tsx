
import React, { useState } from 'react';
import { BrainstormingData, Persona, UserJourney } from '../types';
import RefineBar from './RefineBar';
import VisualJourneyMap from './VisualJourneyMap';

interface BrainstormingViewProps {
  data?: BrainstormingData;
  onUpdate: (data: BrainstormingData) => void;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
  onContinue: () => void;
}

const BrainstormingView: React.FC<BrainstormingViewProps> = ({ data, onUpdate, onRefine, isRefining = false, onContinue }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'personas' | 'journeys'>('overview');

  if (!data) return null;

  const handleUpdate = (field: keyof BrainstormingData, value: any) => {
    onUpdate({ ...data, [field]: value });
  };

  const handleArrayChange = (field: 'usps' | 'questions' | 'features', index: number, value: string) => {
      const newArray = [...data[field]];
      newArray[index] = value;
      handleUpdate(field, newArray);
  };

  const addItem = (field: 'usps' | 'questions' | 'features') => {
      handleUpdate(field, [...data[field], 'New Item']);
  };

  const removeItem = (field: 'usps' | 'questions' | 'features', index: number) => {
      const newArray = [...data[field]];
      newArray.splice(index, 1);
      handleUpdate(field, newArray);
  };

  const handlePersonaChange = (index: number, field: keyof Persona, value: string) => {
    const newPersonas = [...data.personas];
    if (field !== 'painPoints') {
        (newPersonas[index] as any)[field] = value;
    }
    handleUpdate('personas', newPersonas);
  };
  
  const handlePainPointChange = (pIndex: number, ppIndex: number, value: string) => {
      const newPersonas = [...data.personas];
      newPersonas[pIndex].painPoints[ppIndex] = value;
      handleUpdate('personas', newPersonas);
  };

  const addPersona = () => {
      handleUpdate('personas', [...data.personas, { role: 'New Role', description: 'Description...', painPoints: ['Pain point 1'] }]);
  };

  const removePersona = (index: number) => {
      const newPersonas = [...data.personas];
      newPersonas.splice(index, 1);
      handleUpdate('personas', newPersonas);
  };

  const handleJourneyUpdate = (index: number, updatedJourney: UserJourney) => {
      const newJourneys = [...(data.userJourneys || [])];
      newJourneys[index] = updatedJourney;
      handleUpdate('userJourneys', newJourneys);
  };

  const addJourney = () => {
      const newJourney: UserJourney = {
          personaRole: 'New User',
          goal: 'Achieve something',
          steps: ['Step 1', 'Step 2']
      };
      handleUpdate('userJourneys', [...(data.userJourneys || []), newJourney]);
  };

  const removeJourney = (index: number) => {
      if(confirm('Delete this user journey?')) {
        const newJourneys = [...(data.userJourneys || [])];
        newJourneys.splice(index, 1);
        handleUpdate('userJourneys', newJourneys);
      }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in space-y-4">
      
      {/* Header / Refine Bar */}
      <div className="flex flex-col gap-4 flex-shrink-0">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Strategic Analysis</h2>
                  <p className="text-xs text-glass-text-secondary">Project foundation and user definition.</p>
              </div>
              <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                  <button 
                      onClick={() => setActiveTab('overview')}
                      className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'overview' ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
                  >
                      Overview
                  </button>
                  <button 
                      onClick={() => setActiveTab('personas')}
                      className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'personas' ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
                  >
                      Personas
                  </button>
                  <button 
                      onClick={() => setActiveTab('journeys')}
                      className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'journeys' ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
                  >
                      User Journeys
                  </button>
              </div>
          </div>

          {onRefine && (
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Add a persona for an Administrator', 'Focus on mobile-first features'" 
                className="w-full"
            />
          )}
      </div>
      
      {/* Content Area - Scrollable */}
      <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
        {activeTab === 'overview' && (
            <div className="space-y-6">
                {/* Features Grid */}
                <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-brand-accent uppercase tracking-wider">Core Features</h3>
                        <button onClick={() => addItem('features')} className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white border border-white/5">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {data.features.map((feature, idx) => (
                            <div key={idx} className="relative group">
                                <input 
                                    value={feature}
                                    onChange={(e) => handleArrayChange('features', idx, e.target.value)}
                                    className="px-3 py-1.5 bg-black/20 text-white rounded-lg border border-white/10 text-xs focus:border-brand-secondary focus:outline-none w-48 transition-all hover:bg-black/30"
                                />
                                <button 
                                    onClick={() => removeItem('features', idx)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* USPs */}
                    <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-brand-secondary uppercase tracking-wider flex items-center gap-2">
                                <span>✨</span> USPs
                            </h3>
                            <button onClick={() => addItem('usps')} className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white border border-white/5">+</button>
                        </div>
                        <ul className="space-y-2">
                            {data.usps.map((usp, idx) => (
                                <li key={idx} className="flex items-center gap-2 group">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                    <input 
                                        value={usp}
                                        onChange={(e) => handleArrayChange('usps', idx, e.target.value)}
                                        className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-brand-accent focus:outline-none w-full text-slate-300 text-xs py-1"
                                    />
                                    <button onClick={() => removeItem('usps', idx)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity px-1">×</button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Questions */}
                    <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-brand-accent uppercase tracking-wider flex items-center gap-2">
                                <span>❓</span> Critical Questions
                            </h3>
                            <button onClick={() => addItem('questions')} className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white border border-white/5">+</button>
                        </div>
                        <ul className="space-y-2">
                            {data.questions.map((q, idx) => (
                                <li key={idx} className="flex items-center gap-2 group">
                                    <span className="text-slate-500 font-bold text-xs">{idx + 1}.</span>
                                    <input 
                                        value={q}
                                        onChange={(e) => handleArrayChange('questions', idx, e.target.value)}
                                        className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-brand-accent focus:outline-none w-full text-slate-300 italic text-xs py-1"
                                    />
                                    <button onClick={() => removeItem('questions', idx)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity px-1">×</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'personas' && (
            <div className="space-y-4">
                <div className="flex justify-end">
                    <button onClick={addPersona} className="text-xs bg-brand-primary hover:bg-blue-600 px-3 py-1.5 rounded-lg text-white font-bold flex items-center gap-2 shadow-lg">
                        <span>+</span> Add Persona
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.personas.map((persona, idx) => (
                        <div key={idx} className="bg-slate-900/50 p-4 rounded-xl border border-white/5 hover:border-brand-accent/50 transition-all relative group flex flex-col">
                            <button 
                                onClick={() => removePersona(idx)}
                                className="absolute top-2 right-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                                    {persona.role.charAt(0)}
                                </div>
                                <input 
                                    value={persona.role}
                                    onChange={(e) => handlePersonaChange(idx, 'role', e.target.value)}
                                    className="font-bold text-sm text-white bg-transparent border-b border-transparent hover:border-slate-500 focus:border-brand-accent focus:outline-none w-full"
                                />
                            </div>
                            
                            <textarea 
                                value={persona.description}
                                onChange={(e) => handlePersonaChange(idx, 'description', e.target.value)}
                                className="text-xs text-slate-400 mb-4 w-full bg-transparent border border-transparent hover:border-white/10 focus:border-brand-accent focus:outline-none rounded p-1 h-16 resize-none leading-relaxed"
                            />
                            
                            <div className="mt-auto bg-black/20 p-2 rounded-lg">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Pain Points</span>
                                <ul className="space-y-1">
                                    {persona.painPoints.map((pp, i) => (
                                        <li key={i} className="flex items-center gap-1">
                                            <span className="text-red-400 text-[8px]">•</span>
                                            <input 
                                                value={pp}
                                                onChange={(e) => handlePainPointChange(idx, i, e.target.value)}
                                                className="text-[10px] text-red-200 bg-transparent w-full border-b border-transparent hover:border-red-900/50 focus:border-red-500 focus:outline-none"
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'journeys' && (
            <div className="space-y-4">
                <div className="flex justify-end">
                    <button 
                        onClick={addJourney}
                        className="bg-brand-primary hover:bg-brand-secondary text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg"
                    >
                        + Add Journey
                    </button>
                </div>

                {!data.userJourneys || data.userJourneys.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-white/5">
                        <div className="text-4xl mb-3 opacity-30">📍</div>
                        <p className="text-xs">No user journeys defined yet.</p>
                    </div>
                ) : (
                    data.userJourneys.map((journey, idx) => (
                        <VisualJourneyMap 
                            key={idx} 
                            journey={journey} 
                            onUpdate={(updated) => handleJourneyUpdate(idx, updated)}
                            onDelete={() => removeJourney(idx)}
                        />
                    ))
                )}
            </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="pt-2 border-t border-white/5 flex justify-end flex-shrink-0">
        <button
          onClick={onContinue}
          className="px-6 py-2 bg-white/5 hover:bg-brand-primary text-white text-xs font-bold rounded-lg border border-white/10 transition-all flex items-center gap-2"
        >
          <span>Next: Research</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </div>
    </div>
  );
};

export default BrainstormingView;
