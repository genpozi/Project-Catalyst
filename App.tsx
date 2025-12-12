
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectData, Phase, Task, AppPhase, TaskStatus, ArchitectureData, SchemaData, FileNode, DesignSystem, ApiSpecification, SecurityContext, BrainstormingData } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
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

const SAVED_STATE_KEY = '0relai-state';

const getInitialState = (): { currentPhase: AppPhase; projectData: ProjectData } => {
  try {
    const savedState = localStorage.getItem(SAVED_STATE_KEY);
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      if (parsedState.currentPhase && parsedState.projectData) {
        return parsedState;
      }
    }
  } catch (e) {
    console.error("Failed to parse saved state, starting fresh.", e);
    localStorage.removeItem(SAVED_STATE_KEY);
  }
  return {
    currentPhase: AppPhase.IDEA,
    projectData: { initialIdea: '' }
  };
};

// Config for "Thinking" models to improve complex reasoning
const THINKING_CONFIG = {
  thinkingConfig: { thinkingBudget: 4096 } 
};

const App: React.FC = () => {
  const [currentPhase, setCurrentPhase] = useState<AppPhase>(getInitialState().currentPhase);
  const [projectData, setProjectData] = useState<ProjectData>(getInitialState().projectData);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY as string }), []);

  useEffect(() => {
    try {
      const stateToSave = JSON.stringify({ currentPhase, projectData });
      localStorage.setItem(SAVED_STATE_KEY, stateToSave);
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }
  }, [currentPhase, projectData]);

  const unlockedPhases = useMemo(() => {
    const phases = [AppPhase.IDEA];
    if (projectData.brainstormingResults) phases.push(AppPhase.BRAINSTORM);
    if (projectData.researchReport) phases.push(AppPhase.RESEARCH);
    if (projectData.architecture) phases.push(AppPhase.ARCHITECTURE);
    if (projectData.schema) phases.push(AppPhase.DATAMODEL);
    if (projectData.fileStructure) phases.push(AppPhase.FILE_STRUCTURE);
    if (projectData.designSystem) phases.push(AppPhase.UI_UX);
    if (projectData.apiSpec) phases.push(AppPhase.API_SPEC);
    if (projectData.securityContext) phases.push(AppPhase.SECURITY);
    if (projectData.securityContext) phases.push(AppPhase.BLUEPRINT_STUDIO); 
    if (projectData.agentRules) phases.push(AppPhase.AGENT_RULES);
    if (projectData.actionPlan) phases.push(AppPhase.PLAN);
    if (projectData.tasks) phases.push(AppPhase.WORKSPACE);
    if (projectData.tasks) phases.push(AppPhase.DOCUMENT); 
    if (projectData.kickoffAssets) phases.push(AppPhase.KICKOFF);
    return phases;
  }, [projectData]);

  const handleResetProject = useCallback(() => {
    if (window.confirm('Are you sure you want to start a new project? All current progress will be lost.')) {
      localStorage.removeItem(SAVED_STATE_KEY);
      setCurrentPhase(AppPhase.IDEA);
      setProjectData({ initialIdea: '' });
    }
  }, []);

  const handleNextPhase = () => {
    setCurrentPhase(prev => {
        const phases = Object.values(AppPhase);
        const currentIndex = phases.indexOf(prev);
        return phases[currentIndex + 1] || prev;
    });
  };

  const handlePhaseNavigation = (phase: AppPhase) => {
    setCurrentPhase(phase);
  };

  const handleUpdateProjectData = useCallback((newData: Partial<ProjectData>) => {
    setProjectData(prev => ({ ...prev, ...newData }));
  }, []);

  const handleAnalyzeAudio = useCallback(async (audioBase64: string): Promise<{ idea: string; type: string; constraints: string } | null> => {
    setIsAnalyzingAudio(true);
    setError(null);
    try {
        const prompt = "Listen to this voice memo describing a software project. Extract the following information into a structured JSON: 1. Core Idea (summarize clearly). 2. Project Type (choose closest to: Web Application, Mobile App, API, CLI Tool, Desktop Application, Game, AI Model). 3. Constraints (extract any technical preferences or constraints mentioned).";
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ inlineData: { mimeType: "audio/webm", data: audioBase64 } }, { text: prompt }] },
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { idea: { type: Type.STRING }, type: { type: Type.STRING }, constraints: { type: Type.STRING } }, required: ['idea', 'type', 'constraints'] } }
        });
        return JSON.parse(response.text);
    } catch (e) { setError("Failed to analyze audio."); return null; } finally { setIsAnalyzingAudio(false); }
  }, [ai]);

  const handleRefineProjectData = useCallback(async (section: string, feedback: string) => {
    setIsRefining(true); setError(null);
    try {
        let prompt = `Refine the ${section} based on feedback: "${feedback}". Return updated JSON.`;
        let updateKey: keyof ProjectData = 'architecture';
        let schema: any = null;
        let config: any = { ...THINKING_CONFIG };
        switch(section) {
            case 'Brainstorming': updateKey = 'brainstormingResults'; schema = { type: Type.OBJECT, properties: { questions: { type: Type.ARRAY, items: { type: Type.STRING } }, usps: { type: Type.ARRAY, items: { type: Type.STRING } }, personas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { role: { type: Type.STRING }, description: { type: Type.STRING }, painPoints: { type: Type.ARRAY, items: { type: Type.STRING } } } } }, features: { type: Type.ARRAY, items: { type: Type.STRING } } } }; break;
            case 'Research': updateKey = 'researchReport'; config = { tools: [{googleSearch: {}}] }; prompt = `Refine Research Summary based on: "${feedback}". Return JSON {summary: string}.`; break;
            case 'Architecture': updateKey = 'architecture'; break; 
            case 'Data Model': updateKey = 'schema'; break;
            case 'Files': updateKey = 'fileStructure'; break;
            case 'UI/UX': updateKey = 'designSystem'; break;
            case 'API': updateKey = 'apiSpec'; break;
            case 'Security': updateKey = 'securityContext'; break;
            case 'Plan': updateKey = 'actionPlan'; schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { phase_name: { type: Type.STRING }, tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, estimatedDuration: { type: Type.STRING }, priority: { type: Type.STRING }, role: { type: Type.STRING } } } } } } }; break;
        }

        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { ...config, responseMimeType: "application/json" } });
        
        if (section === 'Research') {
            const res = JSON.parse(response.text);
            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web) || [];
            const newSources = [...(projectData.researchReport?.sources || []), ...sources];
            setProjectData(prev => ({ ...prev, researchReport: { summary: res.summary, sources: newSources } }));
        } else {
             const newData = JSON.parse(response.text);
             setProjectData(prev => ({ ...prev, [updateKey]: newData }));
        }
    } catch (e) { setError(`Failed to refine ${section}`); } finally { setIsRefining(false); }
  }, [ai, projectData]);

  const handleIdeaSubmit = useCallback(async (idea: string, type: string, constraints: string, imageBase64?: string) => {
     setIsLoading(true); setError(null);
     setProjectData({ initialIdea: idea, projectType: type, constraints: constraints });
     try {
        const prompt = `Project: ${type}. Idea: ${idea}. Constraints: ${constraints}. Generate Brainstorming JSON (questions, usps, personas, features).`;
        const contents = imageBase64 ? { parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: imageBase64 } }] } : prompt;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents, config: { responseMimeType: "application/json" } }); 
        setProjectData(prev => ({ ...prev, brainstormingResults: JSON.parse(response.text) }));
        handleNextPhase();
     } catch(e) { setError("Failed to generate ideas."); } finally { setIsLoading(false); }
  }, [ai]);
  
  const handleStartResearch = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: `Research idea: ${projectData.initialIdea}`, config: { tools: [{googleSearch: {}}] } });
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web) || [];
        setProjectData(prev => ({ ...prev, researchReport: { summary: response.text, sources } }));
        handleNextPhase();
    } catch (e) { setError('Research failed.'); } finally { setIsLoading(false); }
  }, [ai, projectData]);

  const handleGenerateArchitecture = useCallback(async () => {
      setIsLoading(true); setError(null);
      try {
          const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: `Generate Architecture JSON for ${projectData.initialIdea}`, config: { responseMimeType: "application/json" } });
          setProjectData(prev => ({ ...prev, architecture: JSON.parse(response.text) }));
          handleNextPhase();
      } catch (e) { setError("Architecture failed"); } finally { setIsLoading(false); }
  }, [ai, projectData]);

  const handleGenerateSchema = useCallback(async () => {
      setIsLoading(true); setError(null);
      try {
          const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Generate Schema JSON (tables, mermaid, prisma) for ${projectData.initialIdea}`, config: { responseMimeType: 'application/json' } });
          setProjectData(prev => ({ ...prev, schema: JSON.parse(response.text) }));
          handleNextPhase();
      } catch(e) { setError("Schema failed"); } finally { setIsLoading(false); }
  }, [ai, projectData]);

  const handleGenerateFileStructure = useCallback(async () => {
     setIsLoading(true); setError(null);
     try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Generate File Structure JSON for ${projectData.initialIdea}`, config: { responseMimeType: 'application/json' } });
        setProjectData(prev => ({ ...prev, fileStructure: JSON.parse(response.text) }));
        handleNextPhase();
     } catch(e) { setError("Files failed"); } finally { setIsLoading(false); }
  }, [ai, projectData]);

  const handleGenerateDesignSystem = useCallback(async () => {
     setIsLoading(true); setError(null);
     try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Generate Design System JSON for ${projectData.initialIdea}`, config: { responseMimeType: 'application/json' } });
        setProjectData(prev => ({ ...prev, designSystem: JSON.parse(response.text) }));
        handleNextPhase();
     } catch(e) { setError("Design failed"); } finally { setIsLoading(false); }
  }, [ai, projectData]);

  const handleGenerateApiSpec = useCallback(async () => {
     setIsLoading(true); setError(null);
     try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Generate API Spec JSON for ${projectData.initialIdea}`, config: { responseMimeType: 'application/json' } });
        setProjectData(prev => ({ ...prev, apiSpec: JSON.parse(response.text) }));
        handleNextPhase();
     } catch(e) { setError("API failed"); } finally { setIsLoading(false); }
  }, [ai, projectData]);

  const handleGenerateSecurity = useCallback(async () => {
      setIsLoading(true); setError(null);
      try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Generate Security JSON for ${projectData.initialIdea}`, config: { responseMimeType: 'application/json' } });
        setProjectData(prev => ({ ...prev, securityContext: JSON.parse(response.text) }));
        handleNextPhase();
      } catch(e) { setError("Security failed"); } finally { setIsLoading(false); }
  }, [ai, projectData]);

  const handleGenerateAgentRules = useCallback(async () => {
     setIsLoading(true); setError(null);
     try {
         const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Generate .cursorrules markdown for ${projectData.initialIdea}` });
         setProjectData(prev => ({ ...prev, agentRules: response.text }));
         handleNextPhase();
     } catch(e) { setError("Rules failed"); } finally { setIsLoading(false); }
  }, [ai, projectData]);

  const handleGeneratePlan = useCallback(async () => {
      setIsLoading(true); setError(null);
      try {
          const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: `Generate Action Plan JSON for ${projectData.initialIdea}`, config: { responseMimeType: "application/json" } });
          const plan: Phase[] = JSON.parse(response.text);
          const normalized = plan.map(p => ({ ...p, tasks: p.tasks.map(t => ({ ...t, priority: (['High','Medium','Low'].includes(t.priority) ? t.priority : 'Medium') as any })) }));
          setProjectData(prev => ({ ...prev, actionPlan: normalized }));
          handleNextPhase();
      } catch(e) { setError("Plan failed"); } finally { setIsLoading(false); }
  }, [ai, projectData]);

  const handleGenerateKickoffAssets = useCallback(async () => {
     setIsLoading(true); setError(null);
     try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Generate Kickoff Assets Markdown for ${projectData.initialIdea}` });
        setProjectData(prev => ({ ...prev, kickoffAssets: response.text }));
     } catch(e) { setError("Kickoff failed"); } finally { setIsLoading(false); }
  }, [ai, projectData]);

  const handleSetupWorkspace = useCallback((finalPlan: Phase[]) => {
      if(!finalPlan) return;
      const tasks: Task[] = finalPlan.flatMap(p => p.tasks.map((t, i) => ({ id: `${p.phase_name}-${i}-${Date.now()}`, content: t.description, description: t.description, estimatedDuration: t.estimatedDuration, priority: t.priority, role: t.role, status: TaskStatus.TODO, phase: p.phase_name })));
      setProjectData(prev => ({ ...prev, actionPlan: finalPlan, tasks }));
      handleNextPhase();
  }, []);

  const handleGenerateTaskGuide = useCallback(async (taskId: string) => {
     try {
         const task = projectData.tasks?.find(t => t.id === taskId);
         if (!task) return;
         const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Generate Guide for ${task.content}` });
         setProjectData(prev => ({ ...prev, tasks: prev.tasks?.map(t => t.id === taskId ? { ...t, implementationGuide: response.text } : t) }));
     } catch(e) { setError("Guide failed"); }
  }, [ai, projectData]);

  const handleUpdateTasks = useCallback((updatedTasks: Task[]) => {
    setProjectData(prev => ({ ...prev, tasks: updatedTasks }));
  }, []);

  const renderCurrentPhase = () => {
    if (isLoading) return <LoadingSpinner />;
    if (error) return (
        <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in">
             <div className="glass-panel p-6 rounded-2xl border-red-500/30 border max-w-lg text-center">
                 <div className="text-4xl mb-4">⚠️</div>
                 <h3 className="text-xl font-bold text-red-200 mb-2">Operation Failed</h3>
                 <p className="text-glass-text-secondary mb-6">{error}</p>
                 <button onClick={() => setError(null)} className="glass-button-primary px-6 py-2 rounded-full font-bold text-white">Dismiss</button>
             </div>
        </div>
    );

    switch (currentPhase) {
      case AppPhase.IDEA: return <IdeaInput onSubmit={handleIdeaSubmit} onAnalyzeAudio={handleAnalyzeAudio} isAnalyzingAudio={isAnalyzingAudio} />;
      case AppPhase.BRAINSTORM: return <BrainstormingView data={projectData.brainstormingResults} onUpdate={(data) => handleUpdateProjectData({ brainstormingResults: data })} onRefine={(prompt) => handleRefineProjectData('Brainstorming', prompt)} isRefining={isRefining} onContinue={handleStartResearch} />;
      case AppPhase.RESEARCH: return <ResearchReport report={projectData.researchReport} onContinue={handleGenerateArchitecture} onRefine={(prompt) => handleRefineProjectData('Research', prompt)} isRefining={isRefining} />;
      case AppPhase.ARCHITECTURE: return <ArchitectureView architecture={projectData.architecture} onContinue={handleGenerateSchema} onRefine={(prompt) => handleRefineProjectData('Architecture', prompt)} isRefining={isRefining} />;
      case AppPhase.DATAMODEL: return <DataModelView data={projectData.schema} onContinue={handleGenerateFileStructure} onRefine={(prompt) => handleRefineProjectData('Data Model', prompt)} isRefining={isRefining} />;
      case AppPhase.FILE_STRUCTURE: return <FileStructureView structure={projectData.fileStructure} onContinue={handleGenerateDesignSystem} onRefine={(prompt) => handleRefineProjectData('Files', prompt)} isRefining={isRefining} />;
      case AppPhase.UI_UX: return <DesignSystemView designSystem={projectData.designSystem} onContinue={handleGenerateApiSpec} onRefine={(prompt) => handleRefineProjectData('UI/UX', prompt)} isRefining={isRefining} />;
      case AppPhase.API_SPEC: return <ApiSpecView apiSpec={projectData.apiSpec} onContinue={handleGenerateSecurity} onRefine={(prompt) => handleRefineProjectData('API', prompt)} isRefining={isRefining} />;
      case AppPhase.SECURITY: return <SecurityView securityContext={projectData.securityContext} onContinue={handleNextPhase} onRefine={(prompt) => handleRefineProjectData('Security', prompt)} isRefining={isRefining} />;
      case AppPhase.BLUEPRINT_STUDIO: return <BlueprintStudio projectData={projectData} onUpdate={handleUpdateProjectData} onRefine={handleRefineProjectData} onContinue={handleGenerateAgentRules} isRefining={isRefining} />;
      case AppPhase.AGENT_RULES: return <AgentRulesView rules={projectData.agentRules} onContinue={handleGeneratePlan} />;
      case AppPhase.PLAN: return <ActionPlanView plan={projectData.actionPlan || []} onContinue={handleSetupWorkspace} onRefine={(prompt) => handleRefineProjectData('Plan', prompt)} isRefining={isRefining} />;
      case AppPhase.WORKSPACE: return <KanbanBoard tasks={projectData.tasks || []} onUpdateTasks={handleUpdateTasks} onGenerateGuide={handleGenerateTaskGuide} onContinue={handleNextPhase} />;
      case AppPhase.DOCUMENT: return <SpecDocument projectData={projectData} onContinue={handleNextPhase} />;
      case AppPhase.KICKOFF: return <KickoffView assets={projectData.kickoffAssets} projectData={projectData} onGenerate={handleGenerateKickoffAssets} />;
      default: return <IdeaInput onSubmit={handleIdeaSubmit} onAnalyzeAudio={handleAnalyzeAudio} isAnalyzingAudio={isAnalyzingAudio} />;
    }
  };

  return (
    <div className="min-h-screen text-glass-text font-sans flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[1400px] mx-auto flex flex-col h-[calc(100vh-4rem)]">
        <Header onReset={handleResetProject} />
        
        <main className="mt-4 glass-panel rounded-3xl shadow-2xl flex flex-row flex-grow overflow-hidden relative">
          <Sidebar 
              currentPhase={currentPhase} 
              onPhaseClick={handlePhaseNavigation}
              unlockedPhases={unlockedPhases}
          />
          
          <div className="flex-grow overflow-y-auto custom-scrollbar p-6 sm:p-10 relative">
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-brand-accent/10 rounded-full blur-[100px] pointer-events-none"></div>
            
            <div className="relative z-10 max-w-5xl mx-auto">
                {renderCurrentPhase()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
