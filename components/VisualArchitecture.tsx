
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ArchitectureData, ArchitectureNode, ArchitectureEdge, FileNode, AppPhase } from '../types';
import { useProject } from '../ProjectContext';
import { GeminiService } from '../GeminiService';

export interface NodeStatusMap {
  [id: string]: {
    status: 'ok' | 'warning' | 'critical';
    message?: string;
  };
}

interface VisualArchitectureProps {
  architecture: ArchitectureData;
  onUpdate: (data: ArchitectureData) => void;
  onSyncToSpec?: (nodes: ArchitectureNode[], edges: ArchitectureEdge[]) => Promise<void>;
  onGenerateFromSpec?: () => Promise<void>;
  nodeStatuses?: NodeStatusMap;
  fileStructure?: FileNode[];
  readOnly?: boolean;
}

const VisualArchitecture: React.FC<VisualArchitectureProps> = ({ architecture, onUpdate, onSyncToSpec, onGenerateFromSpec, nodeStatuses = {}, fileStructure = [], readOnly = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<ArchitectureNode[]>([]);
  const [edges, setEdges] = useState<ArchitectureEdge[]>([]);
  
  // Access global context for navigation
  const { state, dispatch } = useProject();
  const gemini = useMemo(() => new GeminiService(), []);
  
  // Interaction State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Connection Mode State
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Sync local selection to global context
  useEffect(() => {
      if (state.ui.selectedNodeId !== selectedId) {
          dispatch({ type: 'SET_SELECTED_NODE', payload: selectedId || undefined });
      }
  }, [selectedId, dispatch, state.ui.selectedNodeId]);

  // Flatten file structure for dropdown
  const folderPaths = useMemo(() => {
      const paths: string[] = [];
      const traverse = (nodes: FileNode[], prefix = '') => {
          nodes.forEach(node => {
              const path = prefix ? `${prefix}/${node.name}` : node.name;
              if (node.type === 'folder') {
                  paths.push(path);
                  if (node.children) traverse(node.children, path);
              }
          });
      };
      traverse(fileStructure);
      return paths;
  }, [fileStructure]);

  // Initialize Graph Data
  useEffect(() => {
    if (!architecture.stack) return;

    if (architecture.visualLayout && architecture.visualLayout.length > 0) {
      setNodes(architecture.visualLayout);
    } else {
      const defaults: ArchitectureNode[] = [
        { id: 'frontend', type: 'frontend', label: architecture.stack.frontend || 'Frontend', x: 100, y: 150 },
        { id: 'backend', type: 'backend', label: architecture.stack.backend || 'Backend', x: 400, y: 150 },
        { id: 'database', type: 'database', label: architecture.stack.database || 'Database', x: 700, y: 150 },
      ];
      setNodes(defaults);
    }

    if (architecture.visualEdges && architecture.visualEdges.length > 0) {
      setEdges(architecture.visualEdges);
    } else {
      const defaults: ArchitectureEdge[] = [
        { id: 'e1', from: 'frontend', to: 'backend', protocol: 'HTTP' },
        { id: 'e2', from: 'backend', to: 'database', protocol: 'TCP' },
      ];
      setEdges(defaults);
    }
  }, [architecture.stack, architecture.visualLayout, architecture.visualEdges]);

  // --- Handlers ---

  const handleSyncToSpec = async () => {
      if(!onSyncToSpec || readOnly) return;
      setIsSyncing(true);
      await onSyncToSpec(nodes, edges);
      setIsSyncing(false);
  };

  const handleGenerateFromSpec = async () => {
      if(!onGenerateFromSpec || readOnly) return;
      if(nodes.length > 0 && !confirm("This will overwrite your current visual layout. Continue?")) return;
      
      setIsGenerating(true);
      await onGenerateFromSpec();
      setIsGenerating(false);
  };

  const handleOptimizeLayout = async () => {
      if (readOnly || isOptimizing) return;
      setIsOptimizing(true);
      try {
          const simpleNodes = nodes.map(n => ({ id: n.id, label: n.label, type: n.type }));
          const simpleEdges = edges.map(e => ({ from: e.from, to: e.to }));
          const response = await gemini.optimizeGraphLayout(simpleNodes, simpleEdges, 'architecture');
          if (Array.isArray(response)) {
              const updatedNodes = nodes.map(n => {
                  const optimized = response.find(r => r.id === n.id);
                  return optimized ? { ...n, x: optimized.x, y: optimized.y } : n;
              });
              setNodes(updatedNodes);
              onUpdate({ ...architecture, visualLayout: updatedNodes });
          }
      } catch (e) { console.error("Auto-layout failed", e); } finally { setIsOptimizing(false); }
  };

  const handleExportPNG = async () => {
      if (!containerRef.current) return;
      try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const width = 1200;
          const height = 800;
          const svgData = new XMLSerializer().serializeToString(containerRef.current.querySelector('svg')!);
          
          let nodesSvg = '';
          nodes.forEach(n => {
              let fill = '#1e293b'; 
              if (n.type === 'frontend') fill = '#083344'; 
              if (n.type === 'backend') fill = '#3b0764'; 
              if (n.type === 'database') fill = '#431407'; 
              
              nodesSvg += `
                <g transform="translate(${n.x}, ${n.y})">
                    <rect width="200" height="64" rx="8" fill="${fill}" stroke="#334155" stroke-width="1" fill-opacity="0.9" />
                    <text x="40" y="25" fill="#f1f5f9" font-family="sans-serif" font-size="14" font-weight="bold">${n.label}</text>
                    <text x="40" y="45" fill="#94a3b8" font-family="sans-serif" font-size="10" font-weight="bold" text-transform="uppercase">${n.type}</text>
                </g>
              `;
          });

          const fullSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${-pan.x} ${-pan.y} ${width} ${height}">
                <style>text { font-family: sans-serif; }</style>
                <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#4f46e5" /></marker></defs>
                ${edges.map(e => {
                    const start = getNodeCenter(e.from);
                    const end = getNodeCenter(e.to);
                    if (!start || !end) return '';
                    const dx = end.x - start.x;
                    const cp1 = { x: start.x + dx / 2, y: start.y };
                    const cp2 = { x: end.x - dx / 2, y: end.y };
                    return `<path d="M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}" stroke="#4f46e5" stroke-width="2" fill="none" marker-end="url(#arrowhead)" opacity="0.6" />`;
                }).join('')}
                ${nodesSvg}
            </svg>
          `;

          const img = new Image();
          const svgBlob = new Blob([fullSvg], {type: 'image/svg+xml;charset=utf-8'});
          const url = URL.createObjectURL(svgBlob);
          
          img.onload = () => {
              canvas.width = width;
              canvas.height = height;
              if (ctx) {
                  ctx.fillStyle = '#0b0e14';
                  ctx.fillRect(0, 0, width, height);
                  ctx.drawImage(img, 0, 0);
              }
              URL.revokeObjectURL(url);
              const a = document.createElement('a');
              a.download = `architecture-diagram.png`;
              a.href = canvas.toDataURL('image/png');
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
          };
          img.src = url;
      } catch (e) { console.error("Export failed", e); }
  };

  // --- Drag and Drop Creation ---
  const handleDragStartFromPalette = (e: React.DragEvent, type: ArchitectureNode['type']) => {
      e.dataTransfer.setData('nodeType', type);
      e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropOnCanvas = (e: React.DragEvent) => {
      e.preventDefault();
      if (readOnly) return;
      const type = e.dataTransfer.getData('nodeType') as ArchitectureNode['type'];
      if (type) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
              const x = e.clientX - rect.left - pan.x - 100; // Center node
              const y = e.clientY - rect.top - pan.y - 32;
              handleAddNode(type, x, y);
          }
      }
  };

  const handleDragOverCanvas = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
  };

  const handleAddNode = (type: ArchitectureNode['type'], x: number, y: number) => {
    if (readOnly) return;
    const id = `node-${Date.now()}`;
    const newNode: ArchitectureNode = {
      id,
      type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      x,
      y
    };
    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);
    onUpdate({ ...architecture, visualLayout: updatedNodes });
  };

  const handleDelete = () => {
    if (!selectedId || readOnly) return;
    const updatedNodes = nodes.filter(n => n.id !== selectedId);
    const updatedEdges = edges.filter(e => e.from !== selectedId && e.to !== selectedId);
    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setSelectedId(null);
    onUpdate({ ...architecture, visualLayout: updatedNodes, visualEdges: updatedEdges });
  };

  const updateSelectedNode = (updates: Partial<ArchitectureNode>) => {
    if (!selectedId || readOnly) return;
    const updatedNodes = nodes.map(n => n.id === selectedId ? { ...n, ...updates } : n);
    setNodes(updatedNodes);
    onUpdate({ ...architecture, visualLayout: updatedNodes });
  };

  const updateActiveEdge = (updates: Partial<ArchitectureEdge>) => {
      if (!activeEdgeId || readOnly) return;
      const updatedEdges = edges.map(e => e.id === activeEdgeId ? { ...e, ...updates } : e);
      setEdges(updatedEdges);
      onUpdate({ ...architecture, visualEdges: updatedEdges });
  };

  const handleDeleteEdge = () => {
      if (!activeEdgeId || readOnly) return;
      const updatedEdges = edges.filter(e => e.id !== activeEdgeId);
      setEdges(updatedEdges);
      onUpdate({ ...architecture, visualEdges: updatedEdges });
      setActiveEdgeId(null);
  };

  const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (readOnly) {
        setSelectedId(id);
        return;
    }
    if (e.shiftKey) {
        setConnectingNodeId(id);
    } else {
        setSelectedId(id);
        const node = nodes.find(n => n.id === id);
        if (node) {
            setDraggingId(id);
            setDragOffset({
                x: e.clientX - node.x - pan.x,
                y: e.clientY - node.y - pan.y
            });
        }
    }
  };

  const handleMouseUpNode = (e: React.MouseEvent, targetId: string) => {
      e.stopPropagation();
      if (readOnly) return;
      if (connectingNodeId && connectingNodeId !== targetId) {
          const newEdge: ArchitectureEdge = {
              id: `edge-${Date.now()}`,
              from: connectingNodeId,
              to: targetId,
              protocol: 'HTTP' // Default
          };
          const updatedEdges = [...edges, newEdge];
          setEdges(updatedEdges);
          onUpdate({ ...architecture, visualEdges: updatedEdges });
          setConnectingNodeId(null);
          // Auto-select new edge to configure
          setActiveEdgeId(newEdge.id);
      }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setSelectedId(null);
    setActiveEdgeId(null);
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left - pan.x, y: e.clientY - rect.top - pan.y });
    }
    if (draggingId && !readOnly) {
      setNodes(prev => prev.map(n => n.id === draggingId ? { ...n, x: e.clientX - pan.x - dragOffset.x, y: e.clientY - pan.y - dragOffset.y } : n));
    } else if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  }, [draggingId, isPanning, dragOffset, pan, startPan, readOnly]);

  const handleMouseUp = useCallback(() => {
    if (draggingId && !readOnly) onUpdate({ ...architecture, visualLayout: nodes });
    setDraggingId(null);
    setIsPanning(false);
    setConnectingNodeId(null);
  }, [draggingId, nodes, onUpdate, architecture, readOnly]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // --- Navigation Actions ---
  const handleJumpToCode = () => {
      if(activeNode?.linkedPath) {
          dispatch({ type: 'SET_SELECTED_FILE', payload: activeNode.linkedPath });
          dispatch({ type: 'SET_PHASE', payload: AppPhase.FILE_STRUCTURE });
      }
  };

  const handleReadDoc = () => {
      if(activeNode?.linkedDocId) {
          dispatch({ type: 'SET_SELECTED_DOC', payload: activeNode.linkedDocId });
          dispatch({ type: 'SET_PHASE', payload: AppPhase.KNOWLEDGE_BASE });
      }
  };

  // --- Render Helpers ---
  const getNodeCenter = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + 100, y: node.y + 32 };
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'frontend': return '💻';
          case 'backend': return '⚙️';
          case 'database': return '🗄️';
          case 'cache': return '⚡';
          case 'queue': return '📨';
          case 'deployment': return '🚀';
          case 'external': return '🌐';
          default: return '📦';
      }
  };

  const getColor = (type: string, status?: 'ok' | 'warning' | 'critical') => {
      if (status === 'critical') return 'border-red-500 bg-red-900/40 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse';
      if (status === 'warning') return 'border-yellow-500 bg-yellow-900/30 text-yellow-100 shadow-[0_0_15px_rgba(234,179,8,0.3)]';
      switch(type) {
          case 'frontend': return 'border-cyan-500/50 bg-cyan-900/20 text-cyan-200';
          case 'backend': return 'border-purple-500/50 bg-purple-900/20 text-purple-200';
          case 'database': return 'border-orange-500/50 bg-orange-900/20 text-orange-200';
          case 'cache': return 'border-yellow-500/50 bg-yellow-900/20 text-yellow-200';
          case 'queue': return 'border-pink-500/50 bg-pink-900/20 text-pink-200';
          default: return 'border-slate-500/50 bg-slate-900/50 text-slate-200';
      }
  };

  const activeNode = nodes.find(n => n.id === selectedId);
  const activeEdge = edges.find(e => e.id === activeEdgeId);

  return (
    <div className="flex h-full gap-4 relative">
        {/* Resource Palette */}
        {!readOnly && (
            <div className="w-20 flex flex-col gap-2 items-center bg-slate-900/50 border border-white/5 rounded-xl p-2 h-fit relative z-10 select-none">
                <div className="text-[9px] uppercase font-bold text-glass-text-secondary text-center mb-1">Resources</div>
                {[
                    { type: 'frontend', icon: '💻', title: 'Client' },
                    { type: 'backend', icon: '⚙️', title: 'Service' },
                    { type: 'database', icon: '🗄️', title: 'DB' },
                    { type: 'cache', icon: '⚡', title: 'Cache' },
                    { type: 'queue', icon: '📨', title: 'Queue' },
                    { type: 'external', icon: '🌐', title: 'API' },
                ].map((item) => (
                    <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => handleDragStartFromPalette(e, item.type as any)}
                        className="w-12 h-12 flex flex-col items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 hover:text-white text-xl transition-all border border-transparent hover:border-white/20 cursor-grab active:cursor-grabbing"
                        title={`Drag ${item.title}`}
                    >
                        <span>{item.icon}</span>
                        <span className="text-[8px] font-bold mt-0.5">{item.title}</span>
                    </div>
                ))}
            </div>
        )}

        {/* Sync & Utils Controls */}
        {!readOnly && (
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <button 
                    onClick={handleSyncToSpec}
                    disabled={isSyncing || isGenerating}
                    className="bg-brand-primary/90 hover:bg-brand-secondary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 backdrop-blur-md transition-all disabled:opacity-50 justify-between w-48"
                >
                    {isSyncing ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                            <span>Syncing Stack...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            <span>Stack ↔ Graph</span>
                        </>
                    )}
                </button>
                <div className="flex gap-2">
                    <button 
                        onClick={handleOptimizeLayout}
                        disabled={isOptimizing}
                        className="bg-purple-600/90 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 backdrop-blur-md transition-all disabled:opacity-50 flex-1 justify-center"
                    >
                        {isOptimizing ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <span>✨ Organize</span>}
                    </button>
                    <button 
                        onClick={handleExportPNG}
                        className="bg-slate-800/90 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 backdrop-blur-md transition-all border border-white/5 flex-1 justify-center"
                    >
                        <span>📷 PNG</span>
                    </button>
                </div>
            </div>
        )}

        {/* Read-Only Toolbar */}
        {readOnly && (
            <div className="absolute top-4 right-4 z-10">
                <button 
                    onClick={handleExportPNG}
                    className="bg-slate-800/90 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 backdrop-blur-md transition-all border border-white/5"
                >
                    <span>📷 Export PNG</span>
                </button>
            </div>
        )}

        {/* Properties Panel */}
        {activeNode && (
            <div className={`absolute top-28 right-4 w-72 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl z-20 animate-fade-in ${readOnly ? 'pointer-events-none' : ''}`}>
                <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Node Properties</h3>
                    <div className="flex gap-2">
                        {!readOnly && (
                            <button onClick={handleDelete} className="text-red-400 hover:text-red-300">🗑️</button>
                        )}
                        <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-white">✕</button>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] text-glass-text-secondary uppercase font-bold block mb-1">Label</label>
                        {readOnly ? (
                            <div className="text-white font-bold">{activeNode.label}</div>
                        ) : (
                            <input 
                                value={activeNode.label}
                                onChange={(e) => updateSelectedNode({ label: e.target.value })}
                                className="w-full bg-black/20 rounded px-2 py-1.5 text-xs text-white border border-white/10 focus:border-brand-primary outline-none"
                            />
                        )}
                    </div>
                    
                    <div>
                        <label className="text-[10px] text-glass-text-secondary uppercase font-bold block mb-1">Type</label>
                        {readOnly ? (
                            <div className="text-sm text-slate-300">{activeNode.type}</div>
                        ) : (
                            <select 
                                value={activeNode.type}
                                onChange={(e) => updateSelectedNode({ type: e.target.value as any })}
                                className="w-full bg-black/20 rounded px-2 py-1.5 text-xs text-white border border-white/10 focus:border-brand-primary outline-none cursor-pointer"
                            >
                                {['frontend', 'backend', 'database', 'cache', 'queue', 'service', 'deployment', 'external'].map(t => (
                                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {!readOnly && (
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                        <label className="text-[10px] text-brand-secondary uppercase font-bold block mb-1">Linked Code</label>
                        <select 
                            value={activeNode.linkedPath || ''}
                            onChange={(e) => updateSelectedNode({ linkedPath: e.target.value })}
                            className="w-full bg-black/20 rounded px-2 py-1.5 text-xs text-white font-mono border border-white/10 focus:border-brand-primary outline-none cursor-pointer mb-2"
                        >
                            <option value="">-- Select Folder --</option>
                            {folderPaths.map(path => (
                                <option key={path} value={path}>{path}</option>
                            ))}
                        </select>
                        {activeNode.linkedPath && (
                            <button 
                                onClick={handleJumpToCode}
                                className="w-full bg-brand-primary/20 hover:bg-brand-primary/40 text-brand-primary text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors border border-brand-primary/30"
                            >
                                <span>📂</span> Jump to Code ➔
                            </button>
                        )}
                    </div>
                    )}

                    <div>
                        <label className="text-[10px] text-glass-text-secondary uppercase font-bold block mb-1">Description</label>
                        <textarea 
                            value={activeNode.description || ''}
                            onChange={(e) => updateSelectedNode({ description: e.target.value })}
                            disabled={readOnly}
                            className="w-full bg-black/20 rounded px-2 py-1.5 text-xs text-slate-300 border border-white/10 focus:border-brand-primary outline-none resize-none h-16 disabled:opacity-50"
                            placeholder="Optional notes..."
                        />
                    </div>
                </div>
            </div>
        )}

        {/* Edge Editor */}
        {activeEdge && !readOnly && (
            <div className="absolute top-28 right-4 w-72 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl z-20 animate-fade-in">
                <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Connection Protocol</h3>
                    <div className="flex gap-2">
                        <button onClick={handleDeleteEdge} className="text-red-400 hover:text-red-300">🗑️</button>
                        <button onClick={() => setActiveEdgeId(null)} className="text-slate-400 hover:text-white">✕</button>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] text-glass-text-secondary uppercase font-bold block mb-1">Protocol</label>
                        <select 
                            value={activeEdge.protocol || 'HTTP'}
                            onChange={(e) => updateActiveEdge({ protocol: e.target.value as any })}
                            className="w-full bg-black/20 rounded px-2 py-1.5 text-xs text-white border border-white/10 focus:border-brand-primary outline-none cursor-pointer"
                        >
                            {['HTTP', 'WS', 'gRPC', 'TCP', 'JDBC', 'AMQP'].map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] text-glass-text-secondary uppercase font-bold block mb-1">Label (Optional)</label>
                        <input 
                            value={activeEdge.label || ''}
                            onChange={(e) => updateActiveEdge({ label: e.target.value })}
                            className="w-full bg-black/20 rounded px-2 py-1.5 text-xs text-white border border-white/10 focus:border-brand-primary outline-none"
                            placeholder="e.g. 443"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            checked={activeEdge.dashed} 
                            onChange={(e) => updateActiveEdge({ dashed: e.target.checked })}
                            className="rounded bg-black/20 border-white/10" 
                        />
                        <label className="text-xs text-slate-300">Dashed Line</label>
                    </div>
                </div>
            </div>
        )}

        {/* Canvas */}
        <div 
            ref={containerRef}
            className="flex-grow h-[600px] bg-[#0b0e14] overflow-hidden relative cursor-crosshair rounded-xl border border-white/5 shadow-inner"
            onMouseDown={handleCanvasMouseDown}
            onDrop={handleDropOnCanvas}
            onDragOver={handleDragOverCanvas}
            style={{
                backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                backgroundPosition: `${pan.x}px ${pan.y}px`
            }}
        >
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#4f46e5" />
                    </marker>
                </defs>
                <g transform={`translate(${pan.x}, ${pan.y})`}>
                    {edges.map((edge) => {
                        const start = getNodeCenter(edge.from);
                        const end = getNodeCenter(edge.to);
                        if (!start || !end) return null;
                        const dx = end.x - start.x;
                        const cp1 = { x: start.x + dx / 2, y: start.y };
                        const cp2 = { x: end.x - dx / 2, y: end.y };
                        const path = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
                        
                        // Edge Label Position (Midpoint of Bezier approx)
                        const mx = (start.x + 2*cp1.x + 2*cp2.x + end.x)/6;
                        const my = (start.y + 2*cp1.y + 2*cp2.y + end.y)/6;

                        return (
                            <g key={edge.id} className="group cursor-pointer pointer-events-auto" onClick={(e) => { e.stopPropagation(); if(!readOnly) setActiveEdgeId(edge.id); }}>
                                <path 
                                    d={path} 
                                    stroke={activeEdgeId === edge.id ? '#c084fc' : '#4f46e5'} 
                                    strokeWidth={activeEdgeId === edge.id ? 3 : 2} 
                                    fill="none" 
                                    strokeDasharray={edge.dashed ? "5,5" : "none"}
                                    markerEnd="url(#arrowhead)"
                                    className="transition-all hover:stroke-brand-accent hover:stroke-4"
                                />
                                {/* Label Bubble */}
                                {edge.protocol && (
                                    <g transform={`translate(${mx}, ${my})`}>
                                        <rect x="-15" y="-8" width="30" height="16" rx="4" fill="#0f172a" stroke="#334155" />
                                        <text x="0" y="3" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="sans-serif">{edge.protocol}</text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                    {connectingNodeId && (
                        <path 
                            d={`M ${getNodeCenter(connectingNodeId).x} ${getNodeCenter(connectingNodeId).y} L ${mousePos.x} ${mousePos.y}`}
                            stroke="#ffffff" strokeWidth="2" strokeDasharray="5,5" className="opacity-50 animate-pulse"
                        />
                    )}
                </g>
            </svg>

            <div className="absolute inset-0 pointer-events-none transform-gpu" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
                {nodes.map(node => {
                    const statusObj = nodeStatuses[node.id] || nodeStatuses[node.type] || nodeStatuses[node.label.toLowerCase()];
                    const hasIssue = statusObj && statusObj.status !== 'ok';
                    return (
                        <div
                            key={node.id}
                            onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                            onMouseUp={(e) => handleMouseUpNode(e, node.id)}
                            className={`absolute w-[200px] rounded-lg backdrop-blur-md border p-3 shadow-2xl pointer-events-auto ${readOnly ? 'cursor-default' : 'cursor-move'} group transition-all duration-300 ${getColor(node.type, statusObj?.status)} ${selectedId === node.id ? 'ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-opacity-30'}`}
                            style={{ left: node.x, top: node.y }}
                        >
                            {!readOnly && (
                                <>
                                    <div className="absolute top-1/2 -left-1.5 w-3 h-3 bg-slate-700 rounded-full border border-slate-500 hover:bg-brand-primary hover:border-white transition-colors" title="Drag to connect"></div>
                                    <div className="absolute top-1/2 -right-1.5 w-3 h-3 bg-slate-700 rounded-full border border-slate-500 hover:bg-brand-primary hover:border-white transition-colors" title="Drag to connect"></div>
                                </>
                            )}
                            {hasIssue && (
                                <div className="absolute -top-3 -right-3 z-20">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-[#0b0e14] ${statusObj.status === 'critical' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'} animate-bounce`}>!</div>
                                </div>
                            )}
                            {!readOnly && node.linkedPath && (
                                <div className="absolute -top-2 left-2 z-20 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-[9px] text-white flex items-center gap-1 shadow-lg max-w-[150px]">
                                    <span>📂</span>
                                    <span className="truncate max-w-[100px]">{node.linkedPath}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <div className="text-2xl">{getIcon(node.type)}</div>
                                <div className="flex-grow min-w-0">
                                    <div className="text-sm font-bold text-white truncate">{node.label}</div>
                                    <div className="text-[10px] uppercase opacity-70 tracking-wider font-bold">{node.type}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {!readOnly && (
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-2 rounded text-[10px] text-glass-text-secondary pointer-events-none">
                    <div>Drag items from Left Palette</div>
                    <div>Shift + Drag Node to Connect</div>
                    <div>Click Connection to Configure</div>
                </div>
            )}
        </div>
    </div>
  );
};

export default VisualArchitecture;
