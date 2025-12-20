
import React, { useState, useEffect, useMemo } from 'react';
import { ProjectData } from '../types';
import { buildVirtualFileSystem, VirtualFile } from '../utils/projectFileSystem';
import CodeEditor from './CodeEditor';

interface CodebaseViewerProps {
  projectData: ProjectData;
}

const CodebaseViewer: React.FC<CodebaseViewerProps> = ({ projectData }) => {
  const [selectedFile, setSelectedFile] = useState<VirtualFile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fileSystem = useMemo(() => buildVirtualFileSystem(projectData), [projectData]);

  const filteredFiles = fileSystem.filter(f => 
    f.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Select first file on load
  useEffect(() => {
    if (filteredFiles.length > 0 && !selectedFile) {
      setSelectedFile(filteredFiles[0]);
    }
  }, [filteredFiles, selectedFile]);

  const getSourceColor = (source: string) => {
      switch(source) {
          case 'task': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
          case 'generator': return 'text-green-400 bg-green-400/10 border-green-400/20';
          case 'editor': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
          default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
      }
  };

  const getSourceLabel = (source: string) => {
      switch(source) {
          case 'task': return 'Agent Task';
          case 'generator': return 'Auto-Gen';
          case 'editor': return 'Manual';
          case 'scaffold': return 'Scaffold';
          default: return source;
      }
  };

  return (
    <div className="flex h-[600px] bg-[#0b0e14] rounded-xl border border-white/5 overflow-hidden">
      {/* Sidebar: File List */}
      <div className="w-80 flex-shrink-0 bg-slate-900/50 border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
            <h3 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider mb-3">Project Files ({fileSystem.length})</h3>
            <input 
                type="text" 
                placeholder="Search files..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0f172a] border border-glass-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary transition-all"
            />
        </div>
        <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredFiles.map(file => (
                <div 
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`group px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-all ${
                        selectedFile?.path === file.path 
                        ? 'bg-brand-primary/20 text-white' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <svg className="w-4 h-4 flex-shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="text-xs font-mono truncate">{file.path}</span>
                    </div>
                    {file.source !== 'scaffold' && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border ${getSourceColor(file.source)}`}>
                            {getSourceLabel(file.source).charAt(0)}
                        </span>
                    )}
                </div>
            ))}
            {filteredFiles.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-600">No matching files.</div>
            )}
        </div>
        <div className="p-2 border-t border-white/5 bg-black/20 flex justify-between text-[9px] text-slate-500 px-4">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Task</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> System</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Editor</span>
        </div>
      </div>

      {/* Main: Code View */}
      <div className="flex-grow flex flex-col bg-[#0b0e14] relative">
        {selectedFile ? (
            <>
                <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#151b26]">
                    <span className="text-xs font-mono text-slate-300">{selectedFile.path}</span>
                    <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getSourceColor(selectedFile.source)}`}>
                            {getSourceLabel(selectedFile.source)}
                        </span>
                        <button 
                            onClick={() => navigator.clipboard.writeText(selectedFile.content)}
                            className="text-xs text-slate-500 hover:text-white transition-colors"
                        >
                            Copy
                        </button>
                    </div>
                </div>
                <div className="flex-grow overflow-hidden relative">
                    <CodeEditor 
                        value={selectedFile.content || '// Empty file generated by scaffold'}
                        readOnly={true}
                        language={selectedFile.path.split('.').pop()}
                    />
                </div>
            </>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <div className="text-4xl mb-4">📂</div>
                <p>Select a file to preview code.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default CodebaseViewer;
