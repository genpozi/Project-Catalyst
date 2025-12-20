
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo } from 'react';
import { ProjectData, AppPhase, Task, Snapshot, Comment, Collaborator, KnowledgeDoc, LocalEngineState, SyncStatus, ActivityItem, ProjectTemplate, PresenceUser, UserProfile, SubscriptionTier, Organization, OrganizationMember, AuditLogEntry } from './types';
import { db } from './utils/db';
import { cliSync } from './utils/CLISyncService';
import { cloudStorage } from './utils/cloudStorage';
import { supabase, getCurrentUser } from './utils/supabaseClient';

interface UIState {
    selectedFilePath?: string;
    selectedDocId?: string;
    selectedNodeId?: string;
    showUpgradeModal?: boolean;
    showOrgModal?: boolean;
}

interface ProjectState {
  currentPhase: AppPhase;
  projectData: ProjectData;
  isLoading: boolean;
  error: string | null;
  unlockedPhases: AppPhase[];
  projectsList: { id: string; name: string; lastUpdated: number; source?: string }[];
  marketplace: ProjectData[];
  customTemplates: ProjectTemplate[];
  localEngine: LocalEngineState;
  syncStatus: SyncStatus;
  recentActivities: ActivityItem[];
  ui: UIState;
  user: any | null; 
  userProfile: UserProfile | null;
  collaborators: Collaborator[];
  onlineUsers: PresenceUser[];
  // Organization State
  organizations: Organization[];
  currentOrg: Organization | null;
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
  | { type: 'SAVE_TEMPLATE'; payload: { name: string; description: string; icon: string } }
  | { type: 'DELETE_TEMPLATE'; payload: string }
  | { type: 'ADD_KNOWLEDGE_DOC'; payload: KnowledgeDoc }
  | { type: 'DELETE_KNOWLEDGE_DOC'; payload: string }
  | { type: 'SYNC_PROJECTS_LIST'; payload: any[] }
  | { type: 'TOGGLE_PLUGIN'; payload: string }
  | { type: 'UPDATE_LOCAL_ENGINE'; payload: Partial<LocalEngineState> }
  | { type: 'SET_SYNC_STATUS'; payload: SyncStatus }
  | { type: 'SET_SELECTED_FILE'; payload: string | undefined }
  | { type: 'SET_SELECTED_DOC'; payload: string | undefined }
  | { type: 'SET_SELECTED_NODE'; payload: string | undefined }
  | { type: 'TRIGGER_UPGRADE_MODAL'; payload: boolean }
  | { type: 'TRIGGER_ORG_MODAL'; payload: boolean }
  | { type: 'ADD_ACTIVITY'; payload: ActivityItem }
  | { type: 'SET_USER'; payload: any | null }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile }
  | { type: 'UPGRADE_TIER'; payload: SubscriptionTier }
  | { type: 'SET_ONLINE_USERS'; payload: PresenceUser[] }
  | { type: 'CREATE_ORG'; payload: string }
  | { type: 'SWITCH_ORG'; payload: string }
  | { type: 'ADD_ORG_MEMBER'; payload: { email: string, role: OrganizationMember['role'] } }
  | { type: 'UPDATE_ORG_MEMBER'; payload: { userId: string, role: OrganizationMember['role'] } }
  | { type: 'REMOVE_ORG_MEMBER'; payload: string };

const SAVED_STATE_KEY = '0relai-project-state-v2';
const MARKETPLACE_KEY = '0relai-marketplace';
const TEMPLATES_KEY = '0relai-templates';
const ACTIVITY_KEY = '0relai-activities';
const USER_PROFILE_KEY = '0relai-user-profile';
const ORGS_KEY = '0relai-organizations';

const generateId = () => Math.random().toString(36).substring(2, 15);

const getRandomColor = () => {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
    return colors[Math.floor(Math.random() * colors.length)];
};

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
  customTemplates: [],
  localEngine: {
      status: 'unloaded',
      progress: '',
      progressValue: 0,
      progressPhase: 'init'
  },
  syncStatus: 'disconnected',
  recentActivities: [],
  ui: {},
  user: null,
  userProfile: null,
  collaborators: [],
  onlineUsers: [],
  organizations: [],
  currentOrg: null
};

// Check if user can create a project based on their tier
const canCreateProject = (profile: UserProfile | null, currentProjects: number) => {
    if (!profile) return true; 
    if (profile.tier === 'Free' && currentProjects >= profile.projectsLimit) return false;
    return true;
};

// Helper to create audit logs
const createAuditLog = (
    actorId: string, 
    actorName: string, 
    action: string, 
    target: string, 
    severity: AuditLogEntry['severity'] = 'info'
): AuditLogEntry => ({
    id: generateId(),
    actorId,
    actorName,
    action,
    target,
    timestamp: Date.now(),
    severity
});

const projectReducer = (state: ProjectState, action: ProjectAction): ProjectState => {
  let newState = { ...state };
  let newActivity: ActivityItem | null = null;
  let auditLog: AuditLogEntry | null = null;

  switch (action.type) {
    case 'SET_PHASE':
      newState.currentPhase = action.payload;
      break;
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
      newState.projectData = updatedData;
      newState.unlockedPhases = Array.from(new Set(unlocked));
      
      if (action.payload.architecture) newActivity = { id: generateId(), type: 'update', message: `Updated Architecture`, timestamp: Date.now(), projectId: state.projectData.id, projectName: state.projectData.name };
      break;
    case 'SET_LOADING':
      newState.isLoading = action.payload;
      break;
    case 'SET_ERROR':
      newState.error = action.payload;
      break;
    case 'RESET_PROJECT':
      if (state.userProfile && !canCreateProject(state.userProfile, state.projectsList.length)) {
          newState.ui.showUpgradeModal = true;
      } else {
          const newProj = createNewProject();
          newProj.organizationId = state.currentOrg?.id; 
          newState.projectData = newProj;
          newState.currentPhase = AppPhase.IDEA;
          newState.unlockedPhases = [AppPhase.IDEA];
          newState.ui = {};
          newActivity = { id: generateId(), type: 'create', message: `Started new project`, timestamp: Date.now(), projectId: newProj.id, projectName: newProj.name };
          
          if (newState.userProfile) {
              newState.userProfile = { ...newState.userProfile, projectsUsed: newState.userProfile.projectsUsed + 1 };
              localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newState.userProfile));
          }
          
          if (state.currentOrg) {
              auditLog = createAuditLog(state.user?.id || 'anon', state.user?.email || 'Anonymous', 'Created Project', newProj.name);
          }
      }
      break;
    case 'LOAD_PROJECT':
      newState.projectData = action.payload;
      newState.currentPhase = AppPhase.IDEA;
      newState.unlockedPhases = [AppPhase.IDEA]; 
      newState.ui = {};
      break;
    case 'DELETE_PROJECT':
      newState.projectsList = state.projectsList.filter(p => p.id !== action.payload);
      if (newState.userProfile) {
          newState.userProfile = { ...newState.userProfile, projectsUsed: Math.max(0, newState.userProfile.projectsUsed - 1) };
          localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newState.userProfile));
      }
      newActivity = { id: generateId(), type: 'system', message: `Deleted project`, timestamp: Date.now() };
      
      if (state.currentOrg) {
          auditLog = createAuditLog(state.user?.id || 'anon', state.user?.email || 'Anonymous', 'Deleted Project', action.payload, 'warning');
      }
      break;
    case 'UNLOCK_PHASE':
      newState.unlockedPhases = Array.from(new Set([...state.unlockedPhases, action.payload]));
      break;
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
      newState.projectData = {
          ...state.projectData,
          snapshots: [...(state.projectData.snapshots || []), newSnapshot]
      };
      newActivity = { id: generateId(), type: 'snapshot', message: `Created snapshot: ${name}`, timestamp: Date.now(), projectId: state.projectData.id, projectName: state.projectData.name };
      break;
    }
    case 'RESTORE_SNAPSHOT': {
      const snapshotToRestore = state.projectData.snapshots?.find(s => s.id === action.payload);
      if (!snapshotToRestore) return state;
      newState.projectData = {
          ...state.projectData,
          ...snapshotToRestore.data,
          snapshots: state.projectData.snapshots,
          id: state.projectData.id,
          name: state.projectData.name,
          initialIdea: state.projectData.initialIdea,
          comments: state.projectData.comments,
          collaborators: state.projectData.collaborators
      };
      newActivity = { id: generateId(), type: 'snapshot', message: `Restored snapshot: ${snapshotToRestore.name}`, timestamp: Date.now(), projectId: state.projectData.id, projectName: state.projectData.name };
      
      if (state.currentOrg) {
          auditLog = createAuditLog(state.user?.id || 'anon', state.user?.email || 'Anonymous', 'Restored Snapshot', snapshotToRestore.name, 'warning');
      }
      break;
    }
    case 'DELETE_SNAPSHOT': {
      newState.projectData = {
          ...state.projectData,
          snapshots: state.projectData.snapshots?.filter(s => s.id !== action.payload) || []
      };
      break;
    }
    case 'ADD_COMMENT':
      newState.projectData = {
          ...state.projectData,
          comments: [...(state.projectData.comments || []), action.payload]
      };
      break;
    case 'RESOLVE_COMMENT':
      newState.projectData = {
          ...state.projectData,
          comments: state.projectData.comments?.map(c => 
            c.id === action.payload ? { ...c, resolved: !c.resolved } : c
          ) || []
      };
      break;
    case 'ADD_COLLABORATOR':
      newState.projectData = {
          ...state.projectData,
          collaborators: [...(state.projectData.collaborators || []), action.payload]
      };
      break;
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
        newState.projectData = { ...state.projectData, isPublished: true };
        newState.marketplace = newMarketplace;
        newActivity = { id: generateId(), type: 'publish', message: `Published blueprint`, timestamp: Date.now(), projectId: state.projectData.id, projectName: state.projectData.name };
        
        if (state.currentOrg) {
            auditLog = createAuditLog(state.user?.id || 'anon', state.user?.email || 'Anonymous', 'Published Project', state.projectData.name, 'info');
        }
        break;
    }
    case 'LIKE_PROJECT': {
        const newMarketplace = state.marketplace.map(p => 
            p.id === action.payload ? { ...p, likes: (p.likes || 0) + 1 } : p
        );
        localStorage.setItem(MARKETPLACE_KEY, JSON.stringify(newMarketplace));
        newState.marketplace = newMarketplace;
        break;
    }
    case 'IMPORT_FROM_MARKETPLACE': {
        if (state.userProfile && !canCreateProject(state.userProfile, state.projectsList.length)) {
            newState.ui.showUpgradeModal = true;
            return newState;
        }

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
            ],
            organizationId: state.currentOrg?.id
        };
        newState.projectData = newProject;
        newState.currentPhase = AppPhase.IDEA;
        newState.unlockedPhases = [AppPhase.IDEA];
        newActivity = { id: generateId(), type: 'create', message: `Forked "${action.payload.name}"`, timestamp: Date.now(), projectId: newProject.id, projectName: newProject.name };
        
        if (newState.userProfile) {
            newState.userProfile = { ...newState.userProfile, projectsUsed: newState.userProfile.projectsUsed + 1 };
            localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newState.userProfile));
        }
        
        if (state.currentOrg) {
            auditLog = createAuditLog(state.user?.id || 'anon', state.user?.email || 'Anonymous', 'Forked Project', action.payload.name);
        }
        break;
    }
    case 'SAVE_TEMPLATE': {
        const { name, description, icon } = action.payload;
        const templateData = { ...state.projectData };
        delete (templateData as any).id;
        delete templateData.chatHistory;
        delete templateData.comments;
        delete templateData.snapshots;
        delete templateData.collaborators;
        
        const newTemplate: ProjectTemplate = {
            id: generateId(),
            name,
            description,
            icon,
            projectData: templateData,
            createdAt: Date.now()
        };
        const updatedTemplates = [...state.customTemplates, newTemplate];
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updatedTemplates));
        newState.customTemplates = updatedTemplates;
        newActivity = { id: generateId(), type: 'system', message: `Saved template: ${name}`, timestamp: Date.now() };
        break;
    }
    case 'DELETE_TEMPLATE': {
        const updatedTemplates = state.customTemplates.filter(t => t.id !== action.payload);
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updatedTemplates));
        newState.customTemplates = updatedTemplates;
        break;
    }
    case 'ADD_KNOWLEDGE_DOC':
        newState.projectData = {
            ...state.projectData,
            knowledgeBase: [...(state.projectData.knowledgeBase || []), action.payload]
        };
        break;
    case 'DELETE_KNOWLEDGE_DOC':
        newState.projectData = {
            ...state.projectData,
            knowledgeBase: state.projectData.knowledgeBase?.filter(doc => doc.id !== action.payload) || []
        };
        break;
    case 'SYNC_PROJECTS_LIST':
        newState.projectsList = action.payload;
        break;
    case 'TOGGLE_PLUGIN': {
        const currentPlugins = state.projectData.activePlugins || [];
        const isEnabled = currentPlugins.includes(action.payload);
        const newPlugins = isEnabled 
            ? currentPlugins.filter(id => id !== action.payload)
            : [...currentPlugins, action.payload];
        newState.projectData = {
            ...state.projectData,
            activePlugins: newPlugins
        };
        break;
    }
    case 'UPDATE_LOCAL_ENGINE':
        newState.localEngine = { ...state.localEngine, ...action.payload };
        break;
    case 'SET_SYNC_STATUS':
        newState.syncStatus = action.payload;
        break;
    case 'SET_SELECTED_FILE':
        newState.ui = { ...state.ui, selectedFilePath: action.payload, selectedDocId: undefined, selectedNodeId: undefined };
        break;
    case 'SET_SELECTED_DOC':
        newState.ui = { ...state.ui, selectedDocId: action.payload, selectedFilePath: undefined, selectedNodeId: undefined };
        break;
    case 'SET_SELECTED_NODE':
        newState.ui = { ...state.ui, selectedNodeId: action.payload, selectedFilePath: undefined, selectedDocId: undefined };
        break;
    case 'TRIGGER_UPGRADE_MODAL':
        newState.ui = { ...state.ui, showUpgradeModal: action.payload };
        break;
    case 'TRIGGER_ORG_MODAL':
        newState.ui = { ...state.ui, showOrgModal: action.payload };
        break;
    case 'ADD_ACTIVITY':
        newActivity = action.payload;
        break;
    case 'SET_USER':
        newState.user = action.payload;
        break;
    case 'SET_USER_PROFILE':
        newState.userProfile = action.payload;
        break;
    case 'UPGRADE_TIER':
        if (newState.userProfile) {
            newState.userProfile = { 
                ...newState.userProfile, 
                tier: action.payload,
                projectsLimit: action.payload === 'Free' ? 1 : -1, 
                aiTokensLimit: action.payload === 'Free' ? 1000 : -1
            };
            localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newState.userProfile));
            newActivity = { id: generateId(), type: 'billing', message: `Upgraded to ${action.payload} Plan`, timestamp: Date.now() };
        }
        break;
    case 'SET_ONLINE_USERS':
        newState.onlineUsers = action.payload;
        break;
    case 'CREATE_ORG': {
        const newOrg: Organization = {
            id: generateId(),
            name: action.payload,
            ownerId: state.user?.id || 'anon',
            createdAt: Date.now(),
            members: [{
                userId: state.user?.id || 'anon',
                email: state.user?.email || 'anon@example.com',
                role: 'Owner',
                status: 'active',
                joinedAt: Date.now(),
                avatar: state.user?.user_metadata?.avatar_url || '👤'
            }],
            auditLogs: [] // Init empty logs
        };
        const updatedOrgs = [...state.organizations, newOrg];
        newState.organizations = updatedOrgs;
        newState.currentOrg = newOrg;
        localStorage.setItem(ORGS_KEY, JSON.stringify(updatedOrgs));
        if (newState.userProfile) {
            newState.userProfile = { ...newState.userProfile, activeOrgId: newOrg.id };
            localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newState.userProfile));
        }
        newActivity = { id: generateId(), type: 'team', message: `Created Organization: ${newOrg.name}`, timestamp: Date.now() };
        break;
    }
    case 'SWITCH_ORG': {
        const org = state.organizations.find(o => o.id === action.payload);
        if (org) {
            newState.currentOrg = org;
            if (newState.userProfile) {
                newState.userProfile = { ...newState.userProfile, activeOrgId: org.id };
                localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newState.userProfile));
            }
            newActivity = { id: generateId(), type: 'team', message: `Switched to ${org.name}`, timestamp: Date.now() };
        }
        break;
    }
    case 'ADD_ORG_MEMBER': {
        if (!state.currentOrg) return state;
        const newMember: OrganizationMember = {
            userId: generateId(), 
            email: action.payload.email,
            role: action.payload.role,
            status: 'pending',
            joinedAt: Date.now(),
            avatar: '⏳'
        };
        const updatedOrg = { ...state.currentOrg, members: [...state.currentOrg.members, newMember] };
        newState.currentOrg = updatedOrg;
        newState.organizations = state.organizations.map(o => o.id === updatedOrg.id ? updatedOrg : o);
        localStorage.setItem(ORGS_KEY, JSON.stringify(newState.organizations));
        newActivity = { id: generateId(), type: 'team', message: `Invited ${action.payload.email}`, timestamp: Date.now() };
        
        auditLog = createAuditLog(state.user?.id || 'anon', state.user?.email || 'Anonymous', 'Invited Member', action.payload.email);
        break;
    }
    case 'UPDATE_ORG_MEMBER': {
        if (!state.currentOrg) return state;
        const updatedMembers = state.currentOrg.members.map(m => 
            m.userId === action.payload.userId ? { ...m, role: action.payload.role } : m
        );
        const updatedOrg = { ...state.currentOrg, members: updatedMembers };
        newState.currentOrg = updatedOrg;
        newState.organizations = state.organizations.map(o => o.id === updatedOrg.id ? updatedOrg : o);
        localStorage.setItem(ORGS_KEY, JSON.stringify(newState.organizations));
        
        const targetMember = state.currentOrg.members.find(m => m.userId === action.payload.userId);
        auditLog = createAuditLog(state.user?.id || 'anon', state.user?.email || 'Anonymous', 'Updated Member Role', `${targetMember?.email} -> ${action.payload.role}`);
        break;
    }
    case 'REMOVE_ORG_MEMBER': {
        if (!state.currentOrg) return state;
        const targetMember = state.currentOrg.members.find(m => m.userId === action.payload);
        const updatedMembers = state.currentOrg.members.filter(m => m.userId !== action.payload);
        const updatedOrg = { ...state.currentOrg, members: updatedMembers };
        newState.currentOrg = updatedOrg;
        newState.organizations = state.organizations.map(o => o.id === updatedOrg.id ? updatedOrg : o);
        localStorage.setItem(ORGS_KEY, JSON.stringify(newState.organizations));
        newActivity = { id: generateId(), type: 'team', message: `Removed member`, timestamp: Date.now() };
        
        auditLog = createAuditLog(state.user?.id || 'anon', state.user?.email || 'Anonymous', 'Removed Member', targetMember?.email || 'Unknown User', 'warning');
        break;
    }
    default:
      return state;
  }

  // Handle Side Effects
  if (newActivity) {
      const updatedActivities = [newActivity, ...state.recentActivities].slice(0, 50); 
      newState.recentActivities = updatedActivities;
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updatedActivities));
  }

  if (auditLog && newState.currentOrg) {
      // Append log to current organization
      const updatedLogs = [auditLog, ...(newState.currentOrg.auditLogs || [])].slice(0, 100); // Keep last 100
      const updatedOrg = { ...newState.currentOrg, auditLogs: updatedLogs };
      newState.currentOrg = updatedOrg;
      newState.organizations = newState.organizations.map(o => o.id === updatedOrg.id ? updatedOrg : o);
      localStorage.setItem(ORGS_KEY, JSON.stringify(newState.organizations));
  }

  return newState;
};

