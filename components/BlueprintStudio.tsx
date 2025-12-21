
import React, { useState, useEffect } from 'react';
import { ProjectData, Snapshot, Comment } from '../types';
import ArchitectureView from './ArchitectureView';
import DataModelView from './DataModelView';
import FileStructureView from './FileStructureView';
import DesignSystemView from './DesignSystemView';
import ApiSpecView from './ApiSpecView';
import SecurityView from './SecurityView';
import CommentsPanel from './CommentsPanel';
import MarkdownRenderer from './MarkdownRenderer';
import { GeminiService } from '../GeminiService';
import { useProject } from '../ProjectContext';
import { useToast } from './Toast';
import DiffViewer from './DiffViewer';

interface BlueprintStudioProps {
  projectData: ProjectData;
  onUpdate: (data: Partial<ProjectData>) => void;
  onRefine: (section: string, feedback: string) => Promise<void>;
  onContinue: () => void;
  isRefining: boolean;
}

type Tab = 'Architecture' | 'Data Model' | 'Files' | 'UI/UX' | 'API' | 'Security';

const SnapshotModal: React.FC<{ 
    snapshots: Snapshot[]; 
    onClose: () => void; 
    onRestore: (id: string) => void; 
    onCreate: (name: string, description: string) => void;
    onDelete: (id: string) => void;
    onCompare: (snapshot: Snapshot) => void;
}> = ({ snapshots, onClose, onRestore, onCreate, onDelete, onCompare }) => {
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-in-up">
                 <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                     <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>🕰️</span> Version History
                     </h3>
                     <button onClick={onClose} className="text-glass-text-secondary hover:text-white">✕</button>
                 </div>
                 
                 <div className="p-6 bg-slate-900 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-4">
                     {/* Create New */}
                     <div className="bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-brand-accent mb-3 uppercase tracking-wider">Create New Snapshot</h4>
                        <div className="flex gap-3">
                            <input 
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Snapshot Name (e.g. 'Before API Change')"
                                className="flex-grow glass-input rounded-lg px-3 py-2 text-sm"
                            />
                            <input 
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                placeholder="Description (Optional)"
                                className="flex-grow glass-input rounded-lg px-3 py-2 text-sm"
                            />
                            <button 
                                onClick={() => { if(newName) { onCreate(newName, newDesc); setNewName(''); setNewDesc(''); } }}
                                disabled={!newName}
                                className="bg-brand-secondary hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
                            >
                                Save
                            </button>
                        </div>
                     </div>

                     {/* List */}
                     <div className="space-y-3">
                        {snapshots.length === 0 ? (
                            <div className="text-center text-slate-500 py-4 italic">No snapshots saved yet.</div>
                        ) : (
                            snapshots.sort((a,b) => b.timestamp - a.timestamp).map(snap => (
                                <div key={snap.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center group hover:bg-white/10 transition-all">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-white">{snap.name}</span>
                                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-glass-text-secondary">
                                                {new Date(snap.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-glass-text-secondary mt-1">{snap.description || 'No description'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => onCompare(snap)}
                                            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-bold flex items-center gap-1"
                                        >
                                            <span className="text-base">⚖️</span> Compare
                                        </button>
                                        <button 
                                            onClick={() => { if(window.confirm('Restore this version? Current unsaved changes will be lost.')) onRestore(snap.id); }}
                                            className="px-3 py-1.5 text-xs bg-brand-primary hover:bg-brand-accent text-white rounded-lg transition-colors font-bold"
                                        >
                                            Restore
                                        </button>
                                        <button 
                                            onClick={() => onDelete(snap.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                     </div>
                 </div>
             </div>
        </div>
    );
};

const BlueprintStudio: React.FC<BlueprintStudioProps> = ({ projectData, onUpdate, onRefine, onContinue, isRefining }) => {
  const { dispatch, currentRole } = useProject();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<Tab>('Architecture');
  const [mode, setMode] = useState<'visual' | 'code' | 'diff'>('visual');
  const [jsonContent, setJsonContent] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [healthReport, setHealthReport] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [isFixingJson, setIsFixingJson] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [compareSnapshot, setCompareSnapshot] = useState<Snapshot | null>(null);
  const [focusMode, setFocusMode] = useState(false);

  const gemini = React.useMemo(() => new GeminiService(), []);
  
  // RBAC Enforcement
  const isReadOnly = currentRole === 'Viewer';

  const getDataKey = (tab: Tab): keyof ProjectData => {
    switch (tab) {
      case 'Architecture': return 'architecture';
      case 'Data Model': return 'schema';
      case 'Files': return 'fileStructure';
      case 'UI/UX': return 'designSystem';
      case 'API': return 'apiSpec';
      case 'Security': return 'securityContext';
      default: return 'architecture';
    }
  };

  useEffect(() => {
    const data = projectData[getDataKey(activeTab)];
    setJsonContent(JSON.stringify(data, null, 2) || '');
    setJsonError(null);
  }, [activeTab, projectData]);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    setJsonContent(e.target.value);
    try {
      const parsed = JSON.parse(e.target.value);
      setJsonError(null);
      onUpdate({ [getDataKey(activeTab)]: parsed });
    } catch (err) {
      setJsonError((err as Error).message);
    }
  };

  const handleRefineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinePrompt.trim() || isRefining || isReadOnly) return;
    addToast("Refining blueprint...", "info");
    await onRefine(activeTab, refinePrompt);
    addToast("Refinement complete!", "success");
    setRefinePrompt('');
  };

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true);
    setHealthReport(null);
    try {
      const report = await gemini.runProjectHealthCheck(projectData);
      setHealthReport(report);
      addToast("Health check completed", "success");
    } catch (e) {
      setHealthReport("Health check failed. Ensure all blueprint segments are generated.");
      addToast("Health check failed", "error");
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleCreateSnapshot = (name: string, desc: string) => {
      if (isReadOnly) return;
      dispatch({ type: 'CREATE_SNAPSHOT', payload: { name, description: desc } });
      addToast(`Snapshot '${name}' saved`, "success");
  };

  const handleRestoreSnapshot = (id: string) => {
      if (isReadOnly) return;
      dispatch({ type: 'RESTORE_SNAPSHOT', payload: id });
      setShowSnapshots(false);
      setCompareSnapshot(null);
      setMode('visual');
      addToast("Version restored successfully", "success");
  };

  const handleDeleteSnapshot = (id: string) => {
      if (isReadOnly) return;
      dispatch({ type: 'DELETE_SNAPSHOT', payload: id });
      addToast("Snapshot deleted", "info");
  };

  const handleCompareSnapshot = (snapshot: Snapshot) => {
      setCompareSnapshot(snapshot);
      setMode('diff');
      setShowSnapshots(false);
      addToast(`Comparing with ${snapshot.name}`, "info");
  };

  const handleAutoFixJson = async () => {
      if(!jsonContent || !jsonError || isReadOnly) return;
      setIsFixingJson(true);
      try {
          const fixed = await gemini.fixJson(jsonContent);
          setJsonContent(JSON.stringify(fixed, null, 2));
          setJsonError(null);
          onUpdate({ [getDataKey(activeTab)]: fixed });
          addToast("JSON repaired automatically", "success");
      } catch (e) {
          addToast('Could not fix JSON automatically.', "error");
      } finally {
          setIsFixingJson(false);
      }
  };

  const handleAddComment = (text: string, section: string) => {
      const newComment: Comment = {
          id: Date.now().toString(),
          text,
          author: projectData.collaborators?.[0]?.name || 'You',
          avatar: projectData.collaborators?.[0]?.avatar || '👤',
          timestamp: Date.now(),
          section,
          resolved: false
      };
      dispatch({ type: 'ADD_COMMENT', payload: newComment });
      addToast("Comment added", "success");
  };

  const handleResolveComment = (id: string) => {
      dispatch({ type: 'RESOLVE_COMMENT', payload: id });
  };

  const tabs: Tab[] = ['Architecture', 'Data Model', 'Files', 'UI/UX', 'API', 'Security'];
  const activeCommentCount = projectData.comments?.filter(c => c.section === activeTab && !c.resolved).length || 0;

  // For diff mode
  const currentJson = JSON.stringify(projectData[getDataKey(activeTab)], null, 2) || '';
  const compareJson = compareSnapshot ? JSON.stringify(compareSnapshot.data[getDataKey(activeTab)], null, 2) || '' : '';

  return (
    <div className={`animate-fade-in h-full flex flex-col ${focusMode ? 'fixed inset-0 z-[100] bg-[#0b0e14] p-6' : ''}`}>
      {showSnapshots && (
          <SnapshotModal 
             snapshots={projectData.snapshots || []}
             onClose={() => setShowSnapshots(false)}
             onCreate={handleCreateSnapshot}
             onRestore={handleRestoreSnapshot}
             onDelete={handleDeleteSnapshot}
             onCompare={handleCompareSnapshot}
          />
      )}

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
              Blueprint Studio
              {isReadOnly && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-normal">Viewer Mode</span>}
          </h2>
          <p className="text-xs text-glass-text-secondary">Refine your specifications before agent rule generation.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${focusMode ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
            title="Toggle Focus Mode"
          >
            {focusMode ? 'Exit Focus' : 'Focus Mode'}
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 ${showComments ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
          >
            <span>💬 Comments</span>
            {activeCommentCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full">{activeCommentCount}</span>
            )}
          </button>
          {!isReadOnly && (
              <button
                onClick={() => setShowSnapshots(true)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg border border-white/10 transition-all flex items-center gap-2"
              >
                <span>🕰️ History</span>
                {projectData.snapshots && projectData.snapshots.length > 0 && (
                    <span className="bg-brand-primary text-white text-[9px] px-1.5 rounded-full">{projectData.snapshots.length}</span>
                )}
              </button>
          )}
          <button
            onClick={handleHealthCheck}
            disabled={isCheckingHealth}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-brand-accent text-xs font-bold rounded-lg border border-brand-accent/20 transition-all flex items-center gap-2"
          >
            {isCheckingHealth ? <div className="w-3 h-3 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div> : <span>🛡️ Check</span>}
          </button>
          {!focusMode && !isReadOnly && (
            <button
                onClick={onContinue}
                className="px-4 py-1.5 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-lg shadow-lg transition-all flex items-center gap-2"
            >
                <span>Generate Rules</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-grow min-h-0 overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-48 flex-shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto lg:h-full pb-2 lg:pb-0 custom-scrollbar bg-[#0b0e14] rounded-xl border border-white/5 p-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setHealthReport(null); if(mode === 'diff') setMode('visual'); }}
              disabled={isRefining}
              className={`px-3 py-2 rounded-lg text-left text-xs font-bold transition-all whitespace-nowrap border flex justify-between items-center ${
                activeTab === tab
                  ? 'bg-brand-primary/20 text-brand-accent border-brand-primary/30 shadow-lg'
                  : 'bg-transparent text-glass-text-secondary border-transparent hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab}
              {projectData.comments?.some(c => c.section === tab && !c.resolved) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              )}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col bg-[#0b0e14] rounded-xl border border-white/5 overflow-hidden relative shadow-inner">
          {isRefining && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col">
                <div className="w-10 h-10 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-brand-accent font-bold animate-pulse uppercase tracking-widest text-xs">Architect is Thinking...</p>
            </div>
          )}

          {/* Toolbar */}
          <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between items-center flex-shrink-0">
             <div className="flex items-center gap-3">
                 <span className="text-xs font-bold text-glass-text-secondary uppercase tracking-widest">{activeTab} Layer</span>
                 {mode === 'diff' && compareSnapshot && (
                     <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white flex items-center gap-1">
                         Comparing vs <span className="font-bold">{compareSnapshot.name}</span>
                         <button onClick={() => { setMode('visual'); setCompareSnapshot(null); }} className="ml-1 hover:text-red-400">✕</button>
                     </span>
                 )}
             </div>
             
             <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1">
                <button 
                  onClick={() => { setMode('visual'); setCompareSnapshot(null); }}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${mode === 'visual' ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
                >
                  Visual
                </button>
                <button 
                  onClick={() => { setMode('code'); setCompareSnapshot(null); }}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${mode === 'code' ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
                >
                  Code
                </button>
                {mode === 'diff' && (
                    <button 
                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all bg-brand-primary text-white shadow`}
                    >
                      Diff
                    </button>
                )}
             </div>
          </div>

          <div className="flex-grow overflow-hidden relative">
             {healthReport ? (
               <div className="h-full overflow-y-auto p-6 animate-fade-in bg-brand-primary/10 border border-brand-primary/30 m-4 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-brand-accent">Integrity Scan Results</h3>
                    <button onClick={() => setHealthReport(null)} className="text-glass-text-secondary hover:text-white">Close</button>
                  </div>
                  <MarkdownRenderer content={healthReport} />
               </div>
             ) : mode === 'code' ? (
               <div className="h-full flex flex-col relative bg-[#0b0e14] overflow-hidden">
                 <div className="absolute top-0 left-0 bottom-0 w-8 bg-white/5 border-r border-white/5 flex flex-col items-center pt-4 text-[10px] text-glass-text-secondary font-mono select-none pointer-events-none z-10">
                     {/* Fake Line Numbers */}
                     {Array.from({length: 30}).map((_, i) => <div key={i}>{i+1}</div>)}
                 </div>
                 <textarea
                    value={jsonContent}
                    onChange={handleJsonChange}
                    readOnly={isReadOnly}
                    className={`flex-grow w-full bg-transparent text-blue-200 font-mono text-xs p-4 pl-10 focus:outline-none resize-none leading-relaxed custom-scrollbar ${isReadOnly ? 'cursor-not-allowed opacity-80' : ''}`}
                    spellCheck={false}
                 />
                 {jsonError && (
                    <div className="absolute bottom-4 right-4 bg-red-900/90 text-red-200 px-4 py-2 rounded-lg text-xs border border-red-700/50 animate-pulse backdrop-blur flex items-center gap-3 z-20">
                        <span>Syntax Warning: {jsonError}</span>
                        {!isReadOnly && (
                            <button 
                                onClick={handleAutoFixJson}
                                disabled={isFixingJson}
                                className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-[10px] uppercase font-bold border border-white/20"
                            >
                                {isFixingJson ? 'Fixing...' : 'Auto-Fix'}
                            </button>
                        )}
                    </div>
                 )}
               </div>
             ) : mode === 'diff' ? (
                 <div className="h-full animate-fade-in p-4">
                     <DiffViewer oldCode={compareJson} newCode={currentJson} />
                 </div>
             ) : (
                <div className="h-full flex flex-col overflow-hidden">
                  {activeTab === 'Architecture' && <ArchitectureView architecture={projectData.architecture} onContinue={() => {}} hideActions={true} readOnly={isReadOnly} />}
                  {activeTab === 'Data Model' && <DataModelView data={projectData.schema} onContinue={() => {}} hideActions={true} readOnly={isReadOnly} />}
                  {activeTab === 'Files' && <FileStructureView structure={projectData.fileStructure} onContinue={() => {}} hideActions={true} readOnly={isReadOnly} />}
                  {activeTab === 'UI/UX' && <DesignSystemView designSystem={projectData.designSystem} onContinue={() => {}} hideActions={true} readOnly={isReadOnly} />}
                  {activeTab === 'API' && <ApiSpecView apiSpec={projectData.apiSpec} onContinue={() => {}} hideActions={true} readOnly={isReadOnly} />}
                  {activeTab === 'Security' && <SecurityView securityContext={projectData.securityContext} onContinue={() => {}} hideActions={true} readOnly={isReadOnly} />}
                </div>
             )}
          </div>

          {/* AI Refinement Bar */}
          {mode === 'visual' && !isReadOnly && (
              <div className="bg-white/5 border-t border-white/5 p-3 flex-shrink-0">
                 <form onSubmit={handleRefineSubmit} className="flex gap-2">
                    <input 
                        type="text" 
                        value={refinePrompt}
                        onChange={(e) => setRefinePrompt(e.target.value)}
                        placeholder={`Instruct Architect to refine the ${activeTab} layer...`}
                        className="flex-grow glass-input rounded-lg px-3 py-2 text-xs text-white focus:outline-none placeholder-white/20"
                    />
                    <button 
                        type="submit" 
                        disabled={!refinePrompt.trim() || isRefining}
                        className="bg-brand-primary hover:bg-brand-secondary disabled:opacity-50 disabled:grayscale text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
                    >
                        {isRefining ? 'Thinking...' : <span>✨ Refine</span>}
                    </button>
                 </form>
              </div>
          )}
        </div>

        {/* Comments Sidebar */}
        {showComments && (
            <CommentsPanel 
                section={activeTab}
                comments={projectData.comments || []}
                currentUser={projectData.collaborators?.[0] || { id: 'me', name: 'You', email: '', role: 'Owner', avatar: '😎', status: 'active' }}
                onAddComment={handleAddComment}
                onResolveComment={handleResolveComment}
                onClose={() => setShowComments(false)}
            />
        )}
      </div>
    </div>
  );
};

export default BlueprintStudio;
