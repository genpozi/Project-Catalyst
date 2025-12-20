
import React, { useState } from 'react';
import { ghSync } from '../utils/githubSync';
import { GeminiService } from '../GeminiService';
import { useProject } from '../ProjectContext';
import { useToast } from './Toast';
import { AppPhase } from '../types';

interface ImportRepoModalProps {
  onClose: () => void;
}

const ImportRepoModal: React.FC<ImportRepoModalProps> = ({ onClose }) => {
  const { dispatch } = useProject();
  const { addToast } = useToast();
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState('');

  const gemini = React.useMemo(() => new GeminiService(), []);

  const handleImport = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!owner || !repo) return;

      setIsImporting(true);
      
      try {
          // 1. Fetch Tree
          setStatus('Fetching file structure...');
          const tree = await ghSync.getRepoTree(owner, repo, branch);
          
          // 2. Fetch Key Files for Context
          setStatus('Reading configuration...');
          const readme = await ghSync.getFileContent(owner, repo, 'README.md');
          const pkgJson = await ghSync.getFileContent(owner, repo, 'package.json');

          // 3. AI Analysis
          setStatus('Reverse engineering blueprint...');
          const analysis = await gemini.reverseEngineerProject(tree, readme, pkgJson);

          // 4. Generate Visual Layout (Graph)
          // This ensures the user doesn't land on an empty architecture canvas
          let visualLayout = undefined;
          let visualEdges = undefined;
          
          if (analysis.architecture?.stack) {
              setStatus('Visualizing system architecture...');
              try {
                  const graph = await gemini.generateGraphLayout(analysis.architecture.stack);
                  visualLayout = graph.nodes;
                  visualEdges = graph.edges;
              } catch (e) {
                  console.warn("Failed to auto-generate graph layout during import", e);
              }
          }

          // 5. Finalize Project Data
          setStatus('Finalizing...');
          const newProject = {
              id: `import-${Date.now()}`,
              name: repo,
              initialIdea: analysis.initialIdea || `Imported from ${owner}/${repo}`,
              projectType: analysis.projectType || 'Imported Codebase',
              fileStructure: tree,
              architecture: { 
                  ...analysis.architecture,
                  visualLayout,
                  visualEdges
              } as any,
              lastUpdated: Date.now(),
              githubConfig: { repoOwner: owner, repoName: repo, branch },
              // Initialize empty arrays for safety
              snapshots: [],
              comments: [],
              tasks: [],
              collaborators: [{ id: 'me', name: 'You', email: '', role: 'Owner', avatar: '😎', status: 'active' }]
          };

          // 6. Load
          dispatch({ type: 'LOAD_PROJECT', payload: newProject as any });
          dispatch({ type: 'SET_PHASE', payload: AppPhase.ARCHITECTURE }); // Jump to Arch view to show inferred stack
          
          addToast("Repository imported successfully!", "success");
          onClose();

      } catch (err: any) {
          console.error(err);
          addToast(`Import failed: ${err.message}`, "error");
          setStatus('Error occurred.');
      } finally {
          setIsImporting(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-[#0f172a] border border-glass-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-glass-border bg-slate-900/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    Import Repository
                </h3>
                <button onClick={onClose} className="text-glass-text-secondary hover:text-white">✕</button>
            </div>

            <div className="p-6">
                <p className="text-sm text-blue-200 mb-6 bg-blue-900/20 p-3 rounded-lg border border-blue-500/30">
                    Enter a public GitHub repository. 0relai will scan the file structure and reverse-engineer an architectural blueprint.
                </p>

                <form onSubmit={handleImport} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Owner</label>
                            <input 
                                value={owner}
                                onChange={(e) => setOwner(e.target.value)}
                                className="w-full glass-input rounded-lg px-3 py-2 text-sm"
                                placeholder="facebook"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Repo</label>
                            <input 
                                value={repo}
                                onChange={(e) => setRepo(e.target.value)}
                                className="w-full glass-input rounded-lg px-3 py-2 text-sm"
                                placeholder="react"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Branch</label>
                        <input 
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            className="w-full glass-input rounded-lg px-3 py-2 text-sm"
                            placeholder="main"
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isImporting}
                        className="w-full py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isImporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                <span>{status}</span>
                            </>
                        ) : (
                            'Analyze & Import'
                        )}
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};

export default ImportRepoModal;
