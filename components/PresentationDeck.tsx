
import React, { useState, useEffect, useCallback } from 'react';
import { ProjectData } from '../types';
import VisualArchitecture from './VisualArchitecture';
import VisualERD from './VisualERD';
import VisualGantt from './VisualGantt';

interface PresentationDeckProps {
  projectData: ProjectData;
  onClose: () => void;
}

const PresentationDeck: React.FC<PresentationDeckProps> = ({ projectData, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    { id: 'hero', title: 'The Vision' },
    { id: 'strategy', title: 'Strategic Analysis' },
    { id: 'architecture', title: 'System Architecture' },
    { id: 'data', title: 'Data Strategy' },
    { id: 'roadmap', title: 'Execution Plan' },
    { id: 'economics', title: 'Cost & Risk' },
  ];

  const handleNext = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  const renderSlideContent = () => {
    switch (slides[currentSlide].id) {
      case 'hero':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-fade-in">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-[0_0_100px_rgba(79,70,229,0.3)] mb-8">
                <span className="text-6xl">🚀</span>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tight leading-tight max-w-4xl">
              {projectData.name}
            </h1>
            <p className="text-2xl text-blue-200 max-w-3xl font-light leading-relaxed">
              "{projectData.initialIdea}"
            </p>
            <div className="mt-12 flex gap-4 text-sm font-bold uppercase tracking-widest text-glass-text-secondary">
                <span>Architected by 0relai</span>
                <span>•</span>
                <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        );

      case 'strategy':
        return (
          <div className="h-full flex flex-col justify-center animate-fade-in px-20">
             <div className="grid grid-cols-2 gap-12">
                 <div>
                     <h3 className="text-3xl font-bold text-brand-secondary mb-6">Target Personas</h3>
                     <div className="space-y-6">
                         {projectData.brainstormingResults?.personas.slice(0, 3).map((p, i) => (
                             <div key={i} className="bg-white/5 p-6 rounded-2xl border-l-4 border-brand-secondary">
                                 <div className="text-xl font-bold text-white mb-2">{p.role}</div>
                                 <p className="text-lg text-slate-300">{p.description}</p>
                             </div>
                         ))}
                     </div>
                 </div>
                 <div>
                     <h3 className="text-3xl font-bold text-brand-accent mb-6">Unique Value Proposition</h3>
                     <div className="space-y-6">
                         {projectData.brainstormingResults?.usps.slice(0, 4).map((u, i) => (
                             <div key={i} className="flex items-start gap-4">
                                 <div className="w-8 h-8 rounded-full bg-brand-accent flex items-center justify-center text-black font-bold flex-shrink-0 mt-1">{i+1}</div>
                                 <p className="text-xl text-white">{u}</p>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>
          </div>
        );

      case 'architecture':
        return (
          <div className="h-full flex flex-col pt-10 px-10 animate-fade-in">
             <div className="flex justify-between items-end mb-8">
                 <div className="flex gap-8">
                     <div>
                         <div className="text-sm font-bold text-slate-500 uppercase">Frontend</div>
                         <div className="text-2xl font-bold text-white">{projectData.architecture?.stack.frontend}</div>
                     </div>
                     <div>
                         <div className="text-sm font-bold text-slate-500 uppercase">Backend</div>
                         <div className="text-2xl font-bold text-white">{projectData.architecture?.stack.backend}</div>
                     </div>
                     <div>
                         <div className="text-sm font-bold text-slate-500 uppercase">Database</div>
                         <div className="text-2xl font-bold text-white">{projectData.architecture?.stack.database}</div>
                     </div>
                 </div>
             </div>
             <div className="flex-grow bg-[#0b0e14] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
                 {projectData.architecture && (
                     <VisualArchitecture 
                        architecture={projectData.architecture} 
                        onUpdate={() => {}} 
                        readOnly={true} 
                     />
                 )}
                 {/* Blocker for interaction */}
                 <div className="absolute inset-0 z-50"></div>
             </div>
          </div>
        );

      case 'data':
        return (
          <div className="h-full flex flex-col pt-10 px-10 animate-fade-in">
             <div className="flex-grow bg-[#0b0e14] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
                 {projectData.schema && (
                     <VisualERD 
                        schema={projectData.schema} 
                        onUpdate={() => {}} 
                        readOnly={true}
                     />
                 )}
                 <div className="absolute inset-0 z-50"></div>
             </div>
          </div>
        );

      case 'roadmap':
        return (
          <div className="h-full flex flex-col pt-10 px-10 animate-fade-in">
             <div className="flex-grow bg-[#0b0e14] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
                 {projectData.actionPlan && (
                     <VisualGantt 
                        plan={projectData.actionPlan} 
                        onUpdateTask={() => {}} 
                        readOnly={true}
                     />
                 )}
                 <div className="absolute inset-0 z-50"></div>
             </div>
          </div>
        );

      case 'economics':
        return (
          <div className="h-full flex flex-col justify-center px-20 animate-fade-in">
             <div className="grid grid-cols-2 gap-12">
                 <div className="bg-slate-800/50 p-8 rounded-3xl border border-white/10">
                     <h3 className="text-2xl font-bold text-white mb-6">Resource Estimates</h3>
                     <div className="space-y-6">
                         <div className="flex justify-between items-center border-b border-white/5 pb-4">
                             <span className="text-slate-400 text-xl">Development Effort</span>
                             <span className="text-3xl font-bold text-white">{projectData.costEstimation?.totalProjectHours}</span>
                         </div>
                         <div className="flex justify-between items-center border-b border-white/5 pb-4">
                             <span className="text-slate-400 text-xl">Team Size</span>
                             <span className="text-3xl font-bold text-white">{projectData.costEstimation?.suggestedTeamSize}</span>
                         </div>
                         <div className="mt-8">
                             <span className="text-slate-400 text-xl block mb-4">Monthly Infrastructure</span>
                             {projectData.costEstimation?.monthlyInfrastructure.map((item, i) => (
                                 <div key={i} className="flex justify-between text-lg mb-2">
                                     <span className="text-white">{item.service}</span>
                                     <span className="text-green-400 font-mono">{item.estimatedCost}</span>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>

                 <div className="bg-red-900/10 p-8 rounded-3xl border border-red-500/20">
                     <h3 className="text-2xl font-bold text-red-400 mb-6">Risk Assessment</h3>
                     <div className="space-y-4">
                         {projectData.costEstimation?.risks.map((risk, i) => (
                             <div key={i} className="flex gap-4">
                                 <span className="text-2xl">⚠️</span>
                                 <div>
                                     <div className="text-red-200 font-bold uppercase text-sm mb-1">{risk.impact} Impact</div>
                                     <p className="text-white text-lg">{risk.description}</p>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#000000] z-[500] flex flex-col text-white font-sans overflow-hidden">
      {/* Top Bar */}
      <div className="h-16 flex items-center justify-between px-8 bg-black/50 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
          <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-brand-primary rounded flex items-center justify-center font-bold">0</div>
              <span className="text-sm font-bold tracking-widest text-white/50 uppercase">{slides[currentSlide].title}</span>
          </div>
          <button 
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            ✕ Close Presentation
          </button>
      </div>

      {/* Main Slide Area */}
      <div className="flex-grow pt-16 pb-20 relative">
          {renderSlideContent()}
      </div>

      {/* Controls / Progress */}
      <div className="h-20 fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm flex items-center justify-between px-8 z-50">
          <button 
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className="p-4 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
          >
              ←
          </button>

          <div className="flex-grow max-w-xl mx-8">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-primary transition-all duration-500" 
                    style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                  ></div>
              </div>
              <div className="text-center mt-2 text-xs font-bold text-white/30">
                  SLIDE {currentSlide + 1} / {slides.length}
              </div>
          </div>

          <button 
            onClick={handleNext}
            disabled={currentSlide === slides.length - 1}
            className="p-4 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
          >
              →
          </button>
      </div>
    </div>
  );
};

export default PresentationDeck;
