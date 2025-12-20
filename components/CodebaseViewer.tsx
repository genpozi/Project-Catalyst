
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ProjectData } from '../types';
import { buildVirtualFileSystem, VirtualFile } from '../utils/projectFileSystem';
import CodeEditor from './CodeEditor';
import { cliSync } from '../utils/CLISyncService';
import { ghSync } from '../utils/githubSync';
import { useProject } from '../ProjectContext';
import { useToast } from './Toast';
import VirtualList from './VirtualList';

interface CodebaseViewerProps {
  projectData: ProjectData;
  onFileUpdate?: (path: string, content: string) => void;
}

const CodebaseViewer: React.FC<CodebaseViewerProps> = ({ projectData, onFileUpdate }) => {
  const { state, dispatch } = useProject();
  const { addToast } = useToast();
  const [selectedFile, setSelectedFile] = useState<VirtualFile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const fileSystem = useMemo(() => buildVirtualFileSystem(projectData), [projectData]);

  const filteredFiles = useMemo(() => fileSystem.filter(f => 
    f.path.toLowerCase().includes(searchTerm.toLowerCase())
  ), [fileSystem, searchTerm]);

  // Select first file on load if none selected
  useEffect(() => {
    if (filteredFiles.length > 0 && !selectedFile) {
      const initFile = filteredFiles[0];
      setSelectedFile(initFile);
      setEditedContent(initFile.content);
      setHasUnsavedChanges(false);
    }
  }, [filteredFiles, selectedFile]);

  // Handle file switching
  const handleFileSelect = (file: VirtualFile) => {
      if (hasUnsavedChanges) {
          if (!confirm("You have unsaved changes. Discard them?")) return;
      }
      setSelectedFile(file);
      setEditedContent(file.content);
      setHasUnsavedChanges(false);
  };

  // Handle content editing
  const handleContentChange = (newContent: string) => {
      setEditedContent(newContent);
      setHasUnsavedChanges(newContent !== selectedFile?.content);
  };

  // Handle Save
  const handleSave = () => {
      if (selectedFile && onFileUpdate) {
          onFileUpdate(selectedFile.path, editedContent);
          setHasUnsavedChanges(false);
          // Optimistically update the selected file ref so diff check works
          setSelectedFile({ ...selectedFile, content: editedContent, source: 'editor' });
      }
  };

  // Handle Push to Disk via CLI
  const handlePushToDisk = () => {
      if (!selectedFile || state.syncStatus !== 'connected') return;
      
      // Save internal state first
      if (hasUnsavedChanges) handleSave();

      cliSync.writeFile(selectedFile.path, editedContent);
      addToast(`Syncing ${selectedFile.path} to disk...`, 'info');
  };

  // Handle Pull from GitHub
  const handlePullFromGitHub = async () => {
      const config = projectData.githubConfig;
      if (!config) return;
      
      setIsPulling(true);
      try {
          // 1. Fetch fresh tree
          const newTree = await ghSync.getRepoTree(config.repoOwner, config.repoName, config.branch);
          
          // 2. Fetch content of CURRENTLY OPEN file if it exists in new tree
          if (selectedFile) {
              const freshContent = await ghSync.getFileContent(config.repoOwner, config.repoName, selectedFile.path);
              if (freshContent && freshContent !== editedContent) {
                  if (confirm(`Remote content for ${selectedFile.path} has changed. Overwrite local changes?`)) {
                      setEditedContent(freshContent);
                      setHasUnsavedChanges(false); // Accepted remote as truth
                  }
              }
          }

          // 3. Update Project Structure
          dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { fileStructure: newTree } });
          addToast("Synced with GitHub repository.", "success");
      } catch (e: any) {
          addToast(`Pull failed: ${e.message}`, "error");
      } finally {
          setIsPulling(false);
      }
  };

  // Keyboard shortcut for save
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 's') {
              e.preventDefault();
              handleSave();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editedContent, selectedFile, onFileUpdate]);

  const getSourceColor = (source: string) => {
      switch(source) {
          case 'task': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
          case 'generator': return 'text-green-400 bg-green-400/10 border-green-400/20';
          case 'editor': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
          default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
      }
  };

  const getSourceLabel = (source: string) => {
      switch(source) {
          case 'task': return 'Agent Task';
          case 'generator': return 'Auto-Gen';
          case 'editor': return 'Manual Override';
          case 'scaffold': return 'Scaffold';
          default: return source;
      }
  };

  // Renderer for VirtualList
  const renderRow = (file: VirtualFile, style: React.CSSProperties) => (
      <div 
          style={style}
          className="px-2" // Padding for the row content inside the absolute container
      >
        <div 
            onClick={() => handleFileSelect(file)}
            className={`group px-3 py-1.5 rounded-lg cursor-pointer flex items-center justify-between transition-all h-full ${
                selectedFile?.path === file.path 
                ? 'bg-brand-primary/20 text-white' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
        >
            <div className="flex items-center gap-2 overflow-hidden">
                <svg className="w-4 h-4 flex-shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="text-xs font-mono truncate" title={file.path}>{file.path}</span>
            </div>
            {file.source !== 'scaffold' && (
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border ${getSourceColor(file.source)}`}>
                    {getSourceLabel(file.source).charAt(0)}
                </span>
            )}
        </div>
      </div>
  );

  return (
    <div className="flex h-[600px] bg-[#0b0e14] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
      {/* Sidebar: File List */}
      <div className="w-72 flex-shrink-0 bg-slate-900/50 border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider">Project Files ({fileSystem.length})</h3>
                {projectData.githubConfig && (
                    <button 
                        onClick={handlePullFromGitHub}
                        disabled={isPulling}
                        className="text-[10px] bg-slate-800 hover:bg-white/10 text-white px-2 py-1 rounded transition-colors flex items-center gap-1"
                        title="Pull latest changes from GitHub"
                    >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                        {isPulling ? '...' : 'Pull'}
                    </button>
                )}
            </div>
            <input 
                type="text" 
                placeholder="Search files..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0f172a] border border-glass-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary transition-all"
            />
        </div>
        
        <div className="flex-grow overflow-hidden">
            {filteredFiles.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-600">No matching files.</div>
            ) : (
                <VirtualList 
                    items={filteredFiles}
                    itemHeight={36} // 32px height + 4px vertical padding/margin assumption
                    renderItem={renderRow}
                    className="h-full custom-scrollbar"
                />
            )}
        </div>

        <div className="p-2 border-t border-white/5 bg-black/20 flex justify-between text-[9px] text-slate-500 px-4">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Task</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> System</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> User</span>
        </div>
      </div>

      {/* Main: Code View */}
      <div className="flex-grow flex flex-col bg-[#0b0e14] relative">
        {selectedFile ? (
            <>
                <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#151b26]">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-slate-200 font-bold">{selectedFile.path}</span>
                        {hasUnsavedChanges && (
                            <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20 animate-pulse">Unsaved Changes</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {state.syncStatus === 'connected' && (
                            <button
                                onClick={handlePushToDisk}
                                className="text-[10px] flex items-center gap-1 bg-green-900/20 hover:bg-green-900/40 text-green-400 border border-green-800 px-2 py-1 rounded transition-all"
                                title="Write to local disk via CLI"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                Sync to Disk
                            </button>
                        )}
                        
                        <div className="h-4 w-px bg-white/10 mx-1"></div>

                        {onFileUpdate && (
                            <button 
                                onClick={handleSave}
                                disabled={!hasUnsavedChanges}
                                className={`text-xs px-4 py-1.5 rounded font-bold transition-all ${
                                    hasUnsavedChanges 
                                    ? 'bg-brand-primary text-white hover:bg-brand-secondary shadow-lg' 
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                            >
                                Save (Cmd+S)
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-grow overflow-hidden relative">
                    <CodeEditor 
                        value={editedContent || ''}
                        onChange={handleContentChange}
                        readOnly={!onFileUpdate}
                        language={selectedFile.path.split('.').pop()}
                    />
                </div>
            </>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <div className="text-4xl mb-4">📂</div>
                <p>Select a file to edit code.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default CodebaseViewer;
