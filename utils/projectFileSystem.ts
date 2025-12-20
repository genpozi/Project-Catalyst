
import { ProjectData, FileNode, Task } from '../types';

export interface VirtualFile {
  path: string;
  content: string;
  source: 'scaffold' | 'task' | 'editor' | 'generator';
}

/**
 * Flattens the recursive file structure into a list of paths
 */
const flattenFileStructure = (nodes: FileNode[], parentPath = ''): { path: string, node: FileNode }[] => {
  let result: { path: string, node: FileNode }[] = [];
  nodes.forEach(node => {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    result.push({ path: currentPath, node });
    if (node.children) {
      result = [...result, ...flattenFileStructure(node.children, currentPath)];
    }
  });
  return result;
};

/**
 * Merges all project assets into a unified virtual file system for preview and export.
 */
export const buildVirtualFileSystem = (project: ProjectData): VirtualFile[] => {
  const files: Map<string, VirtualFile> = new Map();

  // 1. Base Structure from File Tree (Editor Content)
  if (project.fileStructure) {
    const flatStructure = flattenFileStructure(project.fileStructure);
    flatStructure.forEach(({ path, node }) => {
      if (node.type === 'file') {
        files.set(path, {
          path,
          content: node.content || '', // Content from FileStructureView editor
          source: node.content ? 'editor' : 'scaffold'
        });
      }
    });
  }

  // 2. Generated Task Artifacts (Higher Priority)
  if (project.tasks) {
    project.tasks.forEach(task => {
      if (task.codeSnippet && task.codeSnippet.filename && task.codeSnippet.code) {
        // Normalize path (remove leading . or /)
        const cleanPath = task.codeSnippet.filename.replace(/^\.\//, '').replace(/^\//, '');
        files.set(cleanPath, {
          path: cleanPath,
          content: task.codeSnippet.code,
          source: 'task'
        });
      }
    });
  }

  // 3. Specialized Assets (Highest Priority - Overwrites generic placeholders)
  
  // Infrastructure
  if (project.architecture?.iacCode) {
    files.set('infrastructure/main.tf', {
      path: 'infrastructure/main.tf',
      content: project.architecture.iacCode,
      source: 'generator'
    });
  }

  // Database Schema
  if (project.schema?.prismaSchema) {
    files.set('prisma/schema.prisma', {
      path: 'prisma/schema.prisma',
      content: project.schema.prismaSchema,
      source: 'generator'
    });
  }
  if (project.schema?.sqlSchema) {
    files.set('migrations/init.sql', {
      path: 'migrations/init.sql',
      content: project.schema.sqlSchema,
      source: 'generator'
    });
  }

  // DevOps
  if (project.devOpsConfig) {
    if (project.devOpsConfig.dockerfile) files.set('Dockerfile', { path: 'Dockerfile', content: project.devOpsConfig.dockerfile, source: 'generator' });
    if (project.devOpsConfig.dockerCompose) files.set('docker-compose.yml', { path: 'docker-compose.yml', content: project.devOpsConfig.dockerCompose, source: 'generator' });
    if (project.devOpsConfig.ciPipeline) files.set('.github/workflows/deploy.yml', { path: '.github/workflows/deploy.yml', content: project.devOpsConfig.ciPipeline, source: 'generator' });
  }

  // Docs
  if (project.agentRules) {
    files.set('.cursorrules', { path: '.cursorrules', content: project.agentRules, source: 'generator' });
  }

  return Array.from(files.values()).sort((a, b) => a.path.localeCompare(b.path));
};

/**
 * Inserts or updates a file node in the recursive structure given a path string.
 * @param nodes Current root nodes
 * @param filePath Path string (e.g., "src/components/Button.tsx")
 * @param content Content to save
 * @returns New array of nodes
 */
export const upsertFileNode = (nodes: FileNode[], filePath: string, content: string): FileNode[] => {
  // Normalize path
  const parts = filePath.replace(/\\/g, '/').split('/').filter(p => p.trim() !== '' && p !== '.');
  
  if (parts.length === 0) return nodes;

  const newNodes = JSON.parse(JSON.stringify(nodes)); // Deep clone
  let currentLevel = newNodes;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isFile = i === parts.length - 1;
    
    let existingNode = currentLevel.find((n: FileNode) => n.name === part);

    if (existingNode) {
      if (isFile) {
        existingNode.content = content;
        existingNode.type = 'file'; // Ensure type correctness
        // Remove children if it was somehow a folder before
        if (existingNode.children) delete existingNode.children;
      } else {
        // It's a folder, ensure children array exists
        if (!existingNode.children) existingNode.children = [];
        currentLevel = existingNode.children;
      }
    } else {
      // Create new node
      const newNode: FileNode = {
        name: part,
        type: isFile ? 'file' : 'folder',
        description: isFile ? 'Generated via Task' : 'Generated Folder',
        children: isFile ? undefined : [],
        content: isFile ? content : undefined
      };
      currentLevel.push(newNode);
      if (!isFile) {
        currentLevel = newNode.children!;
      }
    }
  }
  
  return newNodes;
};
