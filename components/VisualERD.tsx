
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  MarkerType
} from 'reactflow';
import type { Node, Edge, Connection, NodeProps } from 'reactflow';
import { SchemaData, SchemaTable, SchemaColumn } from '../types';
import { generateMermaidFromTables } from '../utils/mermaid';
import { GeminiService } from '../GeminiService';
import { exportAsImage } from '../utils/imageExporter';
import { useProject } from '../ProjectContext'; // Import context

interface VisualERDProps {
  schema: SchemaData;
  onUpdate: (data: SchemaData) => void;
  readOnly?: boolean;
}

const COLUMN_TYPES = [
    'UUID', 'String', 'Int', 'Float', 'Boolean', 'DateTime', 'JSON', 'Text', 'BigInt'
];

// --- Custom Node for Table ---
const TableNode = ({ data, selected }: NodeProps) => {
    const { name, columns, isReadOnly, onAddColumn, onUpdateColumn, onDeleteColumn, onDeleteTable } = data;

    return (
        <div className={`w-[280px] bg-slate-900 border rounded-lg shadow-xl overflow-hidden transition-shadow ${selected ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-slate-700'}`}>
            {/* Header */}
            <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 flex justify-between items-center handle">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="text-brand-primary">🗄️</span>
                    {name}
                </span>
                {!isReadOnly && (
                    <div className="flex gap-1 nodrag">
                        <button onClick={onAddColumn} className="text-green-400 text-[10px] font-bold px-2 py-0.5 bg-white/5 rounded hover:bg-green-900/30">+ Col</button>
                        <button onClick={onDeleteTable} className="text-slate-500 hover:text-red-400 text-[10px] px-2 py-0.5">✕</button>
                    </div>
                )}
            </div>
            
            {/* Columns */}
            <div className="p-2 space-y-1 bg-slate-900/90 max-h-[300px] overflow-y-auto custom-scrollbar nodrag">
                {columns.map((col: SchemaColumn, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center group relative">
                        {!isReadOnly ? (
                            <>
                                <input 
                                    value={col.name} 
                                    onChange={(e) => onUpdateColumn(idx, 'name', e.target.value)} 
                                    className="bg-transparent text-xs text-blue-100 font-mono w-1/3 border-b border-transparent focus:border-brand-primary outline-none" 
                                />
                                <select 
                                    value={col.type} 
                                    onChange={(e) => onUpdateColumn(idx, 'type', e.target.value)} 
                                    className="bg-transparent text-[10px] text-yellow-500/80 w-1/3 border-b border-transparent focus:border-brand-primary outline-none cursor-pointer"
                                >
                                    {COLUMN_TYPES.map(t => <option key={t} value={t} className="bg-slate-800">{t}</option>)}
                                </select>
                                <input 
                                    value={col.constraints || ''} 
                                    onChange={(e) => onUpdateColumn(idx, 'constraints', e.target.value)} 
                                    placeholder="PK/FK"
                                    className="bg-transparent text-[10px] text-slate-400 w-1/4 border-b border-transparent focus:border-brand-primary outline-none" 
                                />
                                <button onClick={() => onDeleteColumn(idx)} className="text-red-500 opacity-0 group-hover:opacity-100 text-[10px] absolute right-0 bg-slate-900 px-1">✕</button>
                            </>
                        ) : (
                            <div className="flex w-full justify-between px-1">
                                <span className="text-xs text-blue-100 font-mono">{col.name}</span>
                                <span className="text-[10px] text-yellow-500">{col.type}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Connectors */}
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-500 !-left-1.5" />
            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-brand-primary !-right-1.5" />
        </div>
    );
};

const nodeTypes = {
  tableNode: TableNode,
};

const VisualERD: React.FC<VisualERDProps> = ({ schema, onUpdate, readOnly = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gemini = useMemo(() => new GeminiService(), []);
  const { dispatch } = useProject(); // Added Context
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // --- Initial State Setup ---
  const initialNodes: Node[] = useMemo(() => {
      return (schema.tables || []).map((table, i) => ({
          id: table.name,
          type: 'tableNode',
          position: { 
              x: table.x !== undefined ? table.x : (i % 3) * 360 + 50, 
              y: table.y !== undefined ? table.y : Math.floor(i / 3) * 320 + 50
          },
          data: { 
              name: table.name, 
              columns: table.columns, 
              isReadOnly: readOnly,
              // Callbacks are injected via useEffect below
          }
      }));
  }, [schema.tables, readOnly]);

  const initialEdges: Edge[] = useMemo(() => {
      const edges: Edge[] = [];
      schema.tables.forEach(source => {
          source.columns.forEach(col => {
              if (col.name.endsWith('_id') || col.name.endsWith('Id')) {
                  const targetName = col.name.replace(/_id$|Id$/, '');
                  const target = schema.tables.find(t => 
                      t.name.toLowerCase() === targetName.toLowerCase() || 
                      t.name.toLowerCase() === targetName.toLowerCase() + 's'
                  );
                  if (target && target.name !== source.name) {
                      edges.push({
                          id: `${source.name}-${col.name}-${target.name}`,
                          source: source.name,
                          target: target.name,
                          label: 'FK',
                          style: { stroke: '#475569', strokeWidth: 2 },
                          markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' }
                      });
                  }
              }
          });
      });
      return edges;
  }, [schema.tables]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // --- Handle Selection ---
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
      dispatch({ type: 'SET_SELECTED_NODE', payload: node.id });
  }, [dispatch]);

  const onPaneClick = useCallback(() => {
      dispatch({ type: 'SET_SELECTED_NODE', payload: undefined });
  }, [dispatch]);

  // --- Sync Props to State (Handle External Updates e.g. AI) ---
  useEffect(() => {
      // Only sync if schema tables length differs or names differ, to avoid wiping positions during drag
      const currentIds = nodes.map(n => n.id).sort().join(',');
      const newIds = (schema.tables || []).map(t => t.name).sort().join(',');
      
      if (currentIds !== newIds) {
          const newNodes = (schema.tables || []).map((table, i) => ({
              id: table.name,
              type: 'tableNode',
              position: { 
                  x: table.x !== undefined ? table.x : (i % 3) * 360 + 50, 
                  y: table.y !== undefined ? table.y : Math.floor(i / 3) * 320 + 50
              },
              data: { 
                  name: table.name, 
                  columns: table.columns, 
                  isReadOnly: readOnly
              }
          }));
          setNodes(newNodes);
      }
  }, [schema.tables, readOnly, setNodes]);

  // --- Sync State to Parent (Debounced) ---
  useEffect(() => {
      const t = setTimeout(() => {
          if (readOnly) return;
          
          const newTables: SchemaTable[] = nodes.map(n => ({
              name: n.data.name,
              description: '',
              columns: n.data.columns,
              x: n.position.x,
              y: n.position.y
          }));

          // Avoid infinite loops by checking stringified
          const currentTableState = JSON.stringify(schema.tables.map(t => ({...t, description: ''})));
          const newTableState = JSON.stringify(newTables);

          if (currentTableState !== newTableState) {
              const newMermaid = generateMermaidFromTables(newTables);
              onUpdate({ ...schema, tables: newTables, mermaidChart: newMermaid });
          }
      }, 1000);
      return () => clearTimeout(t);
  }, [nodes, readOnly]);

  // --- Callbacks for Node Actions ---
  const handleAddColumn = useCallback((nodeId: string) => {
      setNodes(nds => nds.map(node => {
          if (node.id === nodeId) {
              return { 
                  ...node, 
                  data: { 
                      ...node.data, 
                      columns: [...node.data.columns, { name: 'new_col', type: 'String', constraints: '' }] 
                  } 
              };
          }
          return node;
      }));
  }, [setNodes]);

  const handleUpdateColumn = useCallback((nodeId: string, colIdx: number, field: string, value: string) => {
      setNodes(nds => nds.map(node => {
          if (node.id === nodeId) {
              const newCols = [...node.data.columns];
              if (newCols[colIdx]) {
                  newCols[colIdx] = { ...newCols[colIdx], [field]: value };
                  return { 
                      ...node, 
                      data: { ...node.data, columns: newCols } 
                  };
              }
          }
          return node;
      }));
  }, [setNodes]);

  const handleDeleteColumn = useCallback((nodeId: string, colIdx: number) => {
      setNodes(nds => nds.map(node => {
          if (node.id === nodeId) {
              const newCols = node.data.columns.filter((_: any, i: number) => i !== colIdx);
              return { 
                  ...node, 
                  data: { ...node.data, columns: newCols } 
              };
          }
          return node;
      }));
  }, [setNodes]);

  const handleDeleteTable = useCallback((nodeId: string) => {
      if (confirm(`Delete table ${nodeId}?`)) {
          setNodes(nds => nds.filter(n => n.id !== nodeId));
          setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
      }
  }, [setNodes, setEdges]);

  // Inject callbacks into node data whenever they or readOnly changes
  useEffect(() => {
      setNodes(nds => nds.map(node => ({
          ...node,
          data: {
              ...node.data,
              isReadOnly: readOnly,
              onAddColumn: () => handleAddColumn(node.id),
              onUpdateColumn: (idx: number, f: string, v: string) => handleUpdateColumn(node.id, idx, f, v),
              onDeleteColumn: (idx: number) => handleDeleteColumn(node.id, idx),
              onDeleteTable: () => handleDeleteTable(node.id)
          }
      })));
  }, [handleAddColumn, handleUpdateColumn, handleDeleteColumn, handleDeleteTable, readOnly, setNodes]);

  const handleAddTable = () => {
      const name = prompt("Table Name:");
      if (!name) return;
      const newNode: Node = {
          id: name,
          type: 'tableNode',
          position: { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 },
          data: {
              name,
              columns: [{ name: 'id', type: 'UUID', constraints: 'PK' }],
              isReadOnly: readOnly
          }
      };
      setNodes(nds => [...nds, newNode]);
  };

  const onConnect = useCallback((params: Connection) => {
      // Logic to add FK column to source if it doesn't exist
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (sourceNode && targetNode) {
          const fkName = `${targetNode.data.name.toLowerCase().replace(/s$/, '')}_id`;
          // Check if exists
          const exists = sourceNode.data.columns.some((c: any) => c.name === fkName);
          
          if (!exists) {
              setNodes(nds => nds.map(n => {
                  if (n.id === sourceNode.id) {
                      return {
                          ...n,
                          data: {
                              ...n.data,
                              columns: [...n.data.columns, { name: fkName, type: 'UUID', constraints: 'FK' }]
                          }
                      };
                  }
                  return n;
              }));
          }
          
          setEdges((eds) => addEdge({ ...params, label: 'FK', style: { stroke: '#475569' } }, eds));
      }
  }, [nodes, setNodes, setEdges]);

  const handleOptimizeLayout = async () => {
      if (readOnly || isOptimizing) return;
      setIsOptimizing(true);
      try {
          const simpleNodes = nodes.map(n => ({ id: n.id, label: n.data.name }));
          const simpleEdges = edges.map(e => ({ from: e.source, to: e.target }));
          
          const response = await gemini.optimizeGraphLayout(simpleNodes, simpleEdges, 'erd');
          
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

  return (
    <div className="flex flex-col h-[600px] relative bg-[#0b0e14] rounded-xl overflow-hidden border border-white/5" ref={containerRef}>
        {!readOnly && (
            <div className="absolute top-4 left-4 z-10 flex gap-2 ignore-export">
                <button onClick={handleAddTable} className="bg-brand-primary hover:bg-brand-secondary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg">+ Table</button>
                <button onClick={handleOptimizeLayout} disabled={isOptimizing} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg disabled:opacity-50">{isOptimizing ? '...' : '✨ Organize'}</button>
            </div>
        )}

        <div className="absolute top-4 right-4 z-20 flex gap-2 ignore-export">
            <button 
                onClick={() => setShowMinimap(!showMinimap)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${showMinimap ? 'bg-white/10 text-white border-white/20' : 'bg-slate-900 text-slate-400 border-slate-700'}`}
            >
                🗺️ Map
            </button>
            <button 
                onClick={() => exportAsImage(containerRef.current, 'data-schema')}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 flex items-center gap-2 shadow-lg"
            >
                📷 Export PNG
            </button>
        </div>

        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
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
                    nodeColor={() => '#475569'} 
                    maskColor="rgba(11, 14, 20, 0.8)"
                    className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden"
                />
            )}
        </ReactFlow>
    </div>
  );
};

export default React.memo(VisualERD);