const ProjectContext = createContext<{
  state: ProjectState;
  dispatch: React.Dispatch<ProjectAction>;
  currentRole: OrganizationMember['role'];
} | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  useEffect(() => {
    const init = async () => {
        try {
            await db.init();
            
            cliSync.subscribeStatus((status) => {
                dispatch({ type: 'SET_SYNC_STATUS', payload: status });
            });

            const user = await getCurrentUser();
            dispatch({ type: 'SET_USER', payload: user });

            const savedProfile = localStorage.getItem(USER_PROFILE_KEY);
            if (savedProfile) {
                dispatch({ type: 'SET_USER_PROFILE', payload: JSON.parse(savedProfile) });
            } else {
                const defaultProfile: UserProfile = {
                    id: user?.id || 'anon',
                    email: user?.email || 'anon@user.com',
                    tier: 'Free',
                    projectsUsed: 0,
                    projectsLimit: 1,
                    aiTokensUsed: 0,
                    aiTokensLimit: 1000
                };
                dispatch({ type: 'SET_USER_PROFILE', payload: defaultProfile });
            }

            const savedOrgs = localStorage.getItem(ORGS_KEY);
            if (savedOrgs) {
                const orgs = JSON.parse(savedOrgs);
                // Ensure legacy orgs have auditLogs array
                const migratedOrgs = orgs.map((o: Organization) => ({...o, auditLogs: o.auditLogs || []}));
                state.organizations = migratedOrgs;
                
                const profile = savedProfile ? JSON.parse(savedProfile) : null;
                const active = migratedOrgs.find((o: Organization) => o.id === profile?.activeOrgId) || migratedOrgs[0];
                if (active) dispatch({ type: 'SWITCH_ORG', payload: active.id });
            } else {
                dispatch({ type: 'CREATE_ORG', payload: 'Personal Workspace' });
            }

            supabase.auth.onAuthStateChange(async (event, session) => {
                dispatch({ type: 'SET_USER', payload: session?.user || null });
                const updatedList = await cloudStorage.listProjects();
                dispatch({ type: 'SYNC_PROJECTS_LIST', payload: updatedList });
            });

            const marketplace = JSON.parse(localStorage.getItem(MARKETPLACE_KEY) || '[]');
            const templates = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
            const activities = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
            
            activities.forEach((a: ActivityItem) => dispatch({ type: 'ADD_ACTIVITY', payload: a }));
            state.marketplace = marketplace;
            state.customTemplates = templates;

            const projectsList = await cloudStorage.listProjects();
            dispatch({ type: 'SYNC_PROJECTS_LIST', payload: projectsList });

            const savedStateStr = localStorage.getItem(SAVED_STATE_KEY);
            if (savedStateStr) {
                const savedState = JSON.parse(savedStateStr);
                if (savedState.projectData && savedState.projectData.id) {
                    const fullProject = await cloudStorage.loadProject(savedState.projectData.id);
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

  useEffect(() => {
      const roomId = state.projectData.id?.startsWith('pub-') ? 'lobby' : `room_${state.projectData.id}`;
      const channel = supabase.channel(roomId);
      channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            const users: PresenceUser[] = [];
            Object.values(newState).forEach((presences: any) => {
                presences.forEach((p: any) => {
                    users.push({ id: p.user_id, name: p.name, color: p.color, onlineAt: p.online_at });
                });
            });
            dispatch({ type: 'SET_ONLINE_USERS', payload: users });
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                const userColor = getRandomColor();
                await channel.track({
                    user_id: state.user?.id || `anon-${Math.random().toString(36).substr(2, 5)}`,
                    name: state.user?.email?.split('@')[0] || 'Guest Architect',
                    color: userColor,
                    online_at: Date.now()
                });
            }
        });
      return () => { supabase.removeChannel(channel); };
  }, [state.projectData.id, state.user]);

  useEffect(() => {
    localStorage.setItem(SAVED_STATE_KEY, JSON.stringify({
      currentPhase: state.currentPhase,
      projectData: { id: state.projectData.id, name: state.projectData.name }, 
      unlockedPhases: state.unlockedPhases
    }));

    const saveToStorage = async () => {
        if (state.projectData.id && !state.projectData.id.startsWith('pub-')) {
            await cloudStorage.saveProject(state.projectData);
            const list = await cloudStorage.listProjects();
            dispatch({ type: 'SYNC_PROJECTS_LIST', payload: list });
        }
    };
    const timeout = setTimeout(saveToStorage, 2000); 
    return () => clearTimeout(timeout);
  }, [state.projectData, state.currentPhase, state.unlockedPhases]);

  const currentRole = useMemo(() => {
      if (!state.currentOrg || !state.user) return 'Owner'; // Default to Owner for anon/local
      const member = state.currentOrg.members.find(m => m.userId === state.user.id);
      return member?.role || 'Viewer'; // Default safe fallback
  }, [state.currentOrg, state.user]);

  const contextValue = useMemo(() => ({ state, dispatch, currentRole }), [state, currentRole]);

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within a ProjectProvider');
  return context;
};
