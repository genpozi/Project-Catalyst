
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ProjectProvider, useProject } from './ProjectContext';
import { GeminiService } from './GeminiService';
import { AppPhase, TaskStatus, Task, Phase as ProjectPhase } from './types';
import { ToastProvider, useToast } from './components/Toast';
import { upsertFileNode } from './utils/projectFileSystem';

import Header from './components/Header';
import Sidebar, { ActivityView } from './components/Sidebar';
import MobileMenu from './components/MobileMenu'; 
import { ProjectExplorer } from './components/ProjectExplorer';
import SearchPanel from './components/SearchPanel';
import { InspectorPanel } from './components/InspectorPanel';
import StatusBar from './components/StatusBar';
import CommandPalette from './components/CommandPalette';
import ArchitectChat from './components/ArchitectChat';
import IdeaInput from './components/IdeaInput';
import BrainstormingView from './components/BrainstormingView';
import KnowledgeBaseView from './components/KnowledgeBaseView';
import ResearchReport from './components/ResearchReport';
import ArchitectureView from './components/ArchitectureView';
import DataModelView from './components/DataModelView';
import FileStructureView from './components/FileStructureView';
import DesignSystemView from './components/DesignSystemView';
import ApiSpecView from './components/ApiSpecView';
import SecurityView from './components/SecurityView';
import BlueprintStudio from './components/BlueprintStudio';
import AgentRulesView from './components/AgentRulesView';
import ActionPlanView from './components/ActionPlanView';
import KanbanBoard from './components/KanbanBoard';
import SpecDocument from './components/SpecDocument';
import KickoffView from './components/KickoffView';
import LoadingSpinner from './components/LoadingSpinner';
import ShortcutsModal from './components/ShortcutsModal';
import ErrorBoundary from './components/ErrorBoundary';
import UpgradeModal from './components/UpgradeModal';
import OrganizationModal from './components/OrganizationModal';
import DevConsole from './components/DevConsole';
import PluginStore from './components/PluginStore';
import SettingsModal from './components/SettingsModal';
import OnboardingTour from './components/OnboardingTour';
import DocumentationView from './components/DocumentationView'; // Import Docs

