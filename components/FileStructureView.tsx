
import React, { useState, useEffect, useMemo } from 'react';
import { FileNode, ArchitectureData, AppPhase } from '../types';
import RefineBar from './RefineBar';
import { GeminiService } from '../GeminiService';
import { useProject } from '../ProjectContext';
import { useToast } from './Toast';
import CodeEditor from './CodeEditor';
import DiffViewer from './DiffViewer';

interface FileStructureViewProps {
  structure?: FileNode[];
  architecture?: ArchitectureData;
  onUpdate?: (newStructure: FileNode[]) => void;
  onContinue: () => void;
  hideActions?: boolean;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
  readOnly?: boolean;
}

const FileItem: React.FC<{ 
    node: FileNode; 
    path: string;
    level: number; 
    onSelect: (node: FileNode) => void; 
    selectedNode: FileNode | null;
    onDelete: (path: string) => void;
    onAdd: (path: string, type: 'file' | 'folder') => void;
    forceOpen?: boolean;
    isReadOnly?: boolean;
}> = ({ node, path, level, onSelect, selectedNode, onDelete, onAdd, forceOpen, isReadOnly }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = selectedNode === node;
  const currentPath = path ? `${path}/${node.name}` : node.name;
  
  useEffect(() => {
      if(forceOpen) setIsOpen(true);
  }, [forceOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node);
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    }
  };

  const handleAction = (e: React.MouseEvent, action: 'delete' | 'addFile' | 'addFolder') => {
      e.stopPropagation();
      if (action === 'delete') onDelete(currentPath);
      if (action === 'addFile') onAdd(currentPath, 'file');
      if (action === 'addFolder') onAdd(currentPath, 'folder');
  };

  return (
    <div className="select-none">
      <div 
        onClick={handleToggle}
        className={`group flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors ${
            isSelected ? 'bg-brand-primary text-white' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        id={`file-node-${currentPath.replace(/\//g, '-')}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
            <span className="opacity-70 text-[10px] flex-shrink-0">
            {node.type === 'folder' ? (isOpen ? '📂' : '📁') : '📄'}
            </span>
            <span className={`font-mono text-xs truncate ${node.type === 'folder' ? 'font-bold' : ''}`}>
            {node.name}
            </span>
        </div>
        
        {!isReadOnly && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {node.type === 'folder' && (
                    <>
                        <button onClick={(e) => handleAction(e, 'addFile')} title="Add File" className="p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-white">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </button>
                        <button onClick={(e) => handleAction(e, 'addFolder')} title="Add Folder" className="p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-white">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                        </button>
                    </>
                )}
                <button onClick={(e) => handleAction(e, 'delete')} title="Delete" className="p-0.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        )}
      </div>
      {node.type === 'folder' && isOpen && node.children && (
        <div>
          {node.children.map((child, idx) => (
            <FileItem 
                key={`${child.name}-${idx}`} 
                node={child} 
                path={currentPath}
                level={level + 1} 
                onSelect={onSelect}
                selectedNode={selectedNode}
                onDelete={onDelete}
                onAdd={onAdd}
                forceOpen={forceOpen}
                isReadOnly={isReadOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileStructureView: React.FC<FileStructureViewProps> = ({ structure, architecture, onUpdate, onContinue, hideActions, onRefine, isRefining = false, readOnly = false }) => {
  const { state, dispatch } = useProject();
  const { addToast } = useToast();
  
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>('');
  
  const [editorContent, setEditorContent] = useState('');
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const gemini = React.useMemo(() => new GeminiService(), []);

  useEffect(() => {
      if (selectedNode) {
          setEditorContent(selectedNode.content || '');
          setPendingContent(null); 
      } else {
          setEditorContent('');
          setPendingContent(null);
      }
  }, [selectedNode]);

  useEffect(() => {
      if (state.ui.selectedFilePath && structure) {
          const findNode = (nodes: FileNode[], pathParts: string[]): FileNode | null => {
              if (pathParts.length === 0) return null;
              const [current, ...rest] = pathParts;
              const match = nodes.find(n => n.name === current);
              if (match) {
                  if (rest.length === 0) return match;
                  if (match.children) return findNode(match.children, rest);
              }
              return null;
          };

          const targetNode = findNode(structure, state.ui.selectedFilePath.split('/'));
          if (targetNode) {
              setSelectedNode(targetNode);
              setSelectedPath(state.ui.selectedFilePath);
          }
      }
  }, [state.ui.selectedFilePath, structure]);

  const linkedArchitectureNode = useMemo(() => {
      if (!selectedPath || !architecture?.visualLayout) return null;
      return architecture.visualLayout.find(n => n.linkedPath === selectedPath);
  }, [selectedPath, architecture]);

  if (!structure) return null;

  const handleNodeSelect = (node: FileNode) => {
      setSelectedNode(node);
      
      const findPath = (nodes: FileNode[], target: FileNode, currentPath: string): string | null => {
          for (const n of nodes) {
              const fullPath = currentPath ? `${currentPath}/${n.name}` : n.name;
              if (n === target) return fullPath;
              if (n.children) {
                  const found = findPath(n.children, target, fullPath);
                  if (found) return found;
              }
          }
          return null;
      };
      
      const fullPath = findPath(structure, node, '');
      if (fullPath) {
          setSelectedPath(fullPath);
          if (state.ui.selectedFilePath !== fullPath) {
              dispatch({ type: 'SET_SELECTED_FILE', payload: fullPath });
          }
      }
  };

  const handleGoToNode = (nodeId: string) => {
      dispatch({ type: 'SET_SELECTED_NODE', payload: nodeId });
      dispatch({ type: 'SET_PHASE', payload: AppPhase.ARCHITECTURE });
  };

  const handleDelete = (pathToDelete: string) => {
      if (!onUpdate || readOnly) return;
      
      const deleteNode = (nodes: FileNode[], currentPath: string): FileNode[] => {
          return nodes.filter(node => {
              const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;
              if (nodePath === pathToDelete) return false;
              if (node.children) {
                  node.children = deleteNode(node.children, nodePath);
              }
              return true;
          });
      };
      
      const newStructure = deleteNode(JSON.parse(JSON.stringify(structure)), '');
      onUpdate(newStructure);
      if (selectedNode?.name === pathToDelete.split('/').pop()) setSelectedNode(null);
  };

  const handleAdd = (parentPath: string, type: 'file' | 'folder') => {
      if (!onUpdate || readOnly) return;
      const name = prompt(`Enter ${type} name:`);
      if (!name) return;

      const addNode = (nodes: FileNode[], currentPath: string): FileNode[] => {
          return nodes.map(node => {
              const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;
              if (nodePath === parentPath && node.type === 'folder') {
                  const newNode: FileNode = {
                      name,
                      type,
                      description: 'Manually added',
                      children: type === 'folder' ? [] : undefined
                  };
                  return { ...node, children: [...(node.children || []), newNode] };
              }
              if (node.children) {
                  return { ...node, children: addNode(node.children, nodePath) };
              }
              return node;
          });
      };

      const newStructure = addNode(JSON.parse(JSON.stringify(structure)), '');
      onUpdate(newStructure);
  };

  const handleAddRoot = () => {
    if(!onUpdate || readOnly) return;
    const name = prompt("Enter root folder/file name:");
    if(!name) return;
    const type = confirm("Is this a folder?") ? 'folder' : 'file';
    
    const newNode: FileNode = {
        name,
        type: type as 'file' | 'folder',
        description: 'Manually added root item',
        children: type === 'folder' ? [] : undefined
    };
    onUpdate([...structure, newNode]);
  };

  const handleSaveContent = () => {
      if (!selectedNode || !onUpdate || readOnly) return;
      
      const updateContent = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
              if (node === selectedNode) {
                  return { ...node, content: editorContent };
              }
              if (node.children) {
                  return { ...node, children: updateContent(node.children) };
              }
              return node;
          });
      };

      const newStructure = updateContent(JSON.parse(JSON.stringify(structure)));
      onUpdate(newStructure);
      selectedNode.content = editorContent; 
      addToast("File saved", "success");
  };

  const handleGeneratePreview = async () => {
      if (!selectedNode || readOnly) return;
      setIsGenerating(true);
      try {
          const content = await gemini.generateFilePreview(selectedNode, state.projectData);
          
          if (editorContent && editorContent.trim().length > 0) {
              setPendingContent(content);
              addToast("Generated content ready for review", "info");
          } else {
              setEditorContent(content);
              selectedNode.content = content;
              handleSaveContent();
          }
      } catch (e) {
          addToast("Failed to generate preview", "error");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleAcceptDiff = () => {
      if (pendingContent !== null && selectedNode && !readOnly) {
          setEditorContent(pendingContent);
          selectedNode.content = pendingContent;
          handleSaveContent();
          setPendingContent(null);
          addToast("Generated content accepted", "success");
      }
  };

  const handleDiscardDiff = () => {
      setPendingContent(null);
      addToast("Generated content discarded", "info");
  };

  const shouldForceOpen = !!state.ui.selectedFilePath;

  return (
    <div className="animate-fade-in flex flex-col h-full overflow-hidden">
      
      {/* Header Section */}
      <div className="flex-shrink-0 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Code Structure</h2>
                <p className="text-xs text-glass-text-secondary">Project filesystem and implementation stubs.</p>
            </div>
          </div>

          {onRefine && !hideActions && !readOnly && (
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Move utils to the lib folder', 'Add Dockerfile'" 
                className="mb-2"
            />
          )}
      </div>

      <div className="flex-grow min-h-0 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Tree Explorer */}
        <div className="md:col-span-1 bg-slate-900/50 rounded-xl border border-white/5 flex flex-col overflow-hidden">
            <div className="bg-black/20 px-3 py-2 border-b border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-bold text-glass-text-secondary uppercase tracking-wider">File Explorer</span>
                <div className="flex gap-2">
                    {onUpdate && !readOnly && (
                        <button 
                            onClick={handleAddRoot}
                            className="text-[10px] px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white rounded transition-colors border border-white/10"
                            title="Add Root Item"
                        >
                            +
                        </button>
                    )}
                </div>
            </div>
            <div className="p-2 overflow-y-auto flex-grow custom-scrollbar">
                {structure.length === 0 && (
                    <div className="text-center text-slate-500 py-10 text-xs italic">Empty structure. Add a root item.</div>
                )}
                {structure.map((node, idx) => (
                    <FileItem 
                        key={idx} 
                        node={node} 
                        path=""
                        level={0} 
                        onSelect={handleNodeSelect}
                        selectedNode={selectedNode}
                        onDelete={handleDelete}
                        onAdd={handleAdd}
                        forceOpen={shouldForceOpen}
                        isReadOnly={readOnly}
                    />
                ))}
            </div>
        </div>

        {/* Right: Code Editor / Details Panel */}
        <div className="md:col-span-2 bg-[#0b0e14] rounded-xl border border-white/5 flex flex-col overflow-hidden relative shadow-inner">
            {selectedNode ? (
                <>
                    <div className="bg-[#151b26] px-4 py-2 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-glass-text-secondary">{selectedNode.type === 'file' ? '📄' : '📂'}</span>
                            <span className="text-xs font-bold text-white font-mono">{selectedNode.name}</span>
                            {pendingContent && <span className="text-[9px] bg-yellow-500/20 text-yellow-200 px-2 py-0.5 rounded animate-pulse">Review Mode</span>}
                        </div>
                        <div className="flex gap-2 items-center">
                            {linkedArchitectureNode && (
                                <button
                                    onClick={() => handleGoToNode(linkedArchitectureNode.id)}
                                    className="text-[10px] bg-brand-primary/20 hover:bg-brand-primary/40 text-brand-primary px-2 py-1 rounded transition-all border border-brand-primary/30 flex items-center gap-1"
                                    title="View associated architecture component"
                                >
                                    <span>📦</span> Node
                                </button>
                            )}
                            {selectedNode.type === 'file' && !readOnly && (
                                <button 
                                    onClick={handleGeneratePreview}
                                    disabled={isGenerating}
                                    className="text-[10px] bg-brand-primary/20 hover:bg-brand-primary/40 text-brand-primary border border-brand-primary/50 px-2 py-1 rounded transition-all flex items-center gap-1"
                                >
                                    {isGenerating ? <div className="w-2 h-2 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div> : '⚡'}
                                    {editorContent ? 'Regenerate' : 'Generate'}
                                </button>
                            )}
                            {!readOnly && (
                                <button 
                                    onClick={handleSaveContent}
                                    className="text-[10px] bg-slate-700 hover:bg-white text-slate-300 hover:text-black px-3 py-1 rounded transition-all font-bold"
                                >
                                    Save
                                </button>
                            )}
                        </div>
                    </div>

                    {pendingContent && !readOnly && (
                        <div className="bg-yellow-900/20 border-b border-yellow-700/30 px-4 py-2 flex items-center justify-between">
                            <span className="text-[10px] text-yellow-200">AI generated new content. Review changes below:</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleDiscardDiff}
                                    className="px-2 py-1 text-[10px] font-bold bg-slate-700 text-slate-300 hover:text-white rounded hover:bg-slate-600 transition-colors"
                                >
                                    Discard
                                </button>
                                <button 
                                    onClick={handleAcceptDiff}
                                    className="px-2 py-1 text-[10px] font-bold bg-green-600 text-white rounded hover:bg-green-500 transition-colors shadow-lg"
                                >
                                    Accept Changes
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex-grow relative bg-[#0b0e14] overflow-hidden">
                        {selectedNode.type === 'folder' ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                                <span className="text-4xl mb-2 opacity-50">📂</span>
                                <p className="text-xs">Folder selected. Choose a file to view content.</p>
                            </div>
                        ) : pendingContent ? (
                            <div className="absolute inset-0">
                                <DiffViewer 
                                    oldCode={editorContent} 
                                    newCode={pendingContent} 
                                    language={selectedNode.name.split('.').pop()}
                                />
                            </div>
                        ) : (
                            <CodeEditor 
                                value={editorContent}
                                onChange={!readOnly ? setEditorContent : undefined}
                                language={selectedNode.name.split('.').pop()}
                                readOnly={readOnly}
                                placeholder={isGenerating ? "Generating preview..." : "// File content is empty."}
                            />
                        )}
                        
                        {isGenerating && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
                                <div className="bg-[#1e293b] p-4 rounded-xl border border-white/10 flex flex-col items-center shadow-2xl">
                                    <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                                    <span className="text-xs font-bold text-white">Coding...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-600">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                        <span className="text-2xl">📝</span>
                    </div>
                    <p className="text-xs">Select a file to preview or edit its code.</p>
                </div>
            )}
        </div>
      </div>

      {/* Footer Action */}
      {!hideActions && !readOnly && (
        <div className="flex-shrink-0 pt-4 flex justify-end">
            <button
            onClick={onContinue}
            className="px-6 py-2 bg-white/5 hover:bg-brand-primary text-white text-xs font-bold rounded-lg border border-white/10 transition-all flex items-center gap-2"
            >
            <span>Next: UI/UX Design</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
        </div>
      )}
    </div>
  );
};

export default FileStructureView;
