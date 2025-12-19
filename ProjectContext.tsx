
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { ProjectData, AppPhase, Task, Snapshot } from './types';

interface ProjectState {
  currentPhase: AppPhase;
  projectData: ProjectData;
  isLoading: boolean;
  error: string | null;
  unlockedPhases: AppPhase[];
  projectsList: { id: string; name: string; lastUpdated: number }[];
}

type ProjectAction =
  | { type: 'SET_PHASE'; payload: AppPhase }
  | { type: 'UPDATE_PROJECT_DATA'; payload: Partial<ProjectData> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_PROJECT' }
  | { type: 'LOAD_PROJECT'; payload: ProjectData }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'UNLOCK_PHASE'; payload: AppPhase }
  | { type: 'CREATE_SNAPSHOT'; payload: { name: string; description: string } }
  | { type: 'RESTORE_SNAPSHOT'; payload: string }
  | { type: 'DELETE_SNAPSHOT'; payload: string };

const SAVED_STATE_KEY = '0relai-project-state-v2';
const PROJECTS_COLLECTION_KEY = '0relai-all-projects';

const generateId = () => Math.random().toString(36).substring(2, 15);

const createNewProject = (idea: string = ''): ProjectData => ({
  id: generateId(),
  name: idea ? idea.substring(0, 20) + (idea.length > 20 ? '...' : '') : 'Untitled Project',
  initialIdea: idea,
  lastUpdated: Date.now(),
  snapshots: []
});

const initialState: ProjectState = {
  currentPhase: AppPhase.IDEA,
  projectData: createNewProject(),
  isLoading: false,
  error: null,
  unlockedPhases: [AppPhase.IDEA],
  projectsList: []
};

const projectReducer = (state: ProjectState, action: ProjectAction): ProjectState => {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, currentPhase: action.payload };
    case 'UPDATE_PROJECT_DATA':
      const updatedData = { ...state.projectData, ...action.payload, lastUpdated: Date.now() };
      // Auto-unlock logic
      const unlocked = [...state.unlockedPhases];
      const checkPhases = [
        { key: 'brainstormingResults', phase: AppPhase.BRAINSTORM },
        { key: 'researchReport', phase: AppPhase.RESEARCH },
        { key: 'architecture', phase: AppPhase.ARCHITECTURE },
        { key: 'schema', phase: AppPhase.DATAMODEL },
        { key: 'fileStructure', phase: AppPhase.FILE_STRUCTURE },
        { key: 'designSystem', phase: AppPhase.UI_UX },
        { key: 'apiSpec', phase: AppPhase.API_SPEC },
        { key: 'securityContext', phase: AppPhase.SECURITY },
        { key: 'agentRules', phase: AppPhase.AGENT_RULES },
        { key: 'actionPlan', phase: AppPhase.PLAN },
        { key: 'tasks', phase: AppPhase.WORKSPACE },
      ];
      checkPhases.forEach(({ key, phase }) => {
        if ((updatedData as any)[key] && !unlocked.includes(phase)) unlocked.push(phase);
      });
      return { ...state, projectData: updatedData, unlockedPhases: Array.from(new Set(unlocked)) };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET_PROJECT':
      return { ...initialState, projectData: createNewProject(), projectsList: state.projectsList };
    case 'LOAD_PROJECT':
      return { 
        ...state, 
        projectData: action.payload, 
        currentPhase: AppPhase.IDEA,
        unlockedPhases: [AppPhase.IDEA] // Reset unlocks to trigger recalculation via effect or manual check
      };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projectsList: state.projectsList.filter(p => p.id !== action.payload)
      };
    case 'UNLOCK_PHASE':
      return { ...state, unlockedPhases: Array.from(new Set([...state.unlockedPhases, action.payload])) };
    
    case 'CREATE_SNAPSHOT': {
      const { name, description } = action.payload;
      // Capture key architectural state, excluding the snapshots array itself to avoid recursion depth issues
      const { snapshots, ...currentState } = state.projectData;
      const newSnapshot: Snapshot = {
        id: generateId(),
        name,
        description,
        timestamp: Date.now(),
        data: JSON.parse(JSON.stringify(currentState)) // Deep copy
      };
      return {
        ...state,
        projectData: {
          ...state.projectData,
          snapshots: [...(state.projectData.snapshots || []), newSnapshot]
        }
      };
    }

    case 'RESTORE_SNAPSHOT': {
      const snapshotToRestore = state.projectData.snapshots?.find(s => s.id === action.payload);
      if (!snapshotToRestore) return state;
      
      return {
        ...state,
        projectData: {
          ...state.projectData,
          ...snapshotToRestore.data,
          // Preserve current snapshots list and ID/Name to maintain project identity
          snapshots: state.projectData.snapshots,
          id: state.projectData.id,
          name: state.projectData.name,
          initialIdea: state.projectData.initialIdea
        }
      };
    }

    case 'DELETE_SNAPSHOT': {
      return {
        ...state,
        projectData: {
          ...state.projectData,
          snapshots: state.projectData.snapshots?.filter(s => s.id !== action.payload) || []
        }
      };
    }

    default:
      return state;
  }
};

const ProjectContext = createContext<{
  state: ProjectState;
  dispatch: React.Dispatch<ProjectAction>;
} | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(projectReducer, initialState, (initial) => {
    try {
      const saved = localStorage.getItem(SAVED_STATE_KEY);
      const projects = JSON.parse(localStorage.getItem(PROJECTS_COLLECTION_KEY) || '[]');
      return saved ? { ...JSON.parse(saved), projectsList: projects } : { ...initial, projectsList: projects };
    } catch {
      return initial;
    }
  });

  // Save current project state
  useEffect(() => {
    localStorage.setItem(SAVED_STATE_KEY, JSON.stringify({
      currentPhase: state.currentPhase,
      projectData: state.projectData,
      unlockedPhases: state.unlockedPhases
    }));

    // Update Project Index
    const existing = JSON.parse(localStorage.getItem(PROJECTS_COLLECTION_KEY) || '[]');
    const index = existing.findIndex((p: any) => p.id === state.projectData.id);
    const meta = { id: state.projectData.id, name: state.projectData.name, lastUpdated: state.projectData.lastUpdated };
    
    if (index > -1) {
      existing[index] = meta;
    } else if (state.projectData.initialIdea) {
      existing.push(meta);
    }
    
    // Persist full data for each project separately to avoid quota issues on one key
    localStorage.setItem(`0relai-proj-${state.projectData.id}`, JSON.stringify(state.projectData));
    localStorage.setItem(PROJECTS_COLLECTION_KEY, JSON.stringify(existing));
  }, [state.projectData, state.currentPhase, state.unlockedPhases]);

  return (
    <ProjectContext.Provider value={{ state, dispatch }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within a ProjectProvider');
  return context;
};
