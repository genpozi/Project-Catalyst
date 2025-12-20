
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ProjectProvider, useProject } from './ProjectContext';
import { GeminiService } from './GeminiService';
import { AppPhase, TaskStatus, Task, Phase as ProjectPhase } from './types';
import { ToastProvider, useToast } from './components/Toast';
import { upsertFileNode } from './utils/projectFileSystem';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import CommandPalette from './components/CommandPalette';
import PhaseStepper from './components/PhaseStepper';
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

const AppContent: React.FC = () => {
  const { state, dispatch } = useProject();
  const { addToast } = useToast();
  const [isRefining, setIsRefining] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const gemini = useMemo(() => new GeminiService(), []);

  const handleError = useCallback((msg: string) => {
    dispatch({ type: 'SET_ERROR', payload: msg });
    dispatch({ type: 'SET_LOADING', payload: false });
    addToast(msg, 'error');
  }, [dispatch, addToast]);

  // Command Palette & Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
      // Shortcuts Help
      if (e.key === '?' && !e.target?.toString().includes('Input') && !e.target?.toString().includes('TextArea')) {
          e.preventDefault();
          setIsShortcutsOpen(prev => !prev);
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
        <div className="glass-panel p-8 rounded-3xl border-red-500/30 border max-w-lg shadow-2xl">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-red-200 mb-3">Architectural Glitch</h3>
          <p className="text-glass-text-secondary mb-8">{state.error}</p>
          <button onClick={() => dispatch({ type: 'SET_ERROR', payload: null })} className="glass-button-primary px-10 py-3 rounded-full font-bold text-white shadow-lg">Try Again</button>
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
        return <SecurityView 
            securityContext={projectData.securityContext} 
            onUpdate={(ctx) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { securityContext: ctx } })}
            onContinue={() => dispatch({ type: 'SET_PHASE', payload: AppPhase.BLUEPRINT_STUDIO })} 
            onRefine={(f) => handleRefine('Security', f)} 
            isRefining={isRefining} 
        />;
      
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
        return <KanbanBoard 
            tasks={projectData.tasks || []} 
            projectData={projectData}
            onUpdateTasks={(t) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { tasks: t } })} 
            onGenerateGuide={handleGenerateGuide} 
            onGenerateChecklist={handleGenerateChecklist} 
            onGenerateCode={handleGenerateTaskCode}
            onRefineCode={handleRefineTaskCode}
            onCommitFile={handleCommitTaskCode}
            onContinue={() => dispatch({ type: 'SET_PHASE', payload: AppPhase.DOCUMENT })} 
        />;
      
      case AppPhase.DOCUMENT: 
        return <SpecDocument projectData={projectData} onContinue={() => dispatch({ type: 'SET_PHASE', payload: AppPhase.KICKOFF })} />;
      
      case AppPhase.KICKOFF: 
        return <KickoffView 
            assets={projectData.kickoffAssets} 
            projectData={projectData} 
            onGenerate={() => runPhaseGenerator(AppPhase.KICKOFF, () => gemini.generateKickoffAssets(projectData), 'kickoffAssets')}
            onUpdateProject={(d) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: d })}
        />;
      
      default: return <div className="text-center p-20 glass-panel rounded-3xl text-glass-text-secondary">Project initialized. Begin the process from the sidebar.</div>;
    }
  };

  return (
    <div className="h-screen w-screen bg-brand-dark text-glass-text font-sans flex flex-col overflow-hidden">
      <CommandPalette 
        isOpen={isPaletteOpen} 
        onClose={() => setIsPaletteOpen(false)} 
        onNavigate={(phase) => dispatch({ type: 'SET_PHASE', payload: phase })}
        onReset={() => dispatch({ type: 'RESET_PROJECT' })}
      />

      {isShortcutsOpen && (
          <ShortcutsModal onClose={() => setIsShortcutsOpen(false)} />
      )}
      
      <Header 
        onReset={() => dispatch({ type: 'RESET_PROJECT' })} 
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      
      <div className="flex flex-grow overflow-hidden relative">
          <Sidebar 
            currentPhase={state.currentPhase} 
            onPhaseClick={(p) => dispatch({ type: 'SET_PHASE', payload: p })}
            unlockedPhases={state.unlockedPhases}
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />
          <main className="flex-grow flex flex-col relative overflow-hidden bg-brand-dark transition-all duration-300">
            {/* Context Header Area */}
            <div className="px-6 pt-6 border-b border-glass-border/30 bg-brand-dark z-10 flex-shrink-0">
                <PhaseStepper currentPhase={state.currentPhase} unlockedPhases={state.unlockedPhases} />
            </div>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar p-6 sm:p-10 relative">
                {/* Background Decor */}
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-brand-secondary/5 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
                
                <div className="relative z-10 max-w-7xl mx-auto h-full pb-20">
                    {renderPhase()}
                </div>
            </div>
          </main>
          
          {/* Right Sidebar - Architect Chat */}
          {isChatOpen && (
             <ArchitectChat onClose={() => setIsChatOpen(false)} />
          )}
      </div>
      
      <StatusBar />
    </div>
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
