
import React, { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { ProjectData, FileNode } from '../types';
import JSZip from 'jszip';
import { GeminiService } from '../GeminiService';
import { useProject } from '../ProjectContext';

interface KickoffViewProps {
  assets?: string;
  projectData: ProjectData;
  onGenerate: () => void;
}

const KickoffView: React.FC<KickoffViewProps> = ({ assets, projectData, onGenerate }) => {
  const [isZipping, setIsZipping] = useState(false);
  const gemini = React.useMemo(() => new GeminiService(), []);
  const { dispatch } = useProject();

  const getCommentSyntax = (filename: string, content: string): string | null => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.json') || lower.endsWith('.txt') || lower.endsWith('.md')) return null;
    if (lower.endsWith('.html') || lower.endsWith('.xml') || lower.endsWith('.svg')) return `<!-- ${content} -->`;
    if (lower.endsWith('.css')) return `/* ${content} */`;
    if (lower.endsWith('.py') || lower.endsWith('.sh') || lower.endsWith('.rb') || lower.endsWith('.yaml') || lower.endsWith('.yml') || lower.endsWith('.toml') || lower.endsWith('.dockerfile') || lower.includes('dockerfile') || lower.endsWith('.tf')) return `# ${content}`;
    return `// ${content}`;
  };

  const generateScaffoldScript = (nodes: FileNode[]): string => {
    let script = '#!/bin/bash\n\n# 0relai - Auto-Generated Scaffold Script\n# This script creates the directory structure defined in your blueprint.\n\n';
    script += 'echo "🚀 0relai: Initializing project structure..."\n\n';
    
    const traverse = (nodes: FileNode[], path: string) => {
      nodes.forEach(node => {
        const fullPath = path ? `${path}/${node.name}` : node.name;
        if (node.type === 'folder') {
          script += `mkdir -p "${fullPath}"\n`;
          if (node.children) traverse(node.children, fullPath);
        } else {
          script += `touch "${fullPath}"\n`;
          const comment = getCommentSyntax(node.name, node.description.replace(/"/g, '\\"'));
          if (comment) script += `echo "${comment}" >> "${fullPath}"\n`;
        }
      });
    };

    if (nodes) traverse(nodes, '.');
    script += '\nchmod +x scaffold.sh\necho "✅ 0relai: Scaffolding complete! Structure is ready for implementation."\n';
    return script;
  };

  const generateDockerCompose = () => {
    // Robust access to database choice
    const dbRaw = projectData.architecture?.stack?.database;
    const db = dbRaw ? dbRaw.toLowerCase() : 'postgres';
    
    let dbService = '';
    
    if (db.includes('postgres')) {
      dbService = `
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: ${projectData.name.toLowerCase().replace(/\s+/g, '_')}
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data`;
    } else if (db.includes('mongo')) {
      dbService = `
  db:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - db-data:/data/db`;
    } else if (db.includes('redis')) {
      dbService = `
  cache:
    image: redis:alpine
    ports:
      - "6379:6379"`;
    } else {
      // Default to Postgres if unrecognized
      dbService = `
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: app_db
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data`;
    }

    return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=\${DATABASE_URL}
    depends_on:
      - db
${dbService}

volumes:
  db-data:`;
  };

  const handleDownloadBundle = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // --- Intelligent Code Forge Generation ---
      // 1. Generate Manifest (package.json / requirements.txt)
      try {
        const manifest = await gemini.generateProjectManifest(projectData);
        if (manifest.filename && manifest.content) {
            zip.file(manifest.filename, manifest.content);
        }
      } catch (e) { console.warn("Manifest gen failed", e); }

      // 2. Generate Git Script
      try {
        const gitScript = await gemini.generateGitScript(projectData);
        zip.file("setup_repo.sh", gitScript);
      } catch (e) { console.warn("Git script gen failed", e); }


      // --- Standard Assets ---
      // 3. Structure & Scripts
      if (projectData.fileStructure) {
        zip.file("scaffold.sh", generateScaffoldScript(projectData.fileStructure));
      }

      // 4. Intelligence & Protocols
      if (projectData.agentRules) {
        zip.file(".cursorrules", projectData.agentRules);
        zip.file("docs/AI_SYSTEM_PROMPT.md", projectData.agentRules);
      }

      // 5. Data & Infrastructure
      if (projectData.schema) {
        if (projectData.schema.prismaSchema) zip.file("prisma/schema.prisma", projectData.schema.prismaSchema);
        if (projectData.schema.sqlSchema) zip.file("migrations/init.sql", projectData.schema.sqlSchema);
      }
      zip.file("docker-compose.yml", generateDockerCompose());

      if (projectData.architecture?.iacCode) {
        zip.file("infrastructure/main.tf", projectData.architecture.iacCode);
      }

      // 6. API & Design Documentation
      if (projectData.apiSpec) {
        const apiMd = `# API Specification\n\nAuth: ${projectData.apiSpec.authMechanism}\n\n` + 
          projectData.apiSpec.endpoints.map(e => `## ${e.method} ${e.path}\n${e.summary}\n\nRequest:\n\`\`\`json\n${e.requestBody || '{}'}\n\`\`\`\n\nResponse:\n\`\`\`json\n${e.responseSuccess || '{}'}\n\`\`\``).join('\n\n');
        zip.file("docs/API_SPEC.md", apiMd);
      }

      if (projectData.designSystem) {
        zip.file("docs/DESIGN_SYSTEM.json", JSON.stringify(projectData.designSystem, null, 2));
        if (projectData.designSystem.wireframeCode) {
            zip.file("docs/prototype.html", projectData.designSystem.wireframeCode);
        }
      }

      // 7. Documentation
      zip.file("README.md", `# ${projectData.name}\n\n${projectData.initialIdea}\n\n## Stack\n- Frontend: ${projectData.architecture?.stack?.frontend || 'N/A'}\n- Backend: ${projectData.architecture?.stack?.backend || 'N/A'}\n- DB: ${projectData.architecture?.stack?.database || 'N/A'}\n\n## Setup\n1. Run \`./scaffold.sh\`\n2. Run \`docker-compose up\`\n3. Initialize Git: \`./setup_repo.sh\``);
      zip.file("blueprint-metadata.json", JSON.stringify(projectData, null, 2));
      
      if (assets) {
        zip.file("docs/KICKOFF_BRIEFING.md", assets);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectData.name.toLowerCase().replace(/\s+/g, '-')}-0relai-bundle.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error("Failed to zip", e);
      alert("Bundle generation failed.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="animate-slide-in-up">
      <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-6 text-center">Project Handover</h2>
      
      {!assets ? (
        <div className="text-center py-12 glass-panel rounded-3xl border-brand-primary/20 border">
          <div className="w-24 h-24 bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-primary/30 relative">
             <div className="absolute inset-0 bg-brand-primary/10 rounded-full animate-ping"></div>
             <span className="text-5xl relative z-10">🚀</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Architectural Blueprint Finalized</h3>
          <p className="text-lg text-blue-200 mb-8 max-w-xl mx-auto px-4">
            All layers of the stack have been engineered. Ready to compile the final developer bundle and kickoff instructions.
          </p>
          <button
            onClick={onGenerate}
            className="px-10 py-4 glass-button-primary text-white font-bold text-lg rounded-2xl shadow-xl hover:scale-105 transition-all"
          >
            Initiate Final Handover
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
             <div className="glass-panel p-8 rounded-3xl">
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                    <span className="text-2xl">📝</span>
                    <h3 className="text-2xl font-bold text-white">Kickoff Briefing</h3>
                </div>
                <MarkdownRenderer content={assets} />
             </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
             <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl border border-brand-secondary/40 shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-secondary/10 rounded-full blur-3xl group-hover:bg-brand-secondary/20 transition-all"></div>
                
                <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-12 h-12 bg-brand-secondary/20 rounded-xl flex items-center justify-center">
                        <span className="text-3xl">📦</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white">Full Handover Bundle</h3>
                </div>

                <p className="text-sm text-slate-300 mb-8 relative z-10 leading-relaxed">
                    This encrypted ZIP contains everything a professional developer or AI agent needs to build your project from scratch.
                </p>
                
                <div className="space-y-3 mb-8 relative z-10">
                    {[
                      'Complete File Scaffold Script',
                      'Dependency Manifest (package.json/etc)',
                      'Intelligent Agent Rules (.cursorrules)',
                      'Database Schema (SQL & Prisma)',
                      'Git Initialization Script (GitHub CLI)',
                      'Docker Infrastructure (IaC)',
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm text-slate-400">
                          <svg className="w-4 h-4 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <span>{item}</span>
                      </div>
                    ))}
                </div>

                <button
                    onClick={handleDownloadBundle}
                    disabled={isZipping}
                    className="w-full py-4 glass-button-primary text-white font-bold rounded-2xl shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all relative z-10"
                >
                    {isZipping ? (
                        <div className="flex items-center gap-2">
                             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                             <span>Minting Codebase...</span>
                        </div>
                    ) : (
                        <>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span className="text-lg">Download ZIP Bundle</span>
                        </>
                    )}
                </button>
             </div>

             <div className="bg-brand-primary/10 p-6 rounded-3xl border border-brand-primary/30 text-center backdrop-blur-md">
                <h4 className="font-bold text-brand-accent mb-2 flex items-center justify-center gap-2">
                    <span className="text-lg">💡</span> Pro Tip
                </h4>
                <p className="text-sm text-blue-100 leading-relaxed">
                    Run <code className="bg-black/30 px-1 rounded">./setup_repo.sh</code> immediately after unzipping to sync with GitHub.
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KickoffView;
