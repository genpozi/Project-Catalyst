
import React, { useState, useRef } from 'react';
import { useProject } from '../ProjectContext';
import { ProjectData } from '../types';
import ShareModal from './ShareModal';
import PluginStore from './PluginStore';
import SettingsModal from './SettingsModal';
import AuthModal from './AuthModal';
import ImportRepoModal from './ImportRepoModal';
import { useToast } from './Toast';
import { signOut } from '../utils/supabaseClient';
import PresenceAvatars from './PresenceAvatars';

interface HeaderProps {
  onReset: () => void;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset, onToggleChat, isChatOpen, onToggleMobileMenu }) => {
  const { state, dispatch } = useProject();
  const { addToast } = useToast();
  const [showGallery, setShowGallery] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showPlugins, setShowPlugins] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showImport, setShowImport] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isAuthenticated = !!state.user;

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

  const handleSaveTemplate = () => {
      const name = prompt("Template Name:", state.projectData.name + " Template");
      if (name) {
          dispatch({ 
              type: 'SAVE_TEMPLATE', 
              payload: { 
                  name, 
                  description: state.projectData.initialIdea.substring(0, 100) + "...",
                  icon: "📐"
              } 
          });
          addToast("Saved as template!", "success");
      }
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

  const handleInvite = (email: string, role: 'Editor' | 'Viewer') => {
      dispatch({ 
          type: 'ADD_COLLABORATOR', 
          payload: {
              id: Date.now().toString(),
              name: email.split('@')[0],
              email,
              role,
              avatar: '👤',
              status: 'offline'
          }
      });
  };

  const handleLogout = async () => {
      await signOut();
      dispatch({ type: 'SET_USER', payload: null });
      addToast("Logged out", "info");
  };

  return (
    <header className="h-14 flex justify-between items-center px-4 bg-[#0b0e14] border-b border-glass-border z-50 flex-shrink-0">
      {showShare && (
          <ShareModal 
            collaborators={state.projectData.collaborators || []} 
            onClose={() => setShowShare(false)}
            onInvite={handleInvite}
          />
      )}

      {showPlugins && (
          <PluginStore onClose={() => setShowPlugins(false)} />
      )}

      {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {showAuth && (
          <AuthModal onClose={() => setShowAuth(false)} />
      )}

      {showImport && (
          <ImportRepoModal onClose={() => setShowImport(false)} />
      )}

      <div className="flex items-center gap-4">
        {/* Mobile Menu Toggle */}
        <button 
            onClick={onToggleMobileMenu}
            className="sm:hidden text-white p-1"
            aria-label="Toggle Navigation Menu"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-primary rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight font-slashed-zero hidden sm:block">0relai</h1>
        </div>
        
        {/* Project Context */}
        <div className="h-6 w-px bg-glass-border mx-1 hidden sm:block"></div>
        <div className="flex items-center gap-2 text-sm">
            <span className="text-glass-text-secondary hidden sm:inline">Project:</span>
            <span className="text-white font-medium max-w-[150px] sm:max-w-[200px] truncate">{state.projectData.name}</span>
        </div>
      </div>

      {/* Center - Search Trigger */}
      <div className="hidden lg:flex items-center">
         <button 
           id="cmd-palette-trigger"
           onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
           className="flex items-center gap-3 bg-white/5 border border-white/5 hover:border-brand-primary/50 hover:bg-white/10 px-4 py-1.5 rounded-lg text-sm text-glass-text-secondary transition-all w-64 justify-between"
           aria-label="Search (Cmd+K)"
         >
            <span>Search...</span>
            <span className="flex items-center gap-1 text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-mono border border-white/5">
                <span>⌘</span><span>K</span>
            </span>
         </button>
      </div>

      <div className="flex items-center gap-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".json" 
          className="hidden" 
        />
        
        {/* Real-time Presence Avatars */}
        <PresenceAvatars users={state.onlineUsers} currentUserId={state.user?.id} />

        {/* Auth / User Status */}
        {isAuthenticated ? (
            <div className="flex items-center gap-2 mr-2">
                <div 
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-secondary to-brand-accent flex items-center justify-center text-xs font-bold text-white cursor-pointer border border-white/20 hover:border-white transition-colors"
                    onClick={handleLogout}
                    title="Sign Out"
                >
                    {state.user?.email?.charAt(0).toUpperCase()}
                </div>
            </div>
        ) : (
            <button 
                onClick={() => setShowAuth(true)}
                className="mr-2 px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-brand-primary/20 text-white border border-white/10 hover:border-brand-primary/50 rounded transition-all flex items-center gap-2"
            >
                <span>🔐</span> <span className="hidden sm:inline">Login</span>
            </button>
        )}

        <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block"></div>

        <button 
            onClick={() => setShowPlugins(true)}
            className="p-1.5 rounded transition-all bg-white/5 hover:bg-white/10 hover:text-white text-glass-text-secondary border border-transparent hover:border-white/10 mr-1 relative hidden sm:block"
            title="Plugin Store"
            aria-label="Open Plugin Store"
        >
            <span className="text-xs font-bold px-1">📦</span>
            {state.projectData.activePlugins && state.projectData.activePlugins.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
            )}
        </button>

        <button 
            onClick={() => setShowShare(true)}
            className="p-1.5 rounded transition-all bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary hover:text-white border border-brand-secondary/20 mr-2 hidden sm:block"
            title="Share Project"
            aria-label="Share Project"
        >
            <span className="text-xs font-bold px-1">Share</span>
        </button>
        
        <button 
            id="chat-toggle"
            onClick={onToggleChat}
            className={`p-1.5 rounded transition-all border flex items-center gap-2 px-3 ${isChatOpen ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white/5 text-glass-text-secondary border-white/5 hover:text-white'}`}
            title="Toggle Architect Assistant"
            aria-label="Toggle AI Assistant"
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            <span className="text-xs font-bold hidden sm:inline">Assistant</span>
        </button>

        <button
            id="settings-trigger"
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded transition-all hover:bg-white/10 hover:text-white text-glass-text-secondary"
            title="Settings"
            aria-label="Open Settings"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>

        <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block"></div>

        <div className="hidden sm:flex items-center bg-white/5 rounded-md border border-white/5 p-0.5">
            <button 
                onClick={() => setShowImport(true)}
                className="p-1.5 text-glass-text-secondary hover:text-white hover:bg-white/10 rounded transition-all"
                title="Import from GitHub"
            >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </button>
            <div className="w-px h-4 bg-white/10 mx-1"></div>
            <button 
                onClick={handleSaveTemplate}
                className="p-1.5 text-glass-text-secondary hover:text-white hover:bg-white/10 rounded transition-all"
                title="Save as Template"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            </button>
            <div className="w-px h-4 bg-white/10 mx-1"></div>
            <button 
                onClick={handleExport}
                className="p-1.5 text-glass-text-secondary hover:text-white hover:bg-white/10 rounded transition-all"
                title="Export Project JSON"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
        </div>

        <div className="relative hidden sm:block">
          <button 
            onClick={() => setShowGallery(!showGallery)}
            className="px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-glass-text rounded border border-white/10 transition-all flex items-center gap-2"
            aria-label="Saved Projects"
          >
            📂 Saved
          </button>

          {showGallery && (
            <div className="absolute right-0 top-full mt-2 w-72 glass-panel rounded-lg shadow-2xl p-4 animate-fade-in border-brand-accent/20 border overflow-hidden z-[100]">
               <div className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider mb-3 px-2">Local Blueprints</div>
               <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                  {state.projectsList.length === 0 ? (
                    <div className="text-center py-6 text-glass-text-secondary text-sm italic">No projects saved.</div>
                  ) : (
                    state.projectsList.sort((a,b) => b.lastUpdated - a.lastUpdated).map(p => (
                      <div 
                        key={p.id}
                        onClick={() => handleLoadProject(p.id)}
                        className={`group flex items-center justify-between p-2 rounded cursor-pointer transition-all ${state.projectData.id === p.id ? 'bg-brand-primary/20 border-brand-primary/30 border' : 'hover:bg-white/5 border border-transparent'}`}
                      >
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-semibold text-white truncate">{p.name}</span>
                          <span className="text-[10px] text-glass-text-secondary flex items-center gap-1">
                              {new Date(p.lastUpdated).toLocaleDateString()}
                              {/* Source Icon */}
                              <span title={p.source === 'cloud' || p.source === 'byob' ? 'Synced to Cloud' : 'Local Only'}>
                                  {p.source === 'cloud' || p.source === 'byob' ? '☁️' : '💻'}
                              </span>
                          </span>
                        </div>
                        <button 
                          onClick={(e) => handleDelete(e, p.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-all"
                          aria-label={`Delete ${p.name}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
          className="px-3 py-1.5 text-xs font-bold bg-brand-primary hover:bg-brand-secondary text-white rounded transition-all flex items-center gap-1"
          aria-label="New Project"
        >
          <span>+</span> <span className="hidden sm:inline">New</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
