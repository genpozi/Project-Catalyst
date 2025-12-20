import { ProjectData, FileNode, Task, KnowledgeDoc } from '../types';

interface DocumentChunk {
  id: string;
  type: 'file' | 'task' | 'doc' | 'spec' | 'vision';
  title: string;
  content: string;
  tokens: Set<string>;
}

export class SimpleVectorStore {
  private chunks: DocumentChunk[] = [];
  private stopWords = new Set(['the', 'is', 'and', 'or', 'a', 'an', 'in', 'to', 'for', 'of', 'with', 'on', 'at', 'by', 'from']);

  constructor() {}

  private tokenize(text: string): Set<string> {
    return new Set(
      text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !this.stopWords.has(w))
    );
  }

  public indexProject(project: ProjectData) {
    this.chunks = [];

    // Index Initial Idea
    this.addChunk('vision', 'Project Vision', project.initialIdea);

    // Index Architecture
    if (project.architecture?.stack) {
        const stackStr = Object.entries(project.architecture.stack)
            .map(([k, v]) => `${k}: ${v}`).join('\n');
        this.addChunk('spec', 'Tech Stack', stackStr);
        this.addChunk('spec', 'Architecture Rationale', project.architecture.stack.rationale);
    }

    // Index Files
    if (project.fileStructure) {
        this.traverseFiles(project.fileStructure);
    }

    // Index Tasks
    project.tasks?.forEach(task => {
        this.addChunk('task', `Task: ${task.content}`, `${task.description} ${task.role} ${task.priority}`);
    });

    // Index Knowledge Base
    project.knowledgeBase?.forEach(doc => {
        this.addChunk('doc', doc.title, doc.content);
    });

    console.log(`[LocalRAG] Indexed ${this.chunks.length} documents.`);
  }

  private traverseFiles(nodes: FileNode[], path = '') {
      nodes.forEach(node => {
          const currentPath = path ? `${path}/${node.name}` : node.name;
          if (node.type === 'file' && node.content) {
              this.addChunk('file', currentPath, node.content);
          }
          if (node.children) {
              this.traverseFiles(node.children, currentPath);
          }
      });
  }

  private addChunk(type: DocumentChunk['type'], title: string, content: string) {
      if (!content || !content.trim()) return;
      this.chunks.push({
          id: Math.random().toString(36).substring(7),
          type,
          title,
          content,
          tokens: this.tokenize(`${title} ${content}`)
      });
  }

  public search(query: string, limit = 3): { title: string; content: string; score: number }[] {
      const queryTokens = this.tokenize(query);
      if (queryTokens.size === 0) return [];

      const results = this.chunks.map(chunk => {
          let hits = 0;
          queryTokens.forEach(token => {
              if (chunk.tokens.has(token)) hits++;
          });
          // Jaccard Similarity-ish
          const score = hits / (queryTokens.size + chunk.tokens.size - hits);
          return { ...chunk, score };
      });

      return results
          .filter(r => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(r => ({ title: r.title, content: r.content, score: r.score }));
  }
}

export const localVectorStore = new SimpleVectorStore();