
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

export interface PlanTask {
  description: string;
  estimatedDuration: string;
  priority: 'High' | 'Medium' | 'Low';
  role: string;
}

export interface Task extends PlanTask {
  id: string;
  content: string; // Maps to description for backward compatibility/UI logic
  status: TaskStatus;
  phase: string;
  implementationGuide?: string; // Markdown content for specific execution steps
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
  patterns: string[]; // e.g., "Microservices", "SSR"
  dependencies: { name: string; description: string }[];
  diagram?: string; // Mermaid code placeholder for future
}

export interface SchemaColumn {
  name: string;
  type: string;
  constraints?: string; // e.g. "PRIMARY KEY", "NOT NULL"
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
  states: string[]; // e.g. "Hover", "Active", "Loading"
}

export interface DesignSystem {
  colorPalette: ColorPalette[];
  typography: { role: string; fontFamily: string; size: string }[];
  coreComponents: ComponentSpec[];
  layoutStrategy: string;
}

export interface ApiEndpoint {
  method: string; // GET, POST, etc.
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
  name: string; // e.g., "Row Level Security: Posts"
  description: string; // "Users can only edit their own posts."
  implementationHint: string; // "Use Supabase RLS policies"
}

export interface TestRequirement {
  name: string; // "User Login Flow"
  type: 'Unit' | 'Integration' | 'E2E';
  description: string;
}

export interface ComplianceRule {
  standard: string; // "GDPR", "OWASP"
  requirement: string; // "Encrypt PII at rest"
}

export interface SecurityContext {
  policies: SecurityPolicy[];
  testingStrategy: TestRequirement[];
  compliance: ComplianceRule[];
}

export interface Persona {
  role: string;
  description: string;
  painPoints: string[];
}

export interface BrainstormingData {
  questions: string[];
  usps: string[]; // Unique Selling Propositions
  personas: Persona[];
  features: string[];
}

export interface ProjectData {
  initialIdea: string;
  projectType?: string; // e.g. "Web App", "Mobile App"
  constraints?: string; // User defined technical constraints
  brainstormingResults?: BrainstormingData;
  researchReport?: ResearchReportData;
  architecture?: ArchitectureData;
  schema?: SchemaData;
  fileStructure?: FileNode[];
  designSystem?: DesignSystem;
  apiSpec?: ApiSpecification;
  securityContext?: SecurityContext;
  agentRules?: string;
  actionPlan?: Phase[];
  tasks?: Task[];
  kickoffAssets?: string;
}
