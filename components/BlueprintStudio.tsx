
import React, { useState, useEffect } from 'react';
import { ProjectData } from '../types';
import ArchitectureView from './ArchitectureView';
import DataModelView from './DataModelView';
import FileStructureView from './FileStructureView';
import DesignSystemView from './DesignSystemView';
import ApiSpecView from './ApiSpecView';
import SecurityView from './SecurityView';

interface BlueprintStudioProps {
  projectData: ProjectData;
  onUpdate: (data: Partial<ProjectData>) => void;
  onRefine: (section: string, feedback: string) => Promise<void>;
  onContinue: () => void;
  isRefining: boolean;
}

type Tab = 'Architecture' | 'Data Model' | 'Files' | 'UI/UX' | 'API' | 'Security';

const BlueprintStudio: React.FC<BlueprintStudioProps> = ({ projectData, onUpdate, onRefine, onContinue, isRefining }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Architecture');
  const [isEditing, setIsEditing] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState('');

  // Helper to map tab to data key
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
      // Live update the parent state
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

  const tabs: Tab[] = ['Architecture', 'Data Model', 'Files', 'UI/UX', 'API', 'Security'];
  const noOp = () => {};

  return (
    <div className="animate-slide-in-up h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-text">Blueprint Studio</h2>
          <p className="text-blue-200 text-sm">Review, refine, and edit your project specifications before compilation.</p>
        </div>
        <button
          onClick={onContinue}
          className="px-6 py-2 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105 flex items-center gap-2"
        >
          <span>Compile Agent Rules</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-grow min-h-[600px]">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              disabled={isRefining}
              className={`px-4 py-3 rounded-lg text-left font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-slate-700 text-brand-accent border-l-4 border-brand-secondary shadow-md'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden relative">
          {isRefining && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col">
                <div className="w-12 h-12 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-brand-accent font-bold animate-pulse">Refining {activeTab}...</p>
            </div>
          )}

          {/* Toolbar */}
          <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
             <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">{activeTab} View</span>
             <div className="flex items-center gap-2 bg-slate-900 rounded p-1">
                <button 
                  onClick={() => setIsEditing(false)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${!isEditing ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Visual
                </button>
                <button 
                  onClick={() => setIsEditing(true)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${isEditing ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Code (JSON)
                </button>
             </div>
          </div>

          <div className="flex-grow p-4 overflow-y-auto custom-scrollbar relative">
             {isEditing ? (
               <div className="h-full flex flex-col">
                 <textarea
                    value={jsonContent}
                    onChange={handleJsonChange}
                    className="flex-grow w-full bg-slate-950 text-blue-100 font-mono text-sm p-4 rounded border border-slate-800 focus:border-brand-accent focus:outline-none resize-none"
                    spellCheck={false}
                 />
                 {jsonError && (
                    <div className="mt-2 bg-red-900/80 text-red-200 px-4 py-2 rounded text-sm border border-red-700 animate-pulse">
                        Syntax Error: {jsonError}
                    </div>
                 )}
               </div>
             ) : (
                <div className="h-full flex flex-col">
                  {/* Views are rendered without the 'Continue' action to serve as a read/review only interface */}
                  {activeTab === 'Architecture' && <ArchitectureView architecture={projectData.architecture} onContinue={noOp} hideActions={true} />}
                  {activeTab === 'Data Model' && <DataModelView data={projectData.schema} onContinue={noOp} hideActions={true} />}
                  {activeTab === 'Files' && <FileStructureView structure={projectData.fileStructure} onContinue={noOp} hideActions={true} />}
                  {activeTab === 'UI/UX' && <DesignSystemView designSystem={projectData.designSystem} onContinue={noOp} hideActions={true} />}
                  {activeTab === 'API' && <ApiSpecView apiSpec={projectData.apiSpec} onContinue={noOp} hideActions={true} />}
                  {activeTab === 'Security' && <SecurityView securityContext={projectData.securityContext} onContinue={noOp} hideActions={true} />}
                </div>
             )}
          </div>

          {/* AI Refinement Bar */}
          <div className="bg-slate-800 border-t border-slate-700 p-4">
             <form onSubmit={handleRefineSubmit} className="flex gap-2">
                <input 
                    type="text" 
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    placeholder={`Tell AI how to improve the ${activeTab}... (e.g., "Add a dark mode toggle" or "Switch to PostgreSQL")`}
                    className="flex-grow bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-secondary placeholder-slate-500"
                />
                <button 
                    type="submit" 
                    disabled={!refinePrompt.trim() || isRefining}
                    className="bg-brand-secondary hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                >
                    {isRefining ? 'Thinking...' : (
                        <>
                            <span>✨ Refine</span>
                        </>
                    )}
                </button>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlueprintStudio;
