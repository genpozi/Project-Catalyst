
export enum AppPhase {
  IDEA = 'Idea',
  BRAINSTORM = 'Brainstorm',
  KNOWLEDGE_BASE = 'Knowledge',
  RESEARCH = 'Research',
  ARCHITECTURE = 'Architecture',
  DATAMODEL = 'Data Model',
  FILE_STRUCTURE = 'File Structure',
  UI_UX = 'UI/UX Design',
  API_SPEC = 'API Specification',
  SECURITY = 'Security & QA',
  BLUEPRINT_STUDIO = 'Blueprint Studio',
  AGENT_RULES = 'Agent Rules',
  PLAN = 'Plan',
  WORKSPACE = 'Workspace',
  DOCUMENT = 'Document',
  KICKOFF = 'Kickoff'
}

export enum TaskStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done'
}

export type SubscriptionTier = 'Free' | 'Pro' | 'Enterprise';

export interface UserProfile {
    id: string;
    email: string;
    avatar?: string;
    tier: SubscriptionTier;
    projectsUsed: number;
    projectsLimit: number;
    aiTokensUsed: number;
    aiTokensLimit: number; // -1 for unlimited
    activeOrgId?: string;
}

export interface OrganizationMember {
    userId: string;
    email: string;
    role: 'Owner' | 'Admin' | 'Member' | 'Viewer';
    avatar?: string;
    joinedAt: number;
    status: 'active' | 'pending';
}

export interface AuditLogEntry {
    id: string;
    actorId: string;
    actorName: string;
    action: string;
    target: string;
    timestamp: number;
    severity: 'info' | 'warning' | 'critical';
}

export interface Organization {
    id: string;
    name: string;
    ownerId: string;
    members: OrganizationMember[];
    auditLogs: AuditLogEntry[];
    createdAt: number;
}

export interface ActivityItem {
  id: string;
  type: 'create' | 'update' | 'snapshot' | 'publish' | 'system' | 'billing' | 'team';
  message: string;
  timestamp: number;
  projectId?: string;
  projectName?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskCodeSnippet {
  language: string;
  code: string;
  filename: string;
  description: string;
}

export interface PlanTask {
  description: string;
  estimatedDuration: string;
  priority: 'High' | 'Medium' | 'Low';
  role: string;
}

export interface Task extends PlanTask {
  id: string;
  content: string; // Maps to description
  status: TaskStatus;
  phase: string;
  implementationGuide?: string;
  checklist?: ChecklistItem[];
  codeSnippet?: TaskCodeSnippet;
}

export interface Phase {
  phase_name: string;
  tasks: PlanTask[];
}

export interface Competitor {
  name: string;
  url: string;
  strengths: string[];
  weaknesses: string[];
  priceModel: string;
}

export interface ResearchReportData {
  summary: string;
  sources: { uri: string; title: string; }[];
  competitors?: Competitor[];
}

export interface TechStack {
  frontend: string;
  backend: string;
  database: string;
  styling: string;
  deployment: string;
  rationale: string;
}

export interface ArchitectureNode {
  id: string;
  x: number;
  y: number;
  width?: number; // Added for resizing
  height?: number; // Added for resizing
  type: 'frontend' | 'backend' | 'database' | 'service' | 'deployment' | 'cache' | 'queue' | 'external';
  label: string;
  description?: string;
  linkedPath?: string;
  linkedDocId?: string;
}

export interface ArchitectureEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  protocol?: 'HTTP' | 'WS' | 'gRPC' | 'TCP' | 'JDBC' | 'AMQP';
}

export interface ArchitectureData {
  stack: TechStack;
  patterns: string[];
  dependencies: { name: string; description: string }[];
  diagram?: string;
  cloudDiagram?: string;
  iacCode?: string;
  visualLayout?: ArchitectureNode[]; 
  visualEdges?: ArchitectureEdge[];  
}

export interface SchemaColumn {
  name: string;
  type: string;
  constraints?: string;
  description: string;
}

export interface SchemaTable {
  name: string;
  description: string;
  columns: SchemaColumn[];
  x?: number;
  y?: number;
}

export interface SchemaData {
  tables: SchemaTable[];
  mermaidChart: string;
  prismaSchema: string;
  sqlSchema: string;
}

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  description: string;
  children?: FileNode[];
  content?: string;
}

export interface ColorPalette {
  name: string;
  hex: string;
  usage: string;
}

export interface ComponentSpec {
  name: string;
  description: string;
  states: string[];
}

export interface DesignSystem {
  colorPalette: ColorPalette[];
  typography: { role: string; fontFamily: string; size: string }[];
  coreComponents: ComponentSpec[];
  layoutStrategy: string;
  wireframeCode?: string;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  summary: string;
  requestBody?: string;
  responseSuccess?: string;
}

export interface ApiSpecification {
  endpoints: ApiEndpoint[];
  authMechanism: string;
}

