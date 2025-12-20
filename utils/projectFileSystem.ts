
import { ProjectData, FileNode, Task } from '../types';
import { generateTailwindConfig, generateOpenApiSpec } from './codeGenerators';

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
 * PRIORITY ORDER (Lowest to Highest):
 * 1. AI Generators (IaC, DB, DevOps, Docs)
 * 2. Deterministic Generators (Tailwind, OpenAPI) -> NEW
 * 3. Task Code Snippets
 * 4. Explicit File Structure (User Manual Edits)
 */
export const buildVirtualFileSystem = (project: ProjectData): VirtualFile[] => {
  const files: Map<string, VirtualFile> = new Map();

  // 1. Specialized Assets (AI Generators) - Lowest Priority
  
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

  // 2. Deterministic Generators (NEW)
  if (project.designSystem) {
      const tailwindConfig = generateTailwindConfig(project.designSystem);
      if (tailwindConfig) {
          files.set('tailwind.config.js', {
              path: 'tailwind.config.js',
              content: tailwindConfig,
              source: 'generator'
          });
      }
  }

  if (project.apiSpec) {
      const openApiJson = generateOpenApiSpec(project.apiSpec, project.name);
      if (openApiJson) {
          files.set('docs/openapi.json', {
              path: 'docs/openapi.json',
              content: openApiJson,
              source: 'generator'
          });
      }
  }

  // 3. Generated Task Artifacts
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

  // 4. Base Structure from File Tree (User/Editor Content) - Highest Priority
  if (project.fileStructure) {
    const flatStructure = flattenFileStructure(project.fileStructure);
    flatStructure.forEach(({ path, node }) => {
      if (node.type === 'file' && node.content) {
        files.set(path, {
          path,
          content: node.content,
          source: 'editor'
        });
      }
    });
  }

  return Array.from(files.values()).sort((a, b) => a.path.localeCompare(b.path));
};

/**
 * Inserts or updates a file node in the recursive structure given a path string.
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
        description: isFile ? 'Saved File' : 'Folder',
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

/**
 * Takes the current virtual file system (which includes generated assets) and
 * persists EVERYTHING into the project.fileStructure.
 */
export const consolidateProjectFiles = (project: ProjectData): FileNode[] => {
    const vfs = buildVirtualFileSystem(project);
    let structure = project.fileStructure ? JSON.parse(JSON.stringify(project.fileStructure)) : [];

    vfs.forEach(file => {
        structure = upsertFileNode(structure, file.path, file.content);
    });

    return structure;
};
