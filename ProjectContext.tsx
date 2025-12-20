
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { ProjectData, AppPhase, Task, Snapshot, Comment, Collaborator, KnowledgeDoc, LocalEngineState, SyncStatus } from './types';
import { db } from './utils/db';
import { cliSync } from './utils/CLISyncService';

interface UIState {
    selectedFilePath?: string;
    selectedDocId?: string;
    selectedNodeId?: string;
}

interface ProjectState {
  currentPhase: AppPhase;
  projectData: ProjectData;
  isLoading: boolean;
  error: string | null;
  unlockedPhases: AppPhase[];
  projectsList: { id: string; name: string; lastUpdated: number }[];
  marketplace: ProjectData[];
  localEngine: LocalEngineState;
  syncStatus: SyncStatus;
  ui: UIState;
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
  | { type: 'DELETE_SNAPSHOT'; payload: string }
  | { type: 'ADD_COMMENT'; payload: Comment }
  | { type: 'RESOLVE_COMMENT'; payload: string }
  | { type: 'ADD_COLLABORATOR'; payload: Collaborator }
  | { type: 'PUBLISH_PROJECT'; payload: { tags: string[], author: string } }
  | { type: 'LIKE_PROJECT'; payload: string }
  | { type: 'IMPORT_FROM_MARKETPLACE'; payload: ProjectData }
  | { type: 'ADD_KNOWLEDGE_DOC'; payload: KnowledgeDoc }
  | { type: 'DELETE_KNOWLEDGE_DOC'; payload: string }
  | { type: 'SYNC_PROJECTS_LIST'; payload: any[] }
  | { type: 'TOGGLE_PLUGIN'; payload: string }
  | { type: 'UPDATE_LOCAL_ENGINE'; payload: Partial<LocalEngineState> }
  | { type: 'SET_SYNC_STATUS'; payload: SyncStatus }
  | { type: 'SET_SELECTED_FILE'; payload: string | undefined }
  | { type: 'SET_SELECTED_DOC'; payload: string | undefined }
  | { type: 'SET_SELECTED_NODE'; payload: string | undefined };

const SAVED_STATE_KEY = '0relai-project-state-v2';
const MARKETPLACE_KEY = '0relai-marketplace';

const generateId = () => Math.random().toString(36).substring(2, 15);

const createNewProject = (idea: string = ''): ProjectData => ({
  id: generateId(),
  name: idea ? idea.substring(0, 20) + (idea.length > 20 ? '...' : '') : 'Untitled Project',
  initialIdea: idea,
  lastUpdated: Date.now(),
  snapshots: [],
  comments: [],
  knowledgeBase: [],
  activePlugins: [],
  collaborators: [
      { id: 'me', name: 'You', email: 'you@example.com', role: 'Owner', avatar: '😎', status: 'active' }
  ],
  isPublished: false,
  likes: 0
});

const initialState: ProjectState = {
  currentPhase: AppPhase.IDEA,
  projectData: createNewProject(),
  isLoading: false,
  error: null,
  unlockedPhases: [AppPhase.IDEA],
  projectsList: [],
  marketplace: [],
  localEngine: {
      status: 'unloaded',
      progress: '',
      progressValue: 0,
      progressPhase: 'init'
  },
  syncStatus: 'disconnected',
  ui: {}
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
        { key: 'knowledgeBase', phase: AppPhase.KNOWLEDGE_BASE },
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
        if ((updatedData as any)[key] && Array.isArray((updatedData as any)[key]) ? (updatedData as any)[key].length > 0 : (updatedData as any)[key]) {
             if (!unlocked.includes(phase)) unlocked.push(phase);
        }
      });
      return { ...state, projectData: updatedData, unlockedPhases: Array.from(new Set(unlocked)) };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET_PROJECT':
      return { 
          ...state, 
          projectData: createNewProject(), 
          currentPhase: AppPhase.IDEA,
          unlockedPhases: [AppPhase.IDEA],
          ui: {}
      };
    case 'LOAD_PROJECT':
      return { 
        ...state, 
        projectData: action.payload, 
        currentPhase: AppPhase.IDEA,
        unlockedPhases: [AppPhase.IDEA],
        ui: {}
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
      const { snapshots, comments, ...currentState } = state.projectData;
      const newSnapshot: Snapshot = {
        id: generateId(),
        name,
        description,
        timestamp: Date.now(),
        data: JSON.parse(JSON.stringify(currentState))
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
          snapshots: state.projectData.snapshots,
          id: state.projectData.id,
          name: state.projectData.name,
          initialIdea: state.projectData.initialIdea,
          comments: state.projectData.comments,
          collaborators: state.projectData.collaborators
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

    case 'ADD_COMMENT':
      return {
        ...state,
        projectData: {
          ...state.projectData,
          comments: [...(state.projectData.comments || []), action.payload]
        }
      };

    case 'RESOLVE_COMMENT':
      return {
        ...state,
        projectData: {
          ...state.projectData,
          comments: state.projectData.comments?.map(c => 
            c.id === action.payload ? { ...c, resolved: !c.resolved } : c
          ) || []
        }
      };

    case 'ADD_COLLABORATOR':
      return {
        ...state,
        projectData: {
          ...state.projectData,
          collaborators: [...(state.projectData.collaborators || []), action.payload]
        }
      };

    case 'PUBLISH_PROJECT': {
        const publishedCopy: ProjectData = {
            ...state.projectData,
            id: `pub-${generateId()}`,
            isPublished: true,
            author: action.payload.author,
            tags: action.payload.tags,
            likes: 0,
            lastUpdated: Date.now(),
            chatHistory: [],
            snapshots: [],
            comments: []
        };
        const newMarketplace = [publishedCopy, ...state.marketplace];
        localStorage.setItem(MARKETPLACE_KEY, JSON.stringify(newMarketplace));
        return {
            ...state,
            projectData: { ...state.projectData, isPublished: true },
            marketplace: newMarketplace
        };
    }

    case 'LIKE_PROJECT': {
        const newMarketplace = state.marketplace.map(p => 
            p.id === action.payload ? { ...p, likes: (p.likes || 0) + 1 } : p
        );
        localStorage.setItem(MARKETPLACE_KEY, JSON.stringify(newMarketplace));
        return { ...state, marketplace: newMarketplace };
    }

    case 'IMPORT_FROM_MARKETPLACE': {
        const newProject: ProjectData = {
            ...action.payload,
            id: generateId(),
            name: `${action.payload.name} (Fork)`,
            isPublished: false,
            author: undefined,
            likes: 0,
            lastUpdated: Date.now(),
            collaborators: [
                { id: 'me', name: 'You', email: 'you@example.com', role: 'Owner', avatar: '😎', status: 'active' }
            ]
        };
        return {
            ...state,
            projectData: newProject,
            currentPhase: AppPhase.IDEA,
            unlockedPhases: [AppPhase.IDEA]
        };
    }

    case 'ADD_KNOWLEDGE_DOC':
        return {
            ...state,
            projectData: {
                ...state.projectData,
                knowledgeBase: [...(state.projectData.knowledgeBase || []), action.payload]
            }
        };

    case 'DELETE_KNOWLEDGE_DOC':
        return {
            ...state,
            projectData: {
                ...state.projectData,
                knowledgeBase: state.projectData.knowledgeBase?.filter(doc => doc.id !== action.payload) || []
            }
        };

    case 'SYNC_PROJECTS_LIST':
        return { ...state, projectsList: action.payload };

    case 'TOGGLE_PLUGIN': {
        const currentPlugins = state.projectData.activePlugins || [];
        const isEnabled = currentPlugins.includes(action.payload);
        const newPlugins = isEnabled 
            ? currentPlugins.filter(id => id !== action.payload)
            : [...currentPlugins, action.payload];
        
        return {
            ...state,
            projectData: {
                ...state.projectData,
                activePlugins: newPlugins
            }
        };
    }

    case 'UPDATE_LOCAL_ENGINE':
        return {
            ...state,
            localEngine: { ...state.localEngine, ...action.payload }
        };

    case 'SET_SYNC_STATUS':
        return { ...state, syncStatus: action.payload };

    case 'SET_SELECTED_FILE':
        return { ...state, ui: { ...state.ui, selectedFilePath: action.payload, selectedDocId: undefined, selectedNodeId: undefined } };

    case 'SET_SELECTED_DOC':
        return { ...state, ui: { ...state.ui, selectedDocId: action.payload, selectedFilePath: undefined, selectedNodeId: undefined } };

    case 'SET_SELECTED_NODE':
        return { ...state, ui: { ...state.ui, selectedNodeId: action.payload, selectedFilePath: undefined, selectedDocId: undefined } };

    default:
      return state;
  }
};

