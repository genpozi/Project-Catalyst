
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

  // --- Handlers for Arrays (USPs, Questions, Features) ---
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

  // --- Handlers for Personas ---
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

  // --- Handlers for Journeys ---
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
    <div className="animate-slide-in-up">
      <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2 text-center">Strategic Analysis</h2>
      <p className="text-center text-blue-200 mb-6 max-w-2xl mx-auto">
        Review and edit the strategic foundation. This context drives all future technical decisions.
      </p>

      {onRefine && (
        <div className="max-w-3xl mx-auto mb-6">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Add a persona for an Administrator', 'Make the user journey focus on onboarding'" 
            />
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-white/5 p-1 rounded-xl flex gap-1">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'overview' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
            >
                Overview
            </button>
            <button 
                onClick={() => setActiveTab('personas')}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'personas' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
            >
                Personas
            </button>
            <button 
                onClick={() => setActiveTab('journeys')}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'journeys' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
            >
                User Journeys
            </button>
        </div>
      </div>
      
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
                {/* Features */}
                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-brand-accent">Proposed Core Features</h3>
                        <button onClick={() => addItem('features')} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-white">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {data.features.map((feature, idx) => (
                            <div key={idx} className="relative group">
                                <input 
                                    value={feature}
                                    onChange={(e) => handleArrayChange('features', idx, e.target.value)}
                                    className="px-3 py-1.5 bg-slate-800 text-blue-200 rounded-full border border-slate-600 text-sm focus:border-brand-secondary focus:outline-none w-48 sm:w-auto transition-all"
                                />
                                <button 
                                    onClick={() => removeItem('features', idx)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* USPs */}
                    <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-brand-secondary flex items-center gap-2">
                                <span>✨</span> Unique Selling Propositions
                            </h3>
                            <button onClick={() => addItem('usps')} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-white">+</button>
                        </div>
                        <ul className="space-y-3">
                            {data.usps.map((usp, idx) => (
                                <li key={idx} className="flex items-center gap-2 group">
                                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    <input 
                                        value={usp}
                                        onChange={(e) => handleArrayChange('usps', idx, e.target.value)}
                                        className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-brand-accent focus:outline-none w-full text-blue-100 py-1"
                                    />
                                    <button onClick={() => removeItem('usps', idx)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Questions */}
                    <div className="bg-slate-800/50 p-6 rounded-lg ring-1 ring-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-brand-accent flex items-center gap-2">
                                <span>❓</span> Critical Questions
                            </h3>
                            <button onClick={() => addItem('questions')} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-white">+</button>
                        </div>
                        <ul className="space-y-3">
                            {data.questions.map((q, idx) => (
                                <li key={idx} className="flex items-center gap-2 group">
                                    <span className="text-slate-500 font-bold">{idx + 1}.</span>
                                    <input 
                                        value={q}
                                        onChange={(e) => handleArrayChange('questions', idx, e.target.value)}
                                        className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-brand-accent focus:outline-none w-full text-slate-300 italic py-1"
                                    />
                                    <button onClick={() => removeItem('questions', idx)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'personas' && (
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-4 pl-2 border-l-4 border-brand-primary">
                    <h3 className="text-xl font-bold text-white">Target Audience Personas</h3>
                    <button onClick={addPersona} className="text-sm bg-brand-primary hover:bg-blue-600 px-3 py-1 rounded text-white">Add Persona</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {data.personas.map((persona, idx) => (
                        <div key={idx} className="bg-slate-700/30 p-5 rounded-lg border border-slate-600 hover:border-brand-accent transition-colors relative group">
                            <button 
                                onClick={() => removePersona(idx)}
                                className="absolute top-2 right-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>

                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
                                    {persona.role.charAt(0)}
                                </div>
                                <input 
                                    value={persona.role}
                                    onChange={(e) => handlePersonaChange(idx, 'role', e.target.value)}
                                    className="font-bold text-lg text-white bg-transparent border-b border-transparent hover:border-slate-500 focus:border-brand-accent focus:outline-none w-full"
                                />
                            </div>
                            <textarea 
                                value={persona.description}
                                onChange={(e) => handlePersonaChange(idx, 'description', e.target.value)}
                                className="text-sm text-slate-300 mb-4 w-full bg-transparent border border-transparent hover:border-slate-600 focus:border-brand-accent focus:outline-none rounded p-1 h-20 resize-none"
                            />
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pain Points</span>
                                <ul className="mt-2 space-y-1">
                                    {persona.painPoints.map((pp, i) => (
                                        <li key={i} className="flex items-center gap-1">
                                            <span className="text-red-400">•</span>
                                            <input 
                                                value={pp}
                                                onChange={(e) => handlePainPointChange(idx, i, e.target.value)}
                                                className="text-xs text-red-200 bg-red-900/20 px-2 py-1 rounded w-full border border-transparent hover:border-red-800 focus:outline-none focus:border-red-500"
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
            <div className="animate-fade-in space-y-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>🗺️</span> User Flow Builder
                    </h3>
                    <button 
                        onClick={addJourney}
                        className="bg-brand-primary hover:bg-brand-secondary text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg"
                    >
                        + Add Journey
                    </button>
                </div>

                {!data.userJourneys || data.userJourneys.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
                        <div className="text-4xl mb-3">📍</div>
                        <p>No user journeys defined yet. Create one to map out the user experience.</p>
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

      <div className="text-center mt-8">
        <button
          onClick={onContinue}
          className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
        >
          Begin Technical Research
        </button>
      </div>
    </div>
  );
};

export default BrainstormingView;
