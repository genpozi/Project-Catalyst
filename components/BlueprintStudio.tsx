
import React, { useState, useEffect } from 'react';
import { ProjectData, Snapshot } from '../types';
import ArchitectureView from './ArchitectureView';
import DataModelView from './DataModelView';
import FileStructureView from './FileStructureView';
import DesignSystemView from './DesignSystemView';
import ApiSpecView from './ApiSpecView';
import SecurityView from './SecurityView';
import MarkdownRenderer from './MarkdownRenderer';
import { GeminiService } from '../GeminiService';
import { useProject } from '../ProjectContext';

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
}> = ({ snapshots, onClose, onRestore, onCreate, onDelete }) => {
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
                                            onClick={() => { if(window.confirm('Restore this version? Current unsaved changes will be lost.')) onRestore(snap.id); }}
                                            className="px-3 py-1.5 text-xs bg-brand-primary hover:bg-brand-accent text-white rounded-lg transition-colors font-bold"
                                        >
                                            Restore
                                        </button>
                                        <button 
                                            onClick={() => onDelete(snap.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
  const { dispatch } = useProject();
  const [activeTab, setActiveTab] = useState<Tab>('Architecture');
  const [isEditing, setIsEditing] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [healthReport, setHealthReport] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);

  const gemini = React.useMemo(() => new GeminiService(), []);

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
    if (!refinePrompt.trim() || isRefining) return;
    await onRefine(activeTab, refinePrompt);
    setRefinePrompt('');
  };

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true);
    setHealthReport(null);
    try {
      const report = await gemini.runProjectHealthCheck(projectData);
      setHealthReport(report);
    } catch (e) {
      setHealthReport("Health check failed. Ensure all blueprint segments are generated.");
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleCreateSnapshot = (name: string, desc: string) => {
      dispatch({ type: 'CREATE_SNAPSHOT', payload: { name, description: desc } });
  };

  const handleRestoreSnapshot = (id: string) => {
      dispatch({ type: 'RESTORE_SNAPSHOT', payload: id });
      setShowSnapshots(false);
  };

  const handleDeleteSnapshot = (id: string) => {
      dispatch({ type: 'DELETE_SNAPSHOT', payload: id });
  };

  const tabs: Tab[] = ['Architecture', 'Data Model', 'Files', 'UI/UX', 'API', 'Security'];

  return (
    <div className="animate-slide-in-up h-full flex flex-col">
      {showSnapshots && (
          <SnapshotModal 
             snapshots={projectData.snapshots || []}
             onClose={() => setShowSnapshots(false)}
             onCreate={handleCreateSnapshot}
             onRestore={handleRestoreSnapshot}
             onDelete={handleDeleteSnapshot}
          />
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Blueprint Studio</h2>
          <p className="text-glass-text-secondary text-sm">Refine your specifications before agent rule generation.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSnapshots(true)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-lg border border-white/10 transition-all flex items-center gap-2"
          >
            <span>🕰️ History</span>
            {projectData.snapshots && projectData.snapshots.length > 0 && (
                <span className="bg-brand-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">{projectData.snapshots.length}</span>
            )}
          </button>
          <button
            onClick={handleHealthCheck}
            disabled={isCheckingHealth}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-brand-accent text-sm font-bold rounded-lg border border-brand-accent/20 transition-all flex items-center gap-2"
          >
            {isCheckingHealth ? <div className="w-4 h-4 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div> : <span>🛡️ Health Check</span>}
          </button>
          <button
            onClick={onContinue}
            className="px-6 py-2 glass-button-primary text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all flex items-center gap-2"
          >
            <span>Proceed to Rules</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-grow min-h-[600px] relative">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-56 flex-shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setHealthReport(null); }}
              disabled={isRefining}
              className={`px-4 py-3 rounded-xl text-left font-medium transition-all whitespace-nowrap border ${
                activeTab === tab
                  ? 'bg-brand-primary/20 text-brand-accent border-brand-primary/30 shadow-lg'
                  : 'bg-white/5 text-glass-text-secondary border-transparent hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col glass-panel rounded-2xl border-white/5 overflow-hidden relative shadow-inner">
          {isRefining && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col">
                <div className="w-12 h-12 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-brand-accent font-bold animate-pulse uppercase tracking-widest text-xs">Architect is Thinking...</p>
            </div>
          )}

          {/* Toolbar */}
          <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between items-center">
             <span className="text-xs font-bold text-glass-text-secondary uppercase tracking-widest">{activeTab} Layer</span>
             <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1">
                <button 
                  onClick={() => setIsEditing(false)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${!isEditing ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
                >
                  Visual
                </button>
                <button 
                  onClick={() => setIsEditing(true)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${isEditing ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
                >
                  Code
                </button>
             </div>
          </div>

          <div className="flex-grow p-6 overflow-y-auto custom-scrollbar relative">
             {healthReport ? (
               <div className="animate-fade-in bg-brand-primary/10 border border-brand-primary/30 p-6 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-brand-accent">Integrity Scan Results</h3>
                    <button onClick={() => setHealthReport(null)} className="text-glass-text-secondary hover:text-white">Close</button>
                  </div>
                  <MarkdownRenderer content={healthReport} />
               </div>
             ) : isEditing ? (
               <div className="h-full flex flex-col">
                 <textarea
                    value={jsonContent}
                    onChange={handleJsonChange}
                    className="flex-grow w-full bg-black/40 text-blue-200 font-mono text-sm p-4 rounded-xl border border-white/10 focus:border-brand-accent focus:outline-none resize-none shadow-inner"
                    spellCheck={false}
                 />
                 {jsonError && (
                    <div className="mt-2 bg-red-900/40 text-red-200 px-4 py-2 rounded-lg text-xs border border-red-700/50 animate-pulse">
                        Syntax Warning: {jsonError}
                    </div>
                 )}
               </div>
             ) : (
                <div className="h-full flex flex-col">
                  {activeTab === 'Architecture' && <ArchitectureView architecture={projectData.architecture} onContinue={() => {}} hideActions={true} />}
                  {activeTab === 'Data Model' && <DataModelView data={projectData.schema} onContinue={() => {}} hideActions={true} />}
                  {activeTab === 'Files' && <FileStructureView structure={projectData.fileStructure} onContinue={() => {}} hideActions={true} />}
                  {activeTab === 'UI/UX' && <DesignSystemView designSystem={projectData.designSystem} onContinue={() => {}} hideActions={true} />}
                  {activeTab === 'API' && <ApiSpecView apiSpec={projectData.apiSpec} onContinue={() => {}} hideActions={true} />}
                  {activeTab === 'Security' && <SecurityView securityContext={projectData.securityContext} onContinue={() => {}} hideActions={true} />}
                </div>
             )}
          </div>

          {/* AI Refinement Bar */}
          <div className="bg-white/5 border-t border-white/5 p-4">
             <form onSubmit={handleRefineSubmit} className="flex gap-2">
                <input 
                    type="text" 
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    placeholder={`Instruct Architect to refine the ${activeTab} layer...`}
                    className="flex-grow glass-input rounded-xl px-4 py-3 text-white focus:outline-none placeholder-white/20"
                />
                <button 
                    type="submit" 
                    disabled={!refinePrompt.trim() || isRefining}
                    className="glass-button-primary hover:scale-105 disabled:opacity-50 disabled:grayscale text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg"
                >
                    {isRefining ? 'Thinking...' : <span>✨ Refine</span>}
                </button>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlueprintStudio;
