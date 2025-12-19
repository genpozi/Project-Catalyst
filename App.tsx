
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ProjectProvider, useProject } from './ProjectContext';
import { GeminiService } from './GeminiService';
import { AppPhase, TaskStatus, Task, Phase as ProjectPhase } from './types';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import PhaseStepper from './components/PhaseStepper';
import IdeaInput from './components/IdeaInput';
import BrainstormingView from './components/BrainstormingView';
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

const AppContent: React.FC = () => {
  const { state, dispatch } = useProject();
  const [isRefining, setIsRefining] = useState(false);
  const gemini = useMemo(() => new GeminiService(), []);

  const handleError = useCallback((msg: string) => {
    dispatch({ type: 'SET_ERROR', payload: msg });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, [dispatch]);

  const runPhaseGenerator = async (phase: AppPhase, generator: () => Promise<any>, dataKey: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await generator();
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { [dataKey]: result } });
      dispatch({ type: 'SET_PHASE', payload: phase });
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
    } catch (e) {
      handleError(`Refining ${section} failed.`);
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateGuide = async (taskId: string) => {
    try {
      const guide = await gemini.generateImplementationGuide(taskId, state.projectData);
      const updatedTasks = state.projectData.tasks?.map(t => t.id === taskId ? { ...t, implementationGuide: guide } : t);
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { tasks: updatedTasks } });
    } catch (e) {
      handleError("Failed to generate implementation guide.");
    }
  };

  const handleGenerateChecklist = async (taskId: string) => {
    try {
      const checklist = await gemini.generateChecklist(taskId, state.projectData);
      const updatedTasks = state.projectData.tasks?.map(t => t.id === taskId ? { ...t, checklist } : t);
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { tasks: updatedTasks } });
    } catch (e) {
      handleError("Failed to generate checklist.");
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
        return <BrainstormingView data={projectData.brainstormingResults} onUpdate={(d) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { brainstormingResults: d } })} onContinue={() => runPhaseGenerator(AppPhase.RESEARCH, () => gemini.generateResearch(projectData.initialIdea), 'researchReport')} onRefine={(f) => handleRefine('Brainstorming', f)} isRefining={isRefining} />;
      
      case AppPhase.RESEARCH: 
        return <ResearchReport report={projectData.researchReport} onContinue={() => runPhaseGenerator(AppPhase.ARCHITECTURE, () => gemini.generateArchitecture(projectData), 'architecture')} onRefine={(f) => handleRefine('Research', f)} isRefining={isRefining} />;
      
      case AppPhase.ARCHITECTURE: 
        return <ArchitectureView architecture={projectData.architecture} onContinue={() => runPhaseGenerator(AppPhase.DATAMODEL, async () => {
          // Automatic Cost Estimation during Architecture approval
          const cost = await gemini.generateCostEstimation(projectData);
          dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { costEstimation: cost } });
          return gemini.generateSchema(projectData);
        }, 'schema')} onRefine={(f) => handleRefine('Architecture', f)} isRefining={isRefining} />;
      
      case AppPhase.DATAMODEL: 
        return <DataModelView data={projectData.schema} onContinue={() => runPhaseGenerator(AppPhase.FILE_STRUCTURE, () => gemini.generateFileStructure(projectData), 'fileStructure')} onRefine={(f) => handleRefine('Data Model', f)} isRefining={isRefining} />;
      
      case AppPhase.FILE_STRUCTURE: 
        return <FileStructureView structure={projectData.fileStructure} onContinue={() => runPhaseGenerator(AppPhase.UI_UX, () => gemini.generateDesignSystem(projectData), 'designSystem')} onRefine={(f) => handleRefine('Files', f)} isRefining={isRefining} />;
      
      case AppPhase.UI_UX: 
        return <DesignSystemView designSystem={projectData.designSystem} onContinue={() => runPhaseGenerator(AppPhase.API_SPEC, () => gemini.generateApiSpec(projectData), 'apiSpec')} onRefine={(f) => handleRefine('UI/UX', f)} isRefining={isRefining} />;
      
      case AppPhase.API_SPEC: 
        return <ApiSpecView apiSpec={projectData.apiSpec} onContinue={() => runPhaseGenerator(AppPhase.SECURITY, () => gemini.generateSecurityContext(projectData), 'securityContext')} onRefine={(f) => handleRefine('API', f)} isRefining={isRefining} />;
      
      case AppPhase.SECURITY: 
        return <SecurityView securityContext={projectData.securityContext} onContinue={() => dispatch({ type: 'SET_PHASE', payload: AppPhase.BLUEPRINT_STUDIO })} onRefine={(f) => handleRefine('Security', f)} isRefining={isRefining} />;
      
      case AppPhase.BLUEPRINT_STUDIO: 
        return <BlueprintStudio projectData={projectData} onUpdate={(d) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: d })} onRefine={handleRefine} onContinue={() => runPhaseGenerator(AppPhase.AGENT_RULES, () => gemini.generateAgentRules(projectData), 'agentRules')} isRefining={isRefining} />;
      
      case AppPhase.AGENT_RULES: 
        return <AgentRulesView rules={projectData.agentRules} onContinue={() => runPhaseGenerator(AppPhase.PLAN, () => gemini.generateActionPlan(projectData), 'actionPlan')} />;
      
      case AppPhase.PLAN: 
        return <ActionPlanView plan={projectData.actionPlan || []} onContinue={(finalPlan) => {
          const tasks: Task[] = finalPlan.flatMap((p, i) => p.tasks.map((t, ti) => ({ ...t, id: `${i}-${ti}`, status: TaskStatus.TODO, phase: p.phase_name, content: t.description })));
          dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { actionPlan: finalPlan, tasks } });
          dispatch({ type: 'SET_PHASE', payload: AppPhase.WORKSPACE });
        }} onRefine={(f) => handleRefine('Plan', f)} isRefining={isRefining} />;
      
      case AppPhase.WORKSPACE: 
        return <KanbanBoard tasks={projectData.tasks || []} onUpdateTasks={(t) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { tasks: t } })} onGenerateGuide={handleGenerateGuide} onGenerateChecklist={handleGenerateChecklist} onContinue={() => dispatch({ type: 'SET_PHASE', payload: AppPhase.DOCUMENT })} />;
      
      case AppPhase.DOCUMENT: 
        return <SpecDocument projectData={projectData} onContinue={() => dispatch({ type: 'SET_PHASE', payload: AppPhase.KICKOFF })} />;
      
      case AppPhase.KICKOFF: 
        return <KickoffView assets={projectData.kickoffAssets} projectData={projectData} onGenerate={() => runPhaseGenerator(AppPhase.KICKOFF, () => gemini.generateKickoffAssets(projectData), 'kickoffAssets')} />;
      
      default: return <div className="text-center p-20 glass-panel rounded-3xl text-glass-text-secondary">Project initialized. Begin the process from the sidebar.</div>;
    }
  };

  return (
    <div className="min-h-screen text-glass-text font-sans flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[1400px] mx-auto flex flex-col h-[calc(100vh-4rem)]">
        <Header onReset={() => dispatch({ type: 'RESET_PROJECT' })} />
        <main className="mt-4 glass-panel rounded-3xl shadow-2xl flex flex-row flex-grow overflow-hidden relative">
          <Sidebar 
            currentPhase={state.currentPhase} 
            onPhaseClick={(p) => dispatch({ type: 'SET_PHASE', payload: p })}
            unlockedPhases={state.unlockedPhases}
          />
          <div className="flex-grow flex flex-col h-full relative overflow-hidden">
            {/* Context Header Area */}
            <div className="px-6 sm:px-10 pt-6">
                <PhaseStepper currentPhase={state.currentPhase} unlockedPhases={state.unlockedPhases} />
            </div>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar p-6 sm:p-10 relative">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="relative z-10 max-w-5xl mx-auto h-full">
                {renderPhase()}
                </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <ProjectProvider>
    <AppContent />
  </ProjectProvider>
);

export default App;
