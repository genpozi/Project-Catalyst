
import React from 'react';
import { AppPhase } from '../types';
import { useProject } from '../ProjectContext';

export type ActivityView = 'EXPLORER' | 'SEARCH' | 'PLUGINS' | 'SETTINGS' | 'DOCS' | 'NONE';

interface SidebarProps {
  activeView: ActivityView;
  onViewChange: (view: ActivityView) => void;
  currentPhase: AppPhase;
}

export default function Sidebar({ activeView, onViewChange, currentPhase }: SidebarProps) {
  const { dispatch } = useProject();

  const handleHomeClick = () => {
      // If navigating home, we generally want to close the explorer to show the dashboard full width
      if (currentPhase !== AppPhase.IDEA) {
          if (window.confirm("Return to Dashboard?")) {
              dispatch({ type: 'SET_PHASE', payload: AppPhase.IDEA });
              onViewChange('NONE'); 
          }
      }
  };

  const NavItem = ({ view, icon, label }: { view: ActivityView, icon: React.ReactNode, label: string }) => (
      <button
        onClick={() => onViewChange(activeView === view ? 'NONE' : view)}
        className={`group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
            activeView === view ? 'text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
        }`}
        title={label}
      >
        {/* Active Border Indicator */}
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-primary rounded-r transition-all duration-200 ${activeView === view ? 'opacity-100' : 'opacity-0 scale-y-0'}`}></div>
        
        {icon}
      </button>
  );

  return (
    <div className="hidden sm:flex w-14 border-r border-white/5 flex-col items-center py-4 bg-[#0b0e14] flex-shrink-0 z-30">
      
      {/* Home / Dashboard Button */}
      <button
        onClick={handleHomeClick}
        className={`group flex items-center justify-center w-10 h-10 mb-4 rounded-xl transition-all duration-200 cursor-pointer ${
            currentPhase === AppPhase.IDEA ? 'bg-brand-primary text-white shadow-glow' : 'text-slate-500 hover:bg-white/5 hover:text-white'
        }`}
        title="Dashboard"
      >
        <span className="font-black text-xl">Ø</span>
      </button>

      <div className="flex flex-col gap-2 w-full items-center">
          <NavItem 
            view="EXPLORER" 
            label="Project Explorer"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
          />
          
          <NavItem 
            view="SEARCH" 
            label="Search"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
          />

          <NavItem 
            view="PLUGINS" 
            label="Extensions"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
          />
      </div>

      <div className="mt-auto flex flex-col gap-3 w-full items-center">
          {/* External Dashboard Link */}
          <a
            href="https://0relai.0reliance.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 text-slate-500 hover:text-white hover:bg-white/5"
            title="0relai Command"
          >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </a>

          {/* Documentation Toggle */}
          <NavItem 
            view="DOCS" 
            label="Documentation & Help"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
          />

          {/* Settings Trigger */}
          <NavItem 
            view="SETTINGS" 
            label="Settings"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-secondary to-purple-500 flex items-center justify-center text-xs font-bold text-white cursor-pointer mt-2" title="User Profile">
             A
         </div>
      </div>
    </div>
  );
}
