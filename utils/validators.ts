
import { ArchitectureData, SchemaData, FileNode, DesignSystem } from '../types';

/**
 * Validates and sanitizes ArchitectureData.
 * Ensures critical stack properties exist to prevent UI crashes.
 */
export const validateArchitecture = (data: any): ArchitectureData => {
    if (!data || typeof data !== 'object') {
        console.warn("Invalid Architecture Data received, resetting to default.");
        return {
            stack: {
                frontend: "React",
                backend: "Node.js",
                database: "PostgreSQL",
                styling: "Tailwind CSS",
                deployment: "Vercel",
                rationale: "Fallback due to generation error."
            },
            patterns: [],
            dependencies: []
        };
    }
    
    // Ensure stack object exists
    if (!data.stack) {
        data.stack = {
            frontend: "Unknown",
            backend: "Unknown",
            database: "Unknown",
            styling: "CSS",
            deployment: "Docker",
            rationale: "Generated stack was missing."
        };
    }

    // Ensure arrays
    if (!Array.isArray(data.patterns)) data.patterns = [];
    if (!Array.isArray(data.dependencies)) data.dependencies = [];
    
    // Ensure visual layout is valid if present
    if (data.visualLayout && !Array.isArray(data.visualLayout)) data.visualLayout = [];
    if (data.visualEdges && !Array.isArray(data.visualEdges)) data.visualEdges = [];

    return data as ArchitectureData;
};

/**
 * Validates SchemaData.
 * Ensures tables and columns are arrays.
 */
export const validateSchema = (data: any): SchemaData => {
    if (!data || typeof data !== 'object') {
        return { tables: [], mermaidChart: '', prismaSchema: '', sqlSchema: '' };
    }
    
    if (!Array.isArray(data.tables)) data.tables = [];
    
    data.tables.forEach((table: any) => {
        if (!table.name) table.name = "UntitledTable";
        if (!Array.isArray(table.columns)) table.columns = [];
        table.columns.forEach((col: any) => {
            if (!col.name) col.name = "unnamed_col";
            if (!col.type) col.type = "String";
        });
    });
    
    return data as SchemaData;
};

/**
 * Validates File Structure.
 * Recursively ensures children arrays exist.
 */
export const validateFileStructure = (nodes: any[]): FileNode[] => {
    if (!Array.isArray(nodes)) return [];

    return nodes.map(node => {
        const safeNode: FileNode = {
            name: node.name || 'untitled',
            type: node.type === 'folder' ? 'folder' : 'file',
            description: node.description || '',
            content: node.content
        };

        if (safeNode.type === 'folder') {
            safeNode.children = validateFileStructure(node.children || []);
        }

        return safeNode;
    });
};

/**
 * Validates Design System.
 */
export const validateDesignSystem = (data: any): DesignSystem => {
    if (!data || typeof data !== 'object') {
        return { colorPalette: [], typography: [], coreComponents: [], layoutStrategy: '' };
    }

    if (!Array.isArray(data.colorPalette)) data.colorPalette = [];
    if (!Array.isArray(data.typography)) data.typography = [];
    if (!Array.isArray(data.coreComponents)) data.coreComponents = [];

    return data as DesignSystem;
};
