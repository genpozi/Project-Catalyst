
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  MarkerType,
  NodeResizer
} from 'reactflow';
import type { Node, Edge, Connection, NodeProps } from 'reactflow';
import { ArchitectureData, ArchitectureNode, ArchitectureEdge, FileNode } from '../types';
import { GeminiService } from '../GeminiService';
import { exportAsImage } from '../utils/imageExporter';
import { useProject } from '../ProjectContext'; // Import context

// --- Custom Node Component ---
const ArchNode = ({ data, selected }: NodeProps) => {
    const { label, type, status, icon, message } = data;
    
    const getNodeStyle = () => {
        if (status === 'critical') return 'bg-red-950/90 border-red-500 shadow-red-900/20';
        if (status === 'warning') return 'bg-yellow-950/90 border-yellow-500 shadow-yellow-900/20';
        
        switch (type) {
            case 'frontend': return 'bg-cyan-950/90 border-cyan-500 shadow-cyan-900/20';
            case 'backend': return 'bg-violet-950/90 border-violet-500 shadow-violet-900/20';
            case 'database': return 'bg-amber-950/90 border-amber-500 shadow-amber-900/20';
            case 'cache': return 'bg-yellow-900/90 border-yellow-400 shadow-yellow-900/20';
            case 'queue': return 'bg-fuchsia-950/90 border-fuchsia-500 shadow-fuchsia-900/20';
            case 'external': return 'bg-slate-800/90 border-slate-400 shadow-slate-900/20';
            case 'deployment': return 'bg-blue-950/90 border-blue-500 shadow-blue-900/20';
            default: return 'bg-slate-900/90 border-slate-600 shadow-black/20';
        }
    };

    return (
        <div className={`h-full w-full rounded-lg backdrop-blur-md border p-3 shadow-2xl transition-all duration-300 ${getNodeStyle()} ${selected ? 'ring-2 ring-white' : ''}`}>
            <NodeResizer 
                color="#4f46e5" 
                isVisible={selected} 
                minWidth={150} 
                minHeight={80} 
            />
            
            {status && status !== 'ok' && (
                <div className="absolute -top-2 -right-2 z-20">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[#0b0e14] ${status === 'critical' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'} animate-bounce`}>!</div>
                </div>
            )}
            
            <div className="flex items-center gap-3 h-full">
                <div className="text-2xl flex-shrink-0">{icon}</div>
                <div className="flex-grow min-w-0 flex flex-col justify-center">
                    <div className="text-sm font-bold text-white truncate w-full">{label}</div>
                    <div className="text-[10px] uppercase opacity-70 tracking-wider font-bold">{type}</div>
                </div>
            </div>
            
            {message && <div className="mt-2 text-[10px] text-white/80 italic border-t border-white/10 pt-1">{message}</div>}

            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-400" />
            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-brand-primary" />
        </div>
    );
};

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

const nodeTypes = {
  archNode: ArchNode,
};

const getIcon = (type: string) => {
    switch (type) {
        case 'frontend': return '💻';
        case 'backend': return '⚙️';
        case 'database': return '🗄️';
        case 'cache': return '⚡';
        case 'queue': return '📨';
        case 'external': return '🌐';
        case 'service': return '🔧';
        case 'deployment': return '🚀';
        default: return '📦';
    }
};

const VisualArchitecture: React.FC<VisualArchitectureProps> = ({ 
    architecture, 
    onUpdate, 
    onSyncToSpec, 
    onGenerateFromSpec, 
    nodeStatuses = {}, 
    readOnly = false 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gemini = useMemo(() => new GeminiService(), []);
  const { dispatch } = useProject(); // Access context to dispatch selection events
  
  // Transform initial props to ReactFlow format
  const initialNodes: Node[] = useMemo(() => {
      const layout = architecture.visualLayout || [];
      if (layout.length === 0 && !readOnly) {
          return [
            { id: 'frontend', type: 'archNode', position: { x: 100, y: 150 }, data: { type: 'frontend', label: architecture.stack?.frontend || 'Frontend', icon: getIcon('frontend') }, style: { width: 200, height: 80 } },
            { id: 'backend', type: 'archNode', position: { x: 400, y: 150 }, data: { type: 'backend', label: architecture.stack?.backend || 'Backend', icon: getIcon('backend') }, style: { width: 200, height: 80 } },
            { id: 'database', type: 'archNode', position: { x: 700, y: 150 }, data: { type: 'database', label: architecture.stack?.database || 'Database', icon: getIcon('database') }, style: { width: 200, height: 80 } },
          ];
      }
      return layout.map(n => {
          const status = nodeStatuses[n.id] || nodeStatuses[n.type] || nodeStatuses[n.label.toLowerCase()];
          return {
              id: n.id,
              type: 'archNode',
              position: { x: n.x, y: n.y },
              style: { width: n.width || 200, height: n.height || 80 },
              data: { 
                  type: n.type, 
                  label: n.label, 
                  icon: getIcon(n.type),
                  status: status?.status,
                  message: status?.message
              }
          };
      });
  }, [architecture.visualLayout, architecture.stack, nodeStatuses, readOnly]);

  const initialEdges: Edge[] = useMemo(() => {
      const edges = architecture.visualEdges || [];
      if (edges.length === 0 && !readOnly && (!architecture.visualLayout || architecture.visualLayout.length === 0)) {
          return [
            { id: 'e1', source: 'frontend', target: 'backend', animated: true, label: 'HTTP', style: { stroke: '#4f46e5' } },
            { id: 'e2', source: 'backend', target: 'database', label: 'TCP', style: { stroke: '#4f46e5' } },
          ];
      }
      return edges.map(e => ({
          id: e.id,
          source: e.from,
          target: e.to,
          animated: e.protocol === 'WS' || e.protocol === 'HTTP',
          label: e.protocol,
          style: { stroke: '#4f46e5', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#4f46e5' }
      }));
  }, [architecture.visualEdges, architecture.visualLayout, readOnly]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
      dispatch({ type: 'SET_SELECTED_NODE', payload: node.id });
  }, [dispatch]);

  const onPaneClick = useCallback(() => {
      dispatch({ type: 'SET_SELECTED_NODE', payload: undefined });
  }, [dispatch]);

  // Sync state when architecture prop changes (e.g. from AI)
  useEffect(() => {
      if (architecture.visualLayout && architecture.visualLayout.length > 0) {
          const newNodes = architecture.visualLayout.map(n => {
             const status = nodeStatuses[n.id] || nodeStatuses[n.type] || nodeStatuses[n.label.toLowerCase()];
             return {
                 id: n.id,
                 type: 'archNode',
                 position: { x: n.x, y: n.y },
                 style: { width: n.width || 200, height: n.height || 80 },
                 data: { type: n.type, label: n.label, icon: getIcon(n.type), status: status?.status, message: status?.message }
             };
          });

          setNodes(nds => {
              const currentHash = JSON.stringify(nds.map(n => ({ id: n.id, x: n.position.x, y: n.position.y, w: n.style?.width, h: n.style?.height })));
              const newHash = JSON.stringify(newNodes.map(n => ({ id: n.id, x: n.position.x, y: n.position.y, w: n.style?.width, h: n.style?.height })));
              
              if (currentHash !== newHash) {
                  return newNodes;
              }
              return nds;
          });

          if (architecture.visualEdges) {
              const newEdges = architecture.visualEdges.map(e => ({
                  id: e.id,
                  source: e.from,
                  target: e.to,
                  animated: e.protocol === 'WS' || e.protocol === 'HTTP',
                  label: e.protocol,
                  style: { stroke: '#4f46e5', strokeWidth: 2 },
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#4f46e5' }
              }));
              setEdges(eds => {
                  const currentIds = eds.map(e => e.id).sort().join(',');
                  const newIds = newEdges.map(e => e.id).sort().join(',');
                  if (currentIds !== newIds) return newEdges;
                  return eds;
              });
          }
      }
  }, [architecture.visualLayout, architecture.visualEdges, nodeStatuses, setNodes, setEdges]);

  // Sync back to parent when nodes/edges change (debounced)
  useEffect(() => {
      const t = setTimeout(() => {
          if (readOnly) return;
          const visualLayout = nodes.map(n => ({
              id: n.id,
              type: n.data.type,
              label: n.data.label,
              x: n.position.x,
              y: n.position.y,
              width: Number(n.style?.width) || 200,
              height: Number(n.style?.height) || 80
          })) as ArchitectureNode[];

          const visualEdges = edges.map(e => ({
              id: e.id,
              from: e.source,
              to: e.target,
              protocol: e.label as any
          }));

          const prevLayoutStr = JSON.stringify(architecture.visualLayout?.map(n => ({id:n.id, x:n.x, y:n.y, w:n.width, h:n.height})));
          const newLayoutStr = JSON.stringify(visualLayout.map(n => ({id:n.id, x:n.x, y:n.y, w:n.width, h:n.height})));

          if (prevLayoutStr !== newLayoutStr ||
              JSON.stringify(visualEdges) !== JSON.stringify(architecture.visualEdges)) {
              onUpdate({ ...architecture, visualLayout, visualEdges });
          }
      }, 1000);
      return () => clearTimeout(t);
  }, [nodes, edges, readOnly]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, label: 'HTTP', animated: true, style: { stroke: '#c084fc', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#c084fc' } }, eds)), [setEdges]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
      if (readOnly) return;
      const newProtocol = prompt("Enter Protocol (e.g., HTTP, WS, gRPC, TCP):", edge.label as string || "");
      if (newProtocol !== null) {
          setEdges((eds) => eds.map((e) => {
              if (e.id === edge.id) {
                  return { 
                      ...e, 
                      label: newProtocol, 
                      animated: ['HTTP', 'WS', 'gRPC'].includes(newProtocol) 
                  };
              }
              return e;
          }));
      }
  }, [readOnly, setEdges]);

  const handleOptimizeLayout = async () => {
      if (readOnly || isOptimizing) return;
      setIsOptimizing(true);
      try {
          const simpleNodes = nodes.map(n => ({ id: n.id, label: n.data.label, type: n.data.type }));
          const simpleEdges = edges.map(e => ({ from: e.source, to: e.target }));
          
          const response = await gemini.optimizeGraphLayout(simpleNodes, simpleEdges, 'architecture');
          
          if (Array.isArray(response)) {
              const updatedNodes = nodes.map(n => {
                  const optimized = response.find(r => r.id === n.id);
                  return optimized ? { ...n, position: { x: optimized.x, y: optimized.y } } : n;
              });
              setNodes(updatedNodes);
          }
      } catch (e) {
          console.error("Auto-layout failed", e);
      } finally {
          setIsOptimizing(false);
      }
  };

  const handleSync = async () => {
      if (!onSyncToSpec) return;
      setIsSyncing(true);
      const visualLayout = nodes.map(n => ({ 
          id: n.id, 
          type: n.data.type, 
          label: n.data.label, 
          x: n.position.x, 
          y: n.position.y,
          width: Number(n.style?.width) || 200,
          height: Number(n.style?.height) || 80
      })) as ArchitectureNode[];
      const visualEdges = edges.map(e => ({ id: e.id, from: e.source, to: e.target })) as ArchitectureEdge[];
      await onSyncToSpec(visualLayout, visualEdges);
      setIsSyncing(false);
  };

  const handleGenerate = async () => {
      if (!onGenerateFromSpec) return;
      setIsGenerating(true);
      await onGenerateFromSpec();
      setIsGenerating(false);
  };

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (readOnly) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const reactFlowBounds = containerRef.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: 'archNode',
        position,
        style: { width: 200, height: 80 },
        data: { type, label: type.charAt(0).toUpperCase() + type.slice(1), icon: getIcon(type) },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, readOnly]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex h-full gap-4 relative">
        {!readOnly && (
            <div className="w-20 flex flex-col gap-2 items-center bg-slate-900/50 border border-white/5 rounded-xl p-2 h-fit relative z-10 select-none ignore-export">
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
                        onDragStart={(e) => onDragStart(e, item.type)}
                        className="w-12 h-12 flex flex-col items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 hover:text-white text-xl transition-all border border-transparent hover:border-white/20 cursor-grab active:cursor-grabbing"
                        title={`Drag ${item.title}`}
                    >
                        <span>{item.icon}</span>
                        <span className="text-[8px] font-bold mt-0.5">{item.title}</span>
                    </div>
                ))}
            </div>
        )}

        <div className="absolute top-4 right-4 z-20 flex gap-2 ignore-export">
            <button 
                onClick={() => setShowMinimap(!showMinimap)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${showMinimap ? 'bg-white/10 text-white border-white/20' : 'bg-slate-900 text-slate-400 border-slate-700'}`}
            >
                🗺️ Map
            </button>
            {!readOnly && (
                <>
                    <button onClick={handleOptimizeLayout} disabled={isOptimizing} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg disabled:opacity-50">
                        {isOptimizing ? '...' : '✨ Organize'}
                    </button>
                    {onGenerateFromSpec && (
                        <button onClick={handleGenerate} disabled={isGenerating} className="bg-brand-primary hover:bg-brand-secondary text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg disabled:opacity-50">
                            {isGenerating ? 'Generating...' : 'Auto-Gen Graph'}
                        </button>
                    )}
                    {onSyncToSpec && (
                        <button onClick={handleSync} disabled={isSyncing} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 disabled:opacity-50">
                            {isSyncing ? 'Syncing...' : 'Sync to Stack'}
                        </button>
                    )}
                </>
            )}
            <button 
                onClick={() => exportAsImage(containerRef.current, 'architecture-diagram')}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 flex items-center gap-2 shadow-lg"
            >
                📷 Export
            </button>
        </div>

        <div className="flex-grow h-[600px] bg-[#0b0e14] rounded-xl border border-white/5 shadow-inner overflow-hidden" ref={containerRef}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeClick={onEdgeClick}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                fitView
                className="bg-[#0b0e14]"
                minZoom={0.2}
                maxZoom={2}
                nodesDraggable={!readOnly}
                nodesConnectable={!readOnly}
            >
                <Background color="#1e293b" gap={20} size={1} />
                <Controls className="bg-slate-800 border border-slate-700 fill-white" />
                {showMinimap && (
                    <MiniMap 
                        nodeColor={() => '#3b82f6'} 
                        maskColor="rgba(11, 14, 20, 0.8)"
                        className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden"
                    />
                )}
            </ReactFlow>
        </div>
    </div>
  );
};

export default React.memo(VisualArchitecture);
