
export enum AppPhase {
  IDEA = 'Idea',
  BRAINSTORM = 'Brainstorm',
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

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
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
}

export interface Phase {
  phase_name: string;
  tasks: PlanTask[];
}

export interface ResearchReportData {
  summary: string;
  sources: { uri: string; title: string; }[];
}

export interface TechStack {
  frontend: string;
  backend: string;
  database: string;
  styling: string;
  deployment: string;
  rationale: string;
}

export interface ArchitectureData {
  stack: TechStack;
  patterns: string[];
  dependencies: { name: string; description: string }[];
  diagram?: string;
  cloudDiagram?: string;
  iacCode?: string;
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

export interface ComplianceRule {
  standard: string;
  requirement: string;
}

export interface SecurityContext {
  policies: SecurityPolicy[];
  testingStrategy: TestRequirement[];
  compliance: ComplianceRule[];
}

export interface CostEstimation {
  monthlyInfrastructure: { service: string; estimatedCost: string; reason: string }[];
  totalProjectHours: string;
  suggestedTeamSize: string;
  risks: { description: string; impact: string }[];
}

export interface Persona {
  role: string;
  description: string;
  painPoints: string[];
}

export interface BrainstormingData {
  questions: string[];
  usps: string[];
  personas: Persona[];
  features: string[];
}

export interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  description: string;
  data: Partial<ProjectData>;
}

export interface ProjectData {
  id: string;
  name: string;
  initialIdea: string;
  projectType?: string;
  constraints?: string;
  brainstormingResults?: BrainstormingData;
  researchReport?: ResearchReportData;
  architecture?: ArchitectureData;
  schema?: SchemaData;
  fileStructure?: FileNode[];
  designSystem?: DesignSystem;
  apiSpec?: ApiSpecification;
  securityContext?: SecurityContext;
  costEstimation?: CostEstimation;
  agentRules?: string;
  actionPlan?: Phase[];
  tasks?: Task[];
  kickoffAssets?: string;
  snapshots?: Snapshot[];
  lastUpdated: number;
}