const AppContent: React.FC = () => {
  const { state, dispatch } = useProject();
  const { addToast } = useToast();
  const [activeActivity, setActiveActivity] = useState<ActivityView>('EXPLORER');
  const [isRefining, setIsRefining] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [showDevConsole, setShowDevConsole] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const gemini = useMemo(() => new GeminiService(), []);

  // Auto-hide explorer on Dashboard (Vision Phase)
  useEffect(() => {
      if (state.currentPhase === AppPhase.IDEA) {
          setActiveActivity('NONE');
      } else if (activeActivity === 'NONE' && state.currentPhase !== AppPhase.IDEA) {
          // If moving away from dashboard, default to Explorer
          setActiveActivity('EXPLORER');
      }
  }, [state.currentPhase]);

  const handleError = useCallback((msg: string) => {
    dispatch({ type: 'SET_ERROR', payload: msg });
    dispatch({ type: 'SET_LOADING', payload: false });
    addToast(msg, 'error');
  }, [dispatch, addToast]);

  // Command Palette & Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
      if (e.key === '?' && !e.target?.toString().includes('Input') && !e.target?.toString().includes('TextArea')) {
          e.preventDefault();
          setIsShortcutsOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
          e.preventDefault();
          setShowDevConsole(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
          e.preventDefault();
          setShowInspector(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const runPhaseGenerator = async (phase: AppPhase, generator: () => Promise<any>, dataKey: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await generator();
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { [dataKey]: result } });
      dispatch({ type: 'SET_PHASE', payload: phase });
      addToast(`${phase} phase completed successfully.`, 'success');
    } catch (e: any) {
      handleError(`Failed to generate ${phase}: ${e.message}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleIdeaSubmit = (idea: string, type: string, constraints: string, imageBase64?: string) => {
    dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { initialIdea: idea, projectType: type, constraints, name: idea.substring(0, 30) } });
    runPhaseGenerator(AppPhase.BRAINSTORM, () => gemini.generateBrainstorming(idea, type, constraints, imageBase64), 'brainstormingResults');
  };

  const handleRefine = async (section: string, feedback: string) => {
    setIsRefining(true);
    try {
      const dataKeyMap: Record<string, string> = {
        'Brainstorming': 'brainstormingResults',
        'Research': 'researchReport',
        'Architecture': 'architecture',
        'Data Model': 'schema',
        'Files': 'fileStructure',
        'UI/UX': 'designSystem',
        'API': 'apiSpec',
        'Security': 'securityContext',
        'Plan': 'actionPlan'
      };
      const dataKey = dataKeyMap[section] || section.toLowerCase().replace(' ', '');
      const currentData = (state.projectData as any)[dataKey];
      const updated = await gemini.refineSection(section, currentData, feedback);
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { [dataKey]: updated } });
      addToast(`${section} updated based on feedback.`, 'success');
    } catch (e) {
      handleError(`Refining ${section} failed.`);
    } finally {
      setIsRefining(false);
    }
  };

  const handleRefineRules = async (feedback: string) => {
      setIsRefining(true);
      try {
          const updatedRules = await gemini.refineAgentRules(state.projectData.agentRules || '', feedback);
          dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { agentRules: updatedRules } });
          addToast("Rules updated.", 'success');
      } catch (e) {
          handleError('Refining rules failed.');
      } finally {
          setIsRefining(false);
      }
  };

  const handleGenerateGuide = async (taskId: string) => {
    try {
      const guide = await gemini.generateImplementationGuide(taskId, state.projectData);
      const updatedTasks = state.projectData.tasks?.map(t => t.id === taskId ? { ...t, implementationGuide: guide } : t);
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { tasks: updatedTasks } });
      addToast("Implementation guide generated.", 'success');
    } catch (e) {
      handleError("Failed to generate implementation guide.");
    }
  };

  const handleGenerateChecklist = async (taskId: string) => {
    try {
      const checklist = await gemini.generateChecklist(taskId, state.projectData);
      const updatedTasks = state.projectData.tasks?.map(t => t.id === taskId ? { ...t, checklist } : t);
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { tasks: updatedTasks } });
      addToast("Checklist generated.", 'success');
    } catch (e) {
      handleError("Failed to generate checklist.");
    }
  };

  const handleGenerateTaskCode = async (taskId: string) => {
    try {
      const snippet = await gemini.generateTaskCode(taskId, state.projectData);
      const updatedTasks = state.projectData.tasks?.map(t => t.id === taskId ? { ...t, codeSnippet: snippet } : t);
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { tasks: updatedTasks } });
      addToast("Code snippet forged.", 'success');
    } catch (e) {
        handleError("Failed to generate code snippet.");
    }
  };

  const handleRefineTaskCode = async (taskId: string, feedback: string) => {
      const task = state.projectData.tasks?.find(t => t.id === taskId);
      if(!task?.codeSnippet) return;
      
      try {
          const updatedSnippet = await gemini.refineTaskCode(task.codeSnippet, feedback, state.projectData);
          const updatedTasks = state.projectData.tasks?.map(t => t.id === taskId ? { ...t, codeSnippet: updatedSnippet } : t);
          dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { tasks: updatedTasks } });
          addToast("Code refined.", 'success');
      } catch (e) {
          handleError("Failed to refine code.");
      }
  };

  const handleCommitTaskCode = (taskId: string) => {
      const task = state.projectData.tasks?.find(t => t.id === taskId);
      if (!task?.codeSnippet?.filename || !task.codeSnippet.code) {
          handleError("Task has no code to commit.");
          return;
      }

      try {
          const currentFiles = state.projectData.fileStructure || [];
          const updatedFiles = upsertFileNode(currentFiles, task.codeSnippet.filename, task.codeSnippet.code);
          
          dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { fileStructure: updatedFiles } });
          addToast(`File ${task.codeSnippet.filename} saved to project structure.`, 'success');
      } catch (e) {
          handleError("Failed to commit file to project structure.");
      }
  };

  const renderPhase = () => {
    if (state.isLoading) return <LoadingSpinner />;
    if (state.error) return (
      <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in text-center">
        <div className="glass-panel p-8 rounded-xl border border-red-500/30 max-w-lg shadow-2xl">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-red-200 mb-3">Architectural Glitch</h3>
          <p className="text-glass-text-secondary mb-8">{state.error}</p>
          <button onClick={() => dispatch({ type: 'SET_ERROR', payload: null })} className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg font-bold text-white transition-all">Try Again</button>
        </div>
      </div>
    );

    const { projectData, currentPhase } = state;

    switch (currentPhase) {
      case AppPhase.IDEA: 
        return <IdeaInput onSubmit={handleIdeaSubmit} onAnalyzeAudio={gemini.analyzeAudioIdea.bind(gemini)} isAnalyzingAudio={false} />;
      case AppPhase.BRAINSTORM: 
        return <BrainstormingView data={projectData.brainstormingResults} onUpdate={(d) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { brainstormingResults: d } })} onContinue={() => dispatch({ type: 'SET_PHASE', payload: AppPhase.KNOWLEDGE_BASE })} onRefine={(f) => handleRefine('Brainstorming', f)} isRefining={isRefining} />;
      case AppPhase.KNOWLEDGE_BASE:
        return <KnowledgeBaseView projectData={projectData} onContinue={() => runPhaseGenerator(AppPhase.RESEARCH, () => gemini.generateResearch(projectData.initialIdea), 'researchReport')} />;
      case AppPhase.RESEARCH: 
        return <ResearchReport report={projectData.researchReport} onContinue={() => runPhaseGenerator(AppPhase.ARCHITECTURE, () => gemini.generateArchitecture(projectData), 'architecture')} onRefine={(f) => handleRefine('Research', f)} isRefining={isRefining} />;
      case AppPhase.ARCHITECTURE: 
        return <ArchitectureView architecture={projectData.architecture} onContinue={() => runPhaseGenerator(AppPhase.DATAMODEL, async () => {
          const cost = await gemini.generateCostEstimation(projectData);
          dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { costEstimation: cost } });
          return gemini.generateSchema(projectData);
        }, 'schema')} onRefine={(f) => handleRefine('Architecture', f)} isRefining={isRefining} />;
      case AppPhase.DATAMODEL: 
        return <DataModelView data={projectData.schema} onUpdate={(s) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { schema: s } })} onContinue={() => runPhaseGenerator(AppPhase.FILE_STRUCTURE, () => gemini.generateFileStructure(projectData), 'fileStructure')} onRefine={(f) => handleRefine('Data Model', f)} isRefining={isRefining} />;
      case AppPhase.FILE_STRUCTURE: 
        return <FileStructureView structure={projectData.fileStructure} architecture={projectData.architecture} onUpdate={(s) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { fileStructure: s } })} onContinue={() => runPhaseGenerator(AppPhase.UI_UX, () => gemini.generateDesignSystem(projectData), 'designSystem')} onRefine={(f) => handleRefine('Files', f)} isRefining={isRefining} />;
      case AppPhase.UI_UX: 
        return <DesignSystemView designSystem={projectData.designSystem} onContinue={() => runPhaseGenerator(AppPhase.API_SPEC, () => gemini.generateApiSpec(projectData), 'apiSpec')} onRefine={(f) => handleRefine('UI/UX', f)} isRefining={isRefining} />;
      case AppPhase.API_SPEC: 
        return <ApiSpecView apiSpec={projectData.apiSpec} onContinue={() => runPhaseGenerator(AppPhase.SECURITY, () => gemini.generateSecurityContext(projectData), 'securityContext')} onRefine={(f) => handleRefine('API', f)} isRefining={isRefining} />;
      case AppPhase.SECURITY: 
        return <SecurityView securityContext={projectData.securityContext} onUpdate={(ctx) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { securityContext: ctx } })} onContinue={() => dispatch({ type: 'SET_PHASE', payload: AppPhase.BLUEPRINT_STUDIO })} onRefine={(f) => handleRefine('Security', f)} isRefining={isRefining} />;
      case AppPhase.BLUEPRINT_STUDIO: 
        return <BlueprintStudio projectData={projectData} onUpdate={(d) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: d })} onRefine={handleRefine} onContinue={() => runPhaseGenerator(AppPhase.AGENT_RULES, () => gemini.generateAgentRules(projectData), 'agentRules')} isRefining={isRefining} />;
      case AppPhase.AGENT_RULES: 
        return <AgentRulesView rules={projectData.agentRules} onContinue={() => runPhaseGenerator(AppPhase.PLAN, () => gemini.generateActionPlan(projectData), 'actionPlan')} onRefine={handleRefineRules} isRefining={isRefining} />;
      case AppPhase.PLAN: 
        return <ActionPlanView plan={projectData.actionPlan || []} onContinue={(finalPlan) => {
          const tasks: Task[] = finalPlan.flatMap((p, i) => p.tasks.map((t, ti) => ({ ...t, id: `${i}-${ti}`, status: TaskStatus.TODO, phase: p.phase_name, content: t.description })));
          dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { actionPlan: finalPlan, tasks } });
          dispatch({ type: 'SET_PHASE', payload: AppPhase.WORKSPACE });
        }} onRefine={(f) => handleRefine('Plan', f)} isRefining={isRefining} />;
      case AppPhase.WORKSPACE: 
        return <KanbanBoard tasks={projectData.tasks || []} projectData={projectData} onUpdateTasks={(t) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { tasks: t } })} onGenerateGuide={handleGenerateGuide} onGenerateChecklist={handleGenerateChecklist} onGenerateCode={handleGenerateTaskCode} onRefineCode={handleRefineTaskCode} onCommitFile={handleCommitTaskCode} onContinue={() => dispatch({ type: 'SET_PHASE', payload: AppPhase.DOCUMENT })} />;
      case AppPhase.DOCUMENT: 
        return <SpecDocument projectData={projectData} onContinue={() => dispatch({ type: 'SET_PHASE', payload: AppPhase.KICKOFF })} />;
      case AppPhase.KICKOFF: 
        return <KickoffView assets={projectData.kickoffAssets} projectData={projectData} onGenerate={() => runPhaseGenerator(AppPhase.KICKOFF, () => gemini.generateKickoffAssets(projectData), 'kickoffAssets')} onUpdateProject={(d) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: d })} />;
      default: return <div className="text-center p-20 text-glass-text-secondary">Project initialized. Begin the process from the sidebar.</div>;
    }
  };

  const isFullWidthPhase = true; 

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen bg-ide-bg text-gray-200 font-sans flex flex-col overflow-hidden">
        
        {/* Modals & Overlays */}
        <OnboardingTour />
        <MobileMenu 
            isOpen={isMobileMenuOpen} 
            onClose={() => setIsMobileMenuOpen(false)}
            currentPhase={state.currentPhase}
            onNavigate={(phase) => dispatch({ type: 'SET_PHASE', payload: phase })}
            unlockedPhases={state.unlockedPhases}
        />
        <CommandPalette 
          isOpen={isPaletteOpen} 
          onClose={() => setIsPaletteOpen(false)} 
          onNavigate={(phase) => dispatch({ type: 'SET_PHASE', payload: phase })}
          onReset={() => dispatch({ type: 'RESET_PROJECT' })}
        />
        {isShortcutsOpen && <ShortcutsModal onClose={() => setIsShortcutsOpen(false)} />}
        {state.ui.showUpgradeModal && <UpgradeModal onClose={() => dispatch({ type: 'TRIGGER_UPGRADE_MODAL', payload: false })} />}
        {state.ui.showOrgModal && <OrganizationModal onClose={() => dispatch({ type: 'TRIGGER_ORG_MODAL', payload: false })} />}
        {showDevConsole && <DevConsole onClose={() => setShowDevConsole(false)} />}
        
        {/* Activity Overlays */}
        {activeActivity === 'PLUGINS' && <PluginStore onClose={() => setActiveActivity('NONE')} />}
        {activeActivity === 'SETTINGS' && <SettingsModal onClose={() => setActiveActivity('NONE')} />}
        {activeActivity === 'DOCS' && <DocumentationView onClose={() => setActiveActivity('NONE')} />}

        {/* Main Grid Layout */}
        <div className="flex-grow flex overflow-hidden">
            
            {/* Column 1: Activity Bar */}
            <Sidebar 
              activeView={activeActivity}
              onViewChange={setActiveActivity}
              currentPhase={state.currentPhase}
            />

            {/* Column 2: Side Panel (Context Explorer or Search) */}
            {activeActivity === 'EXPLORER' && (
                <ProjectExplorer 
                    currentPhase={state.currentPhase}
                    projectData={state.projectData}
                    unlockedPhases={state.unlockedPhases}
                    onNavigate={(p) => dispatch({ type: 'SET_PHASE', payload: p })}
                />
            )}
            
            {activeActivity === 'SEARCH' && (
                <SearchPanel 
                    onNavigate={(p) => dispatch({ type: 'SET_PHASE', payload: p })} 
                    onClose={() => setActiveActivity('NONE')}
                />
            )}

            {/* Column 3: Main Canvas */}
            <div className="flex-grow flex flex-col min-w-0 bg-[#0b0e14] relative overflow-hidden">
                {/* Header within canvas area for context */}
                <Header 
                    onReset={() => dispatch({ type: 'RESET_PROJECT' })} 
                    onToggleChat={() => setIsChatOpen(!isChatOpen)}
                    isChatOpen={isChatOpen}
                    onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
                />
                
                {/* Canvas Area */}
                <div className={`flex-grow relative ${isFullWidthPhase ? 'overflow-hidden h-full' : 'overflow-y-auto custom-scrollbar'}`}>
                    <div className={`${isFullWidthPhase ? 'h-full w-full p-4' : 'max-w-6xl mx-auto p-6 pb-20'} relative z-10`}>
                        {renderPhase()}
                    </div>
                </div>
            </div>

            {/* Column 4: Inspector / Chat (Right Rail) */}
            <div className="flex-shrink-0 flex border-l border-white/5 bg-ide-panel">
                {isChatOpen ? (
                    <ArchitectChat onClose={() => setIsChatOpen(false)} />
                ) : (
                    showInspector && state.currentPhase !== AppPhase.IDEA && (
                        <InspectorPanel currentPhase={state.currentPhase} projectData={state.projectData} />
                    )
                )}
            </div>
        </div>
        
        {/* Row 2: Status Bar */}
        <StatusBar />
      </div>
    </ErrorBoundary>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  </ToastProvider>
);

export default App;