export interface SecurityPolicy {
  name: string;
  description: string;
  implementationHint: string;
}

export interface TestRequirement {
  name: string;
  type: 'Unit' | 'Integration' | 'E2E';
  description: string;
}

export interface ComplianceItem {
  id: string;
  standard: string; 
  requirement: string;
  action: string;
  status: 'Pending' | 'Met' | 'N/A';
}

export interface RBACMatrix {
  roles: string[];
  resources: string[];
  permissions: {
    role: string;
    resource: string;
    actions: ('create' | 'read' | 'update' | 'delete')[];
  }[];
}

export interface SecurityHeader {
    name: string;
    value: string;
    status: 'compliant' | 'warning' | 'missing';
    description: string;
}

export interface RateLimitConfig {
    strategy: 'fixed-window' | 'token-bucket' | 'leaky-bucket';
    limit: number;
    windowInSeconds: number;
    provider: 'redis' | 'cloudflare' | 'nginx' | 'middleware';
}

export interface SecurityContext {
  policies: SecurityPolicy[];
  testingStrategy: TestRequirement[];
  complianceChecklist: ComplianceItem[];
  rbacMatrix?: RBACMatrix;
  securityHeaders?: SecurityHeader[];
  rateLimitConfig?: RateLimitConfig;
}

export interface CostEstimation {
  monthlyInfrastructure: { service: string; estimatedCost: string; reason: string }[];
  totalProjectHours: string;
  suggestedTeamSize: string;
  risks: { description: string; impact: string }[];
}

export interface DevOpsConfig {
  dockerfile: string;
  dockerCompose: string;
  ciPipeline: string; 
  deploymentGuide: string;
}

export interface Persona {
  role: string;
  description: string;
  painPoints: string[];
}

export interface UserJourney {
  personaRole: string;
  goal: string;
  steps: string[];
}

export interface BrainstormingData {
  questions: string[];
  usps: string[];
  personas: Persona[];
  userJourneys?: UserJourney[];
  features: string[];
}

export interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  description: string;
  data: Partial<ProjectData>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  agentId?: string; // e.g. 'ARCHITECT', 'SECURITY', 'CHAIRPERSON'
  proposal?: Partial<ProjectData>; // Actionable state changes
  proposalSummary?: string; // Explanation of the proposal
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  avatar?: string;
  timestamp: number;
  section: string;
  resolved: boolean;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Owner' | 'Editor' | 'Viewer';
  status: 'active' | 'offline';
}

export interface PresenceUser {
    id: string;
    name: string;
    color: string;
    onlineAt: number;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'code' | 'policy';
  tags: string[];
  addedAt: number;
}

export interface PluginDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  category: 'DevOps' | 'Code' | 'Docs' | 'Security';
  execute: (project: ProjectData) => Promise<{ filename: string; content: string }[]>;
}

export interface AgentRuleConfig {
  tone: 'Concise' | 'Detailed' | 'Educational';
  language: string;
  documentationStyle: 'JSDoc' | 'Inline' | 'Minimal';
  errorHandling: 'TryCatch' | 'ResultType' | 'Defensive';
  testingFramework: string;
  preferredPatterns: string[];
}

export interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    projectData: Partial<ProjectData>;
    createdAt: number;
}

export interface GitHubConfig {
    repoOwner: string;
    repoName: string;
    branch: string;
}

export interface ProjectData {
  id: string;
  name: string;
  initialIdea: string;
  projectType?: string;
  constraints?: string;
  brainstormingResults?: BrainstormingData;
  knowledgeBase?: KnowledgeDoc[];
  researchReport?: ResearchReportData;
  architecture?: ArchitectureData;
  schema?: SchemaData;
  fileStructure?: FileNode[];
  designSystem?: DesignSystem;
  apiSpec?: ApiSpecification;
  securityContext?: SecurityContext;
  costEstimation?: CostEstimation;
  devOpsConfig?: DevOpsConfig;
  agentRules?: string;
  agentRuleConfig?: AgentRuleConfig; 
  actionPlan?: Phase[];
  tasks?: Task[];
  kickoffAssets?: string;
  snapshots?: Snapshot[];
  chatHistory?: ChatMessage[];
  comments?: Comment[];
  collaborators?: Collaborator[];
  lastUpdated: number;
  isPublished?: boolean;
  author?: string;
  tags?: string[];
  likes?: number;
  activePlugins?: string[];
  githubConfig?: GitHubConfig;
  organizationId?: string; // New: Link to Organization
}

export interface LocalEngineState {
    status: 'unloaded' | 'loading' | 'ready' | 'error';
    progress: string;
    progressPhase: 'init' | 'cache' | 'fetch' | 'load';
    progressValue: number; 
    memoryUsage?: string;
}

export type SyncStatus = 'connected' | 'disconnected' | 'connecting';

export interface CLIEvent {
    type: 'tree' | 'file_change' | 'ping';
    payload: any;
    timestamp: number;
}