const ProjectContext = createContext<{
  state: ProjectState;
  dispatch: React.Dispatch<ProjectAction>;
} | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  // Initialize DB and Listeners
  useEffect(() => {
    const init = async () => {
        try {
            await db.init();
            
            // CLI Bridge Listener
            cliSync.subscribeStatus((status) => {
                dispatch({ type: 'SET_SYNC_STATUS', payload: status });
            });

            const marketplace = JSON.parse(localStorage.getItem(MARKETPLACE_KEY) || '[]');
            const projectsList = await db.getAllProjectsMeta();
            dispatch({ type: 'SYNC_PROJECTS_LIST', payload: projectsList });

            const savedStateStr = localStorage.getItem(SAVED_STATE_KEY);
            if (savedStateStr) {
                const savedState = JSON.parse(savedStateStr);
                if (savedState.projectData && savedState.projectData.id) {
                    const fullProject = await db.getProject(savedState.projectData.id);
                    if (fullProject) {
                        dispatch({ type: 'LOAD_PROJECT', payload: fullProject });
                        dispatch({ type: 'SET_PHASE', payload: savedState.currentPhase });
                        savedState.unlockedPhases.forEach((p: AppPhase) => dispatch({ type: 'UNLOCK_PHASE', payload: p }));
                    }
                }
            }
        } catch (e) {
            console.error("Initialization failed", e);
        }
    };
    init();
  }, []);

  // Save changes to DB
  useEffect(() => {
    localStorage.setItem(SAVED_STATE_KEY, JSON.stringify({
      currentPhase: state.currentPhase,
      projectData: { id: state.projectData.id, name: state.projectData.name }, 
      unlockedPhases: state.unlockedPhases
    }));

    const saveToDB = async () => {
        if (state.projectData.id && !state.projectData.id.startsWith('pub-')) {
            await db.saveProject(state.projectData);
            const list = await db.getAllProjectsMeta();
            dispatch({ type: 'SYNC_PROJECTS_LIST', payload: list });
        }
    };
    
    const timeout = setTimeout(saveToDB, 1000);
    return () => clearTimeout(timeout);

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
