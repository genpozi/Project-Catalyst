
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SchemaData, SchemaTable, SchemaColumn } from '../types';
import { generateMermaidFromTables } from '../utils/mermaid';
import { GeminiService } from '../GeminiService';

interface VisualERDProps {
  schema: SchemaData;
  onUpdate: (data: SchemaData) => void;
  readOnly?: boolean;
}

interface VisualNode extends SchemaTable {
  id: string; // Name is used as ID
  x: number;
  y: number;
}

const COLUMN_TYPES = [
    'UUID', 'String', 'Int', 'Float', 'Boolean', 'DateTime', 'JSON', 'Text', 'BigInt'
];

const VisualERD: React.FC<VisualERDProps> = ({ schema, onUpdate, readOnly = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<VisualNode[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Relationship creation state
  const [connectingTableId, setConnectingTableId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Selection
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  const gemini = useMemo(() => new GeminiService(), []);

  // Initialize layout from schema
  useEffect(() => {
    if (!schema.tables) return;
    
    const newNodes = schema.tables.map((table, i) => ({
      ...table,
      id: table.name,
      // Use persisted coordinates if available, else layout in a grid
      x: table.x !== undefined ? table.x : (i % 3) * 360 + 50,
      y: table.y !== undefined ? table.y : Math.floor(i / 3) * 320 + 50
    }));
    setNodes(newNodes);
  }, [schema.tables]); 

  const handleUpdate = (updatedNodes: VisualNode[]) => {
      setNodes(updatedNodes);
      
      // Update schema with new coordinates and structure
      const newTables: SchemaTable[] = updatedNodes.map(({ id, ...rest }) => ({
          ...rest,
          // Explicitly save x and y back to schema
          x: rest.x,
          y: rest.y
      }));
      
      const newMermaid = generateMermaidFromTables(newTables);
      
      onUpdate({
          ...schema,
          tables: newTables,
          mermaidChart: newMermaid
      });
  };

  const handleOptimizeLayout = async () => {
      if (readOnly || isOptimizing) return;
      setIsOptimizing(true);
      try {
          const simpleNodes = nodes.map(n => ({ id: n.id, label: n.name }));
          const simpleEdges: any[] = [];
          
          nodes.forEach(source => {
              source.columns.forEach(col => {
                  // Heuristic for finding relationships
                  if (col.name.endsWith('_id') || col.name.endsWith('Id')) {
                      const targetName = col.name.replace(/_id$|Id$/, '');
                      const target = nodes.find(t => 
                          t.name.toLowerCase() === targetName.toLowerCase() || 
                          t.name.toLowerCase() === targetName.toLowerCase() + 's'
                      );
                      if (target && target.id !== source.id) {
                          simpleEdges.push({ from: source.id, to: target.id });
                      }
                  }
              });
          });

          const response = await gemini.optimizeGraphLayout(simpleNodes, simpleEdges, 'erd');
          
          if (Array.isArray(response)) {
              const updatedNodes = nodes.map(n => {
                  const optimized = response.find(r => r.id === n.id);
                  return optimized ? { ...n, x: optimized.x, y: optimized.y } : n;
              });
              handleUpdate(updatedNodes);
          }
      } catch (e) {
          console.error("Auto-layout failed", e);
      } finally {
          setIsOptimizing(false);
      }
  };

  const handleExportPNG = async () => {
      if (!containerRef.current) return;
      try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const width = 1200;
          const height = 800;
          
          // SVG string for connections
          const svgEl = containerRef.current.querySelector('svg');
          const connectionSvg = svgEl ? new XMLSerializer().serializeToString(svgEl) : '';
          
          // Simplified nodes SVG representation for export
          let nodesSvg = '';
          nodes.forEach(n => {
              const tableHeight = 40 + (n.columns.length * 20);
              nodesSvg += `
                <g transform="translate(${n.x}, ${n.y})">
                    <rect width="300" height="${tableHeight}" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1" />
                    <rect width="300" height="35" rx="8" fill="#1e293b" />
                    <text x="10" y="22" fill="#f1f5f9" font-family="sans-serif" font-size="14" font-weight="bold">${n.name}</text>
                    ${n.columns.map((c, i) => `
                        <text x="10" y="${55 + i * 20}" fill="#93c5fd" font-family="monospace" font-size="10">${c.name}</text>
                        <text x="150" y="${55 + i * 20}" fill="#fbbf24" font-family="monospace" font-size="10">${c.type}</text>
                    `).join('')}
                </g>
              `;
          });

          const fullSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${-pan.x} ${-pan.y} ${width} ${height}">
                ${connectionSvg.replace(/<svg.*?>|<\/svg>/g, '')}
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
              a.download = `erd-diagram.png`;
              a.href = canvas.toDataURL('image/png');
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
          };
          img.src = url;

      } catch (e) { console.error("Export failed", e); }
  };

  const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (readOnly) return;
    setSelectedTableId(id);
    const node = nodes.find(n => n.id === id);
    if (node) {
        setDraggingId(id);
        setDragOffset({
            x: e.clientX - node.x - pan.x,
            y: e.clientY - node.y - pan.y
        });
    }
  };

  // Start creating a relationship
  const handleConnectStart = (e: React.MouseEvent, tableId: string) => {
      e.stopPropagation();
      setConnectingTableId(tableId);
  };

  const handleConnectEnd = (e: React.MouseEvent, targetTableId: string) => {
      e.stopPropagation();
      if (connectingTableId && connectingTableId !== targetTableId) {
          // Create Relationship Logic: Add target_id to connectingTableId OR connecting_id to targetTableId?
          // Standard: Add foreign key to the table where we dropped the line? 
          // Let's assume Drag FROM parent TO child. 
          // So if we drag from 'Users' to 'Posts', we add 'user_id' to 'Posts'.
          
          const sourceTable = nodes.find(n => n.id === connectingTableId);
          if (sourceTable) {
              const fkName = `${sourceTable.name.toLowerCase().replace(/s$/, '')}_id`; // users -> user_id
              
              const updatedNodes = nodes.map(n => {
                  if (n.id === targetTableId) {
                      // Check if exists
                      if (n.columns.some(c => c.name === fkName)) {
                          alert(`Column ${fkName} already exists in ${n.name}`);
                          return n;
                      }
                      return {
                          ...n,
                          columns: [
                              ...n.columns, 
                              { name: fkName, type: 'UUID', description: `FK to ${sourceTable.name}`, constraints: 'FK' }
                          ]
                      };
                  }
                  return n;
              });
              handleUpdate(updatedNodes);
          }
      }
      setConnectingTableId(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setSelectedTableId(null);
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Update mouse pos for connecting line
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({ 
            x: e.clientX - rect.left - pan.x, 
            y: e.clientY - rect.top - pan.y 
        });
    }

    if (draggingId) {
      setNodes(prev => prev.map(n => 
        n.id === draggingId 
          ? { ...n, x: e.clientX - pan.x - dragOffset.x, y: e.clientY - pan.y - dragOffset.y } 
          : n
      ));
    } else if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    }
  }, [draggingId, isPanning, dragOffset, pan, startPan]);

  const handleMouseUp = useCallback(() => {
    if (draggingId) {
        handleUpdate(nodes); 
    }
    setDraggingId(null);
    setIsPanning(false);
    setConnectingTableId(null);
  }, [draggingId, nodes]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // CRUD Operations
  const addTable = () => {
      if(readOnly) return;
      const name = prompt("Table Name (e.g. Users):");
      if(!name) return;
      const newNode: VisualNode = {
          id: name,
          name,
          description: 'New table',
          columns: [{ name: 'id', type: 'UUID', constraints: 'PK', description: 'Primary Key'}],
          x: 100 - pan.x,
          y: 100 - pan.y
      };
      handleUpdate([...nodes, newNode]);
  };

  const addColumn = (tableId: string) => {
      const updatedNodes = nodes.map(n => {
          if (n.id === tableId) {
              return {
                  ...n,
                  columns: [...n.columns, { name: 'new_col', type: 'String', description: '' }]
              };
          }
          return n;
      });
      handleUpdate(updatedNodes);
  };

  const updateColumn = (tableId: string, colIndex: number, field: keyof SchemaColumn, value: string) => {
      const updatedNodes = nodes.map(n => {
          if (n.id === tableId) {
              const newCols = [...n.columns];
              newCols[colIndex] = { ...newCols[colIndex], [field]: value };
              return { ...n, columns: newCols };
          }
          return n;
      });
      handleUpdate(updatedNodes);
  };

  const deleteColumn = (tableId: string, colIndex: number) => {
      const updatedNodes = nodes.map(n => {
          if (n.id === tableId) {
              const newCols = [...n.columns];
              newCols.splice(colIndex, 1);
              return { ...n, columns: newCols };
          }
          return n;
      });
      handleUpdate(updatedNodes);
  };

  const deleteTable = (tableId: string) => {
      if(confirm('Delete this table?')) {
          handleUpdate(nodes.filter(n => n.id !== tableId));
          setSelectedTableId(null);
      }
  };

  const getNodeCenter = (id: string) => {
      const n = nodes.find(node => node.id === id);
      if(!n) return { x:0, y:0 };
      return { x: n.x + 150, y: n.y + 40 }; // Approximate center
  };

  // Render Relations
  const renderConnections = () => {
      const lines: React.ReactElement[] = [];
      nodes.forEach(source => {
          source.columns.forEach(col => {
              if (col.name.endsWith('_id') || col.name.endsWith('Id')) {
                  const targetName = col.name.replace(/_id$|Id$/, '');
                  const target = nodes.find(t => 
                      t.name.toLowerCase() === targetName.toLowerCase() || 
                      t.name.toLowerCase() === targetName.toLowerCase() + 's'
                  );
                  if (target && target.id !== source.id) {
                      // Draw line from Target (Parent) to Source (Child) usually
                      // Or just connect them
                      
                      // Using center points for now, can improve anchor logic
                      const sx = source.x + 150;
                      const sy = source.y + 30; // Topish
                      const tx = target.x + 150;
                      const ty = target.y + 30;
                      
                      // Simple Bezier
                      const dx = tx - sx;
                      const cp1 = { x: sx + dx / 2, y: sy };
                      const cp2 = { x: tx - dx / 2, y: ty };

                      lines.push(
                          <g key={`${source.id}-${col.name}-${target.id}`}>
                              <path 
                                d={`M ${sx} ${sy} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${tx} ${ty}`}
                                stroke="#475569" strokeWidth="2" fill="none"
                                markerEnd="url(#er-arrow)"
                              />
                              <circle cx={sx} cy={sy} r="3" fill="#475569" />
                              <circle cx={tx} cy={ty} r="3" fill="#475569" />
                          </g>
                      );
                  }
              }
          });
      });
      return lines;
  };

  return (
    <div className="flex flex-col h-[600px] relative bg-[#0b0e14] rounded-xl overflow-hidden border border-white/5">
        {/* Toolbar */}
        {!readOnly && (
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                <button 
                    onClick={addTable}
                    className="bg-brand-primary hover:bg-brand-secondary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 transition-all"
                >
                    <span>+ Table</span>
                </button>
                <button 
                    onClick={handleOptimizeLayout}
                    disabled={isOptimizing}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {isOptimizing ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <span>✨ Organize</span>}
                </button>
                <div className="bg-black/50 px-3 py-2 rounded-lg text-xs text-glass-text-secondary backdrop-blur border border-white/5">
                    {nodes.length} Tables • {nodes.reduce((acc, n) => acc + n.columns.length, 0)} Columns
                </div>
            </div>
        )}

        {/* Export */}
        <div className="absolute top-4 right-4 z-10">
            <button 
                onClick={handleExportPNG}
                className="bg-slate-800/90 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 backdrop-blur-md transition-all border border-white/5"
            >
                <span>📷 PNG</span>
            </button>
        </div>

        {/* Canvas */}
        <div 
            ref={containerRef}
            className="flex-grow relative cursor-crosshair overflow-hidden"
            onMouseDown={handleCanvasMouseDown}
            style={{
                backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                backgroundPosition: `${pan.x}px ${pan.y}px`
            }}
        >
            <div 
                className="absolute inset-0 transform-gpu"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
            >
                {/* Connections Layer */}
                <svg className="absolute inset-0 overflow-visible w-full h-full pointer-events-none">
                    <defs>
                        <marker id="er-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
                        </marker>
                    </defs>
                    {renderConnections()}
                    {connectingTableId && (
                        <path 
                            d={`M ${getNodeCenter(connectingTableId).x} ${getNodeCenter(connectingTableId).y} L ${mousePos.x} ${mousePos.y}`}
                            stroke="#ffffff" strokeWidth="2" strokeDasharray="5,5" className="opacity-50 animate-pulse"
                        />
                    )}
                </svg>

                {/* Nodes Layer */}
                {nodes.map(node => (
                    <div
                        key={node.id}
                        onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                        onMouseUp={(e) => handleConnectEnd(e, node.id)}
                        className={`absolute w-[340px] bg-slate-900 border rounded-lg shadow-xl pointer-events-auto transition-shadow ${selectedTableId === node.id ? 'border-brand-primary ring-2 ring-brand-primary/20 z-20' : 'border-slate-700 z-10'}`}
                        style={{ left: node.x, top: node.y }}
                    >
                        {/* Node Header */}
                        <div className="bg-slate-800 px-3 py-2 rounded-t-lg border-b border-slate-700 flex justify-between items-center cursor-move group/header relative">
                            <span className="font-bold text-white text-sm">{node.name}</span>
                            {!readOnly && (
                                <div className="flex gap-2">
                                    {/* Connect Handle */}
                                    <div 
                                        onMouseDown={(e) => handleConnectStart(e, node.id)}
                                        className="w-4 h-4 rounded-full bg-slate-600 hover:bg-brand-primary cursor-pointer flex items-center justify-center text-[8px] text-white"
                                        title="Drag to connect"
                                    >
                                        ➔
                                    </div>
                                    <button onClick={(e) => {e.stopPropagation(); addColumn(node.id)}} className="text-green-400 hover:text-green-300 text-xs font-bold px-2 py-0.5 bg-white/5 rounded">+ Col</button>
                                    <button onClick={(e) => {e.stopPropagation(); deleteTable(node.id)}} className="text-slate-500 hover:text-red-400 text-xs px-2 py-0.5">✕</button>
                                </div>
                            )}
                        </div>
                        
                        {/* Columns */}
                        <div className="p-2 space-y-1 bg-slate-900/90 max-h-[250px] overflow-y-auto custom-scrollbar">
                            {node.columns.map((col, idx) => (
                                <div key={idx} className="flex gap-2 items-center group">
                                    {readOnly ? (
                                        <>
                                            <span className="text-xs text-blue-100 font-mono w-1/3 truncate">{col.name}</span>
                                            <span className="text-[10px] text-yellow-500/80 w-1/4 truncate">{col.type}</span>
                                            <span className="text-[10px] text-slate-400 w-1/4 truncate">{col.constraints || '-'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <input 
                                                value={col.name}
                                                onChange={(e) => updateColumn(node.id, idx, 'name', e.target.value)}
                                                className="bg-transparent text-xs text-blue-100 font-mono w-1/3 border-b border-transparent focus:border-brand-primary outline-none"
                                                placeholder="col_name"
                                            />
                                            
                                            <select 
                                                value={col.type}
                                                onChange={(e) => updateColumn(node.id, idx, 'type', e.target.value)}
                                                className="bg-transparent text-[10px] text-yellow-500/80 w-1/4 border-b border-transparent focus:border-brand-primary outline-none cursor-pointer"
                                            >
                                                {COLUMN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                {!COLUMN_TYPES.includes(col.type) && <option value={col.type}>{col.type}</option>}
                                            </select>

                                            <input 
                                                value={col.constraints || ''}
                                                onChange={(e) => updateColumn(node.id, idx, 'constraints', e.target.value)}
                                                className="bg-transparent text-[10px] text-slate-400 w-1/4 border-b border-transparent focus:border-brand-primary outline-none"
                                                placeholder="Constraints"
                                            />
                                            <button 
                                                onClick={() => deleteColumn(node.id, idx)}
                                                className="text-red-500 opacity-0 group-hover:opacity-100 text-[10px] ml-auto hover:bg-white/10 rounded px-1"
                                            >
                                                ✕
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Instructions */}
        {!readOnly && (
            <div className="absolute bottom-4 left-4 text-[10px] text-glass-text-secondary pointer-events-none bg-black/40 px-2 py-1 rounded">
                Drag tables to rearrange. Drag arrow icon to connect.
            </div>
        )}
    </div>
  );
};

export default VisualERD;
