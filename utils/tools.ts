import { FunctionDeclaration, Type } from '@google/genai';
import { ProjectData } from '../types';
import { localVectorStore } from './simpleVectorStore';

// Define the Tool Interface
export interface AgentTool {
    declaration: FunctionDeclaration;
    execute: (args: any, project: ProjectData) => Promise<any>;
}

// --- Tool Definitions ---

const queryKnowledgeBase: AgentTool = {
    declaration: {
        name: 'queryKnowledgeBase',
        description: 'Search the project knowledge base and docs for specific information, guidelines, or legacy context.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: {
                    type: Type.STRING,
                    description: 'The search query string.'
                }
            },
            required: ['query']
        }
    },
    execute: async ({ query }, project) => {
        // Ensure index is fresh
        if (localVectorStore['chunks'].length === 0) localVectorStore.indexProject(project);
        
        const results = localVectorStore.search(query, 5);
        if (results.length === 0) return "No relevant documents found.";
        
        return results.map(r => `[Source: ${r.title}]\n${r.content.substring(0, 500)}...`).join('\n\n');
    }
};

const readProjectFile: AgentTool = {
    declaration: {
        name: 'readProjectFile',
        description: 'Read the content of a specific file in the project file structure.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: {
                    type: Type.STRING,
                    description: 'The relative path to the file (e.g., "src/App.tsx" or "package.json").'
                }
            },
            required: ['path']
        }
    },
    execute: async ({ path }, project) => {
        if (!project.fileStructure) return "No file structure defined.";

        const findFile = (nodes: any[], targetPath: string): string | null => {
            for (const node of nodes) {
                // Simplified matching: check if node name matches end of path
                // In a real generic fs, we'd track full path. 
                // For now, we assume flattened structure or simple recursive search by name.
                if (node.type === 'file' && (node.name === targetPath || targetPath.endsWith(node.name))) {
                    return node.content || "(Empty File)";
                }
                if (node.children) {
                    const found = findFile(node.children, targetPath);
                    if (found) return found;
                }
            }
            return null;
        };

        const content = findFile(project.fileStructure, path);
        return content || `File '${path}' not found in project structure.`;
    }
};

const checkSecurityPolicies: AgentTool = {
    declaration: {
        name: 'checkSecurityPolicies',
        description: 'Retrieve the defined security policies and compliance requirements.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        }
    },
    execute: async (_, project) => {
        if (!project.securityContext) return "No security context defined.";
        return JSON.stringify(project.securityContext, null, 2);
    }
};

// --- Registry ---

export const TOOL_REGISTRY: Record<string, AgentTool> = {
    queryKnowledgeBase,
    readProjectFile,
    checkSecurityPolicies
};

export const getToolsForRole = (roleId: string): AgentTool[] => {
    // Role-Based Access Control for Tools
    switch (roleId) {
        case 'ARCHITECT':
            return [queryKnowledgeBase, readProjectFile];
        case 'SECURITY':
            return [queryKnowledgeBase, readProjectFile, checkSecurityPolicies];
        case 'DEVOPS':
            return [readProjectFile]; // DevOps cares about config files
        case 'CHAIRPERSON':
            return [queryKnowledgeBase]; // Chairperson verifies facts
        default:
            return [];
    }
};