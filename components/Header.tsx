
import React, { useState, useRef } from 'react';
import { useProject } from '../ProjectContext';
import { ProjectData } from '../types';

interface HeaderProps {
  onReset: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset }) => {
  const { state, dispatch } = useProject();
  const [showGallery, setShowGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadProject = (id: string) => {
    const fullData = localStorage.getItem(`0relai-proj-${id}`);
    if (fullData) {
      dispatch({ type: 'LOAD_PROJECT', payload: JSON.parse(fullData) });
      setShowGallery(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this project?')) {
      dispatch({ type: 'DELETE_PROJECT', payload: id });
      localStorage.removeItem(`0relai-proj-${id}`);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(state.projectData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.projectData.name.replace(/\s+/g, '-').toLowerCase()}-0relai-blueprint.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target?.result as string) as ProjectData;
          if (importedData.id && importedData.initialIdea) {
            dispatch({ type: 'LOAD_PROJECT', payload: importedData });
            alert('Project imported successfully!');
          } else {
            alert('Invalid project file format.');
          }
        } catch (err) {
          alert('Failed to parse project file.');
        }
      };
      reader.readAsText(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="flex justify-between items-center mb-2 animate-fade-in px-2 relative z-[100]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-accent rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <div>
            <h1 className="text-2xl font-bold text-white tracking-tight leading-none font-slashed-zero flex items-center gap-2">
                0relai
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-glass-text-secondary uppercase tracking-widest font-sans font-normal">v2.0</span>
            </h1>
            <span className="text-xs font-medium text-brand-secondary tracking-widest uppercase opacity-80">Architectural Engine</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".json" 
          className="hidden" 
        />
        
        <div className="flex gap-1 mr-2">
            <button 
                onClick={handleImportClick}
                className="p-2 text-glass-text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                title="Import Project JSON"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </button>
            <button 
                onClick={handleExport}
                className="p-2 text-glass-text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                title="Export Project JSON"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowGallery(!showGallery)}
            className="px-4 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 text-glass-text rounded-full border border-white/10 transition-all flex items-center gap-2"
          >
            📂 My Projects ({state.projectsList.length})
            <svg className={`w-3 h-3 transition-transform ${showGallery ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </button>

          {showGallery && (
            <div className="absolute right-0 mt-2 w-72 glass-panel rounded-2xl shadow-2xl p-4 animate-fade-in border-brand-accent/20 border overflow-hidden">
               <div className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider mb-3 px-2">Recent Blueprints</div>
               <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                  {state.projectsList.length === 0 ? (
                    <div className="text-center py-6 text-glass-text-secondary text-sm italic">No projects saved yet.</div>
                  ) : (
                    state.projectsList.sort((a,b) => b.lastUpdated - a.lastUpdated).map(p => (
                      <div 
                        key={p.id}
                        onClick={() => handleLoadProject(p.id)}
                        className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${state.projectData.id === p.id ? 'bg-brand-primary/20 border-brand-primary/30 border' : 'hover:bg-white/5 border border-transparent'}`}
                      >
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-semibold text-white truncate">{p.name}</span>
                          <span className="text-[10px] text-glass-text-secondary">{new Date(p.lastUpdated).toLocaleDateString()}</span>
                        </div>
                        <button 
                          onClick={(e) => handleDelete(e, p.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))
                  )}
               </div>
            </div>
          )}
        </div>

        <button 
          onClick={onReset}
          className="px-4 py-2 text-xs font-bold glass-button-primary text-white rounded-full transition-all"
          aria-label="Start a new project"
        >
          + New Blueprint
        </button>
      </div>
    </header>
  );
};

export default Header;
