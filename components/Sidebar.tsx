
import React from 'react';
import { AppPhase } from '../types';
import { useProject } from '../ProjectContext';

interface SidebarProps {
  currentPhase: AppPhase;
  onPhaseClick?: (phase: AppPhase) => void;
  unlockedPhases?: AppPhase[];
  isOpen?: boolean;
  onClose?: () => void;
}

// Map phases to short labels and icons
const PHASE_CONFIG: Record<AppPhase, { label: string; icon: React.ReactNode }> = {
  [AppPhase.IDEA]: {
    label: 'Vision',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  },
  [AppPhase.BRAINSTORM]: {
    label: 'Strategy',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  },
  [AppPhase.KNOWLEDGE_BASE]: {
    label: 'Context',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  },
  [AppPhase.RESEARCH]: {
    label: 'Research',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  },
  [AppPhase.ARCHITECTURE]: {
    label: 'Stack',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  },
  [AppPhase.DATAMODEL]: {
    label: 'Data',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  },
  [AppPhase.FILE_STRUCTURE]: {
    label: 'Files',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  },
  [AppPhase.UI_UX]: {
    label: 'Design',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  },
  [AppPhase.API_SPEC]: {
    label: 'API',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  },
  [AppPhase.SECURITY]: {
    label: 'Security',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  },
  [AppPhase.BLUEPRINT_STUDIO]: {
    label: 'Studio',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
  },
  [AppPhase.AGENT_RULES]: {
    label: 'Rules',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  },
  [AppPhase.PLAN]: {
    label: 'Plan',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  },
  [AppPhase.WORKSPACE]: {
    label: 'Tasks',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 00-2 2" />
  },
  [AppPhase.DOCUMENT]: {
    label: 'Docs',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  },
  [AppPhase.KICKOFF]: {
    label: 'Launch',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /> // Lightning bolt / launch
  }
};

export default function Sidebar({ currentPhase, onPhaseClick, unlockedPhases, isOpen, onClose }: SidebarProps) {
  const { dispatch } = useProject();
  const phases = Object.values(AppPhase);
  const currentIndex = phases.indexOf(currentPhase);

  const handleHomeClick = () => {
      if(window.confirm("Return to Dashboard? Unsaved progress in this session might be lost if not autosaved.")) {
          dispatch({ type: 'RESET_PROJECT' });
          if(onClose) onClose();
      }
  };

  const handlePhaseSelect = (phase: AppPhase) => {
      if (onPhaseClick) onPhaseClick(phase);
      if (onClose) onClose();
  };

  return (
    <>
        {/* Backdrop for Mobile */}
        {isOpen && (
            <div 
                className="fixed inset-0 bg-black/50 z-40 sm:hidden backdrop-blur-sm"
                onClick={onClose}
            ></div>
        )}

        <div 
            id="app-sidebar"
            className={`
            fixed sm:relative inset-y-0 left-0 z-50
            w-20 border-r border-glass-border flex flex-col items-center py-4 gap-2 overflow-y-auto custom-scrollbar flex-shrink-0 bg-[#0f172a] h-full
            transform transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
        `}>
        
        {/* Close Button Mobile */}
        <button 
            onClick={onClose}
            className="sm:hidden text-white p-2 mb-2"
            aria-label="Close Menu"
        >
            ✕
        </button>

        {/* Home / Dashboard Button */}
        <button
            onClick={handleHomeClick}
            className="group flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl transition-all duration-200 cursor-pointer hover:bg-white/5 text-slate-400 mb-2 border-b border-glass-border"
            title="Go to Dashboard"
            aria-label="Return to Dashboard"
        >
            <div className="group-hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </div>
            <span className="text-[9px] font-bold tracking-wide uppercase transition-colors text-center leading-tight group-hover:text-slate-300">
                Home
            </span>
        </button>

        {/* Phases */}
        {phases.map((phase, index) => {
            const config = PHASE_CONFIG[phase];
            // Idea phase is skipped in sidebar as it's the dashboard now
            if (phase === AppPhase.IDEA) return null;

            const isCurrent = phase === currentPhase;
            const isUnlocked = unlockedPhases?.includes(phase);
            const isCompleted = index < currentIndex;
            const isDisabled = !isUnlocked && !isCompleted && !isCurrent;
            
            return (
            <button
                key={phase}
                onClick={() => !isDisabled && handlePhaseSelect(phase)}
                disabled={isDisabled}
                aria-label={`Go to ${config.label}`}
                className={`
                group flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl transition-all duration-200 relative
                ${isDisabled ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer hover:bg-white/5'}
                ${isCurrent ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-400'}
                `}
            >
                <div className={`${isCurrent ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {config.icon}
                </svg>
                </div>
                
                <span className={`
                text-[9px] font-bold tracking-wide uppercase transition-colors text-center leading-tight
                ${isCurrent ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}
                `}>
                {config.label}
                </span>
            </button>
            );
        })}
        </div>
    </>
  );
}
