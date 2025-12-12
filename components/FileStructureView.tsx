
import React, { useState } from 'react';
import { FileNode } from '../types';
import RefineBar from './RefineBar';

interface FileStructureViewProps {
  structure?: FileNode[];
  onContinue: () => void;
  hideActions?: boolean;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
}

const FileItem: React.FC<{ node: FileNode; level: number; onSelect: (node: FileNode) => void; selectedNode: FileNode | null }> = ({ node, level, onSelect, selectedNode }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = selectedNode === node;
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    }
    onSelect(node);
  };

  return (
    <div className="select-none">
      <div 
        onClick={handleToggle}
        className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors ${
            isSelected ? 'bg-brand-secondary text-white' : 'hover:bg-slate-700/50 text-slate-300'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <span className="opacity-70 text-xs">
          {node.type === 'folder' ? (isOpen ? '📂' : '📁') : '📄'}
        </span>
        <span className={`font-mono text-sm ${node.type === 'folder' ? 'font-bold' : ''}`}>
          {node.name}
        </span>
      </div>
      {node.type === 'folder' && isOpen && node.children && (
        <div>
          {node.children.map((child, idx) => (
            <FileItem 
                key={`${child.name}-${idx}`} 
                node={child} 
                level={level + 1} 
                onSelect={onSelect}
                selectedNode={selectedNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileStructureView: React.FC<FileStructureViewProps> = ({ structure, onContinue, hideActions, onRefine, isRefining = false }) => {
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [copied, setCopied] = useState(false);

  if (!structure) return null;

  const generateASCII = (nodes: FileNode[], prefix = ''): string => {
      let output = '';
      nodes.forEach((node, index) => {
          const isLast = index === nodes.length - 1;
          const marker = isLast ? '└── ' : '├── ';
          output += `${prefix}${marker}${node.name}${node.type === 'folder' ? '/' : ''}  # ${node.description}\n`;
          if (node.children) {
              output += generateASCII(node.children, prefix + (isLast ? '    ' : '│   '));
          }
      });
      return output;
  };

  const handleCopy = () => {
      const ascii = generateASCII(structure);
      navigator.clipboard.writeText(ascii);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-slide-in-up h-full flex flex-col">
      {!hideActions && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2 text-center">Project File Structure</h2>
            <p className="text-center text-blue-200 mb-8 max-w-3xl mx-auto">
                A blueprint of your codebase. This structure informs AI coding agents where files belong.
            </p>
          </>
      )}

      {onRefine && !hideActions && (
        <div className="max-w-3xl mx-auto mb-8">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Move utils to the lib folder', 'Add Dockerfile'" 
            />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow min-h-[500px]">
        {/* Left: Tree Explorer */}
        <div className="md:col-span-2 bg-slate-900/50 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
            <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-400">EXPLORER</span>
                <button 
                    onClick={handleCopy}
                    className="text-xs px-2 py-1 bg-slate-700 hover:bg-brand-secondary text-white rounded transition-colors"
                >
                    {copied ? 'Copied ASCII!' : 'Copy Structure'}
                </button>
            </div>
            <div className="p-2 overflow-y-auto flex-grow custom-scrollbar">
                {structure.map((node, idx) => (
                    <FileItem 
                        key={idx} 
                        node={node} 
                        level={0} 
                        onSelect={setSelectedNode}
                        selectedNode={selectedNode}
                    />
                ))}
            </div>
        </div>

        {/* Right: Details Panel */}
        <div className="md:col-span-1 bg-slate-800/50 rounded-lg border border-slate-700 p-6 flex flex-col">
            <h3 className="text-lg font-bold text-brand-accent mb-4 border-b border-slate-600 pb-2">
                File Details
            </h3>
            {selectedNode ? (
                <div className="animate-fade-in">
                    <div className="mb-4">
                        <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Name</span>
                        <div className="text-xl text-white font-mono mt-1">{selectedNode.name}</div>
                    </div>
                    <div className="mb-4">
                        <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Type</span>
                        <div className="text-sm text-brand-secondary mt-1 capitalize">{selectedNode.type}</div>
                    </div>
                    <div>
                        <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Purpose</span>
                        <p className="text-blue-100 mt-2 leading-relaxed bg-slate-700/30 p-3 rounded-lg border border-slate-700/50">
                            {selectedNode.description}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="text-slate-500 text-center mt-10 italic">
                    Select a file or folder to view its architectural purpose.
                </div>
            )}
        </div>
      </div>

      {!hideActions && (
        <div className="text-center mt-8">
            <button
            onClick={onContinue}
            className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
            >
            Confirm Structure & Create Plan
            </button>
        </div>
      )}
    </div>
  );
};

export default FileStructureView;
