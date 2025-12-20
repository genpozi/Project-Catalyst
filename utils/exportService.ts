
import { ProjectData, ProjectTemplate } from '../types';
import { db } from './db';
import JSZip from 'jszip';

export interface WorkspaceBackup {
  version: number;
  timestamp: number;
  projects: ProjectData[];
  templates: ProjectTemplate[];
  settings: Record<string, any>;
}

/**
 * Creates a JSON file containing all local data.
 */
export const exportWorkspaceBackup = async (): Promise<Blob> => {
  const projects = await db.getAllProjectsMeta();
  const fullProjects: ProjectData[] = [];
  
  for (const meta of projects) {
    const p = await db.getProject(meta.id);
    if (p) fullProjects.push(p);
  }

  const templates = JSON.parse(localStorage.getItem('0relai-templates') || '[]');
  
  // Gather settings from localStorage
  const settingsKeys = ['0relai-opt-in', '0relai-onboarding-completed'];
  const settings: Record<string, any> = {};
  settingsKeys.forEach(k => {
      const val = localStorage.getItem(k);
      if(val) settings[k] = val;
  });

  const backup: WorkspaceBackup = {
    version: 1,
    timestamp: Date.now(),
    projects: fullProjects,
    templates,
    settings
  };

  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
};

/**
 * Restores a workspace backup.
 */
export const importWorkspaceBackup = async (file: File): Promise<{ projects: number; templates: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = e.target?.result as string;
        const backup = JSON.parse(json) as WorkspaceBackup;

        if (!backup.version || !Array.isArray(backup.projects)) {
            throw new Error("Invalid backup format");
        }

        // Restore Projects
        for (const p of backup.projects) {
            await db.saveProject(p);
        }

        // Restore Templates
        const currentTemplates = JSON.parse(localStorage.getItem('0relai-templates') || '[]');
        // Merge without duplicates based on ID
        const mergedTemplates = [...currentTemplates];
        backup.templates.forEach(t => {
            if (!mergedTemplates.find(ct => ct.id === t.id)) {
                mergedTemplates.push(t);
            }
        });
        localStorage.setItem('0relai-templates', JSON.stringify(mergedTemplates));

        // Restore Settings
        if (backup.settings) {
            Object.entries(backup.settings).forEach(([k, v]) => {
                localStorage.setItem(k, v);
            });
        }

        resolve({ projects: backup.projects.length, templates: backup.templates.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
};

/**
 * Generates a ZIP of Markdown files (Obsidian/Notion compatible).
 */
export const generateMarkdownVault = async (project: ProjectData): Promise<Blob> => {
  const zip = new JSZip();
  const folder = zip.folder(project.name.replace(/[^a-zA-Z0-9-_]/g, '')) || zip;

  // 00-Index.md
  folder.file('00-Index.md', `# ${project.name}\n\n**Vision:** ${project.initialIdea}\n\n## Navigation\n- [[01-Strategy]]\n- [[02-Architecture]]\n- [[03-Data-Model]]\n- [[04-API]]\n- [[05-Security]]`);

  // 01-Strategy.md
  const strategyContent = `# Strategic Foundation\n\n## Personas\n${project.brainstormingResults?.personas.map(p => `### ${p.role}\n${p.description}\n**Pain Points:**\n${p.painPoints.map(pp => `- ${pp}`).join('\n')}`).join('\n\n')}\n\n## User Journeys\n${project.brainstormingResults?.userJourneys?.map(j => `### ${j.goal}\n**Actor:** ${j.personaRole}\n\nSteps:\n${j.steps.map((s, i) => `${i+1}. ${s}`).join('\n')}`).join('\n\n')}`;
  folder.file('01-Strategy.md', strategyContent);

  // 02-Architecture.md
  const arch = project.architecture;
  const archContent = `# Architecture\n\n## Stack\n- **Frontend:** ${arch?.stack.frontend}\n- **Backend:** ${arch?.stack.backend}\n- **DB:** ${arch?.stack.database}\n- **Infra:** ${arch?.stack.deployment}\n\n> ${arch?.stack.rationale}\n\n## Diagram\n\`\`\`mermaid\n${arch?.cloudDiagram || 'graph TD; A-->B;'}\n\`\`\``;
  folder.file('02-Architecture.md', archContent);

  // 03-Data-Model.md
  const dataContent = `# Data Model\n\n## Schema\n\`\`\`mermaid\n${project.schema?.mermaidChart || ''}\n\`\`\`\n\n## SQL\n\`\`\`sql\n${project.schema?.sqlSchema}\n\`\`\``;
  folder.file('03-Data-Model.md', dataContent);

  // 04-API.md
  const apiContent = `# API Specification\n\n**Auth:** ${project.apiSpec?.authMechanism}\n\n${project.apiSpec?.endpoints.map(e => `## ${e.method} ${e.path}\n${e.summary}`).join('\n\n')}`;
  folder.file('04-API.md', apiContent);

  // 05-Security.md
  const secContent = `# Security & QA\n\n## Policies\n${project.securityContext?.policies.map(p => `- **${p.name}**: ${p.description}`).join('\n')}`;
  folder.file('05-Security.md', secContent);

  // Tasks Folder
  const tasksFolder = folder.folder('Tasks');
  project.tasks?.forEach(task => {
      const taskContent = `# ${task.content}\n\n**Status:** ${task.status}\n**Priority:** ${task.priority}\n**Assignee:** ${task.role}\n\n## Description\n${task.description}\n\n## Implementation Guide\n${task.implementationGuide || 'N/A'}`;
      tasksFolder?.file(`TASK-${task.id}.md`, taskContent);
  });

  // Docs Folder
  const docsFolder = folder.folder('Knowledge-Base');
  project.knowledgeBase?.forEach(doc => {
      docsFolder?.file(`${doc.title.replace(/[^a-zA-Z0-9]/g, '-')}.md`, `# ${doc.title}\n\nTags: #${doc.tags.join(' #')}\n\n${doc.content}`);
  });

  return await zip.generateAsync({ type: 'blob' });
};
