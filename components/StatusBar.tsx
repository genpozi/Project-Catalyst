
import React, { useState, useEffect } from 'react';
import { useProject } from '../ProjectContext';

const StatusBar: React.FC = () => {
  const { state } = useProject();
  const { projectData, currentPhase, syncStatus } = state;
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fileSize = JSON.stringify(projectData).length;
  const sizeLabel = fileSize > 1024 ? `${(fileSize / 1024).toFixed(1)} KB` : `${fileSize} B`;
  const taskCount = projectData.tasks?.length || 0;
  const completedTasks = projectData.tasks?.filter(t => t.status === 'Done').length || 0;
  
  const isSyncing = state.isLoading;

  return (
    <div className={`h-7 border-t border-glass-border flex items-center justify-between px-3 select-none flex-shrink-0 z-50 transition-colors duration-300 ${isOnline ? 'bg-[#0b0e14]' : 'bg-red-900/90'}`}>
      {/* Left Section: Git-like info */}
      <div className="flex items-center gap-4 text-[10px] text-glass-text-secondary font-mono">
        {!isOnline && (
            <div className="flex items-center gap-1.5 text-white font-bold animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                OFFLINE MODE - LOCAL INTELLIGENCE ONLY
            </div>
        )}
        
        <div className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            <span className="font-bold text-brand-secondary">main*</span>
        </div>
        
        {/* CLI Bridge Status */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${
            syncStatus === 'connected' ? 'bg-green-500/10 text-green-400' : 'hover:bg-white/5'
        }`} title={syncStatus === 'connected' ? "Local Bridge Active" : "Local Bridge Disconnected"}>
            <div className={`w-1.5 h-1.5 rounded-full ${
                syncStatus === 'connected' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 
                syncStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-slate-600'
            }`}></div>
            <span className="font-bold hidden sm:inline">CLI</span>
        </div>

        <div className="hidden md:flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
            <span className="text-white">✕</span>
            <span>0 errors</span>
        </div>
      </div>

      {/* Center: Phase Context */}
      <div className="hidden sm:flex items-center gap-2 text-[10px] text-glass-text-secondary">
          <span>Active Context:</span>
          <span className="text-brand-accent font-bold uppercase tracking-wider">{currentPhase}</span>
      </div>

      {/* Right: Technical Stats */}
      <div className="flex items-center gap-4 text-[10px] text-glass-text-secondary font-mono">
         <div className="flex items-center gap-1.5" title="Tasks Completed">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span>{completedTasks}/{taskCount} Tasks</span>
         </div>
         <div className="hidden sm:block">
            Typescript React
         </div>
         <div className="hidden sm:block">
            UTF-8
         </div>
         <div className="flex items-center gap-1">
             <span className={isSyncing ? "animate-spin" : ""}>{isSyncing ? '⟳' : '☁'}</span>
             <span>{sizeLabel}</span>
         </div>
         <div className="bg-brand-primary hover:bg-brand-secondary text-white px-2 py-0.5 rounded cursor-pointer transition-colors">
            0relai v3.3
         </div>
      </div>
    </div>
  );
};

export default StatusBar;
