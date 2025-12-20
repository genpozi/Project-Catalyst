
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Phase, PlanTask } from '../types';
import { exportAsImage } from '../utils/imageExporter';

interface VisualGanttProps {
  plan: Phase[];
  onUpdateTask?: (phaseIndex: number, taskIndex: number, updates: Partial<PlanTask>) => void;
  readOnly?: boolean;
}

const parseDurationToHours = (duration: string): number => {
  const d = duration.toLowerCase().trim();
  const val = parseFloat(d.replace(/[^0-9.]/g, '')) || 0;
  
  if (d.includes('month')) return val * 4 * 5 * 8; // Approx 1 month = 4 weeks * 5 days * 8 hours
  if (d.includes('week')) return val * 5 * 8;
  if (d.includes('day')) return val * 8;
  if (d.includes('hour') || d.includes(' h')) return val;
  return 8; // Default to 1 day
};

const getRoleColor = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('front') || r.includes('ui') || r.includes('design')) return 'bg-purple-500 border-purple-400';
    if (r.includes('back') || r.includes('api') || r.includes('db')) return 'bg-blue-500 border-blue-400';
    if (r.includes('devops') || r.includes('cloud')) return 'bg-orange-500 border-orange-400';
    if (r.includes('qa') || r.includes('test')) return 'bg-green-500 border-green-400';
    if (r.includes('manager') || r.includes('lead')) return 'bg-red-500 border-red-400';
    return 'bg-slate-500 border-slate-400';
};

const TaskEditPopover: React.FC<{
    task: { name: string; role: string; durationRaw: string; priority: string };
    position: { x: number, y: number };
    onClose: () => void;
    onChange: (field: keyof PlanTask, value: string) => void;
}> = ({ task, position, onClose, onChange }) => {
    return (
        <div 
            className="absolute z-50 bg-[#1e293b]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-4 w-72 flex flex-col gap-3 animate-fade-in"
            style={{ left: Math.min(window.innerWidth - 320, position.x + 20), top: position.y + 20 }}
        >
            <div className="flex justify-between items-start mb-1">
                <h4 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider">Edit Task</h4>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <div>
                <input 
                    value={task.name}
                    onChange={(e) => onChange('description', e.target.value)}
                    className="w-full bg-transparent border-b border-slate-600 focus:border-brand-primary text-sm font-bold text-white focus:outline-none py-1"
                    placeholder="Task Name"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Duration</label>
                    <input 
                        value={task.durationRaw}
                        onChange={(e) => onChange('estimatedDuration', e.target.value)}
                        className="w-full bg-slate-900/50 rounded px-2 py-1 text-xs text-brand-secondary border border-slate-700 focus:border-brand-primary focus:outline-none"
                        placeholder="e.g. 2 days"
                    />
                </div>
                <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Priority</label>
                    <select 
                        value={task.priority}
                        onChange={(e) => onChange('priority', e.target.value)}
                        className="w-full bg-slate-900/50 rounded px-2 py-1 text-xs text-white border border-slate-700 focus:border-brand-primary focus:outline-none"
                    >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Role</label>
                <input 
                    value={task.role}
                    onChange={(e) => onChange('role', e.target.value)}
                    className="w-full bg-slate-900/50 rounded px-2 py-1 text-xs text-white border border-slate-700 focus:border-brand-primary focus:outline-none"
                    placeholder="Role"
                />
            </div>
        </div>
    );
};

const VisualGantt: React.FC<VisualGanttProps> = ({ plan, onUpdateTask, readOnly = false }) => {
  const [selectedTask, setSelectedTask] = useState<{ id: string; pIdx: number; tIdx: number; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const processedData = useMemo(() => {
    let currentOffset = 0;
    const tasks: Array<{
      id: string;
      pIdx: number;
      tIdx: number;
      phase: string;
      name: string;
      role: string;
      priority: string;
      start: number;
      duration: number;
      durationRaw: string;
      end: number;
    }> = [];

    plan.forEach((phase, pIdx) => {
        phase.tasks.forEach((task, tIdx) => {
            const duration = parseDurationToHours(task.estimatedDuration);
            tasks.push({
                id: `${pIdx}-${tIdx}`,
                pIdx,
                tIdx,
                phase: phase.phase_name,
                name: task.description,
                role: task.role,
                priority: task.priority,
                start: currentOffset,
                duration: duration,
                durationRaw: task.estimatedDuration,
                end: currentOffset + duration
            });
            currentOffset += duration;
        });
    });

    return { tasks, totalHours: currentOffset };
  }, [plan]);

  const totalWidth = processedData.totalHours;
  const pixelsPerHour = Math.max(2, 1000 / totalWidth); // Scale to fit or scroll

  // Generate Week Markers
  const markers = [];
  const hoursPerWeek = 40;
  for (let i = 0; i <= totalWidth; i += hoursPerWeek) {
      markers.push(i);
  }

  const handleTaskClick = (e: React.MouseEvent, pIdx: number, tIdx: number) => {
      if (readOnly) return;
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setSelectedTask({ 
          id: `${pIdx}-${tIdx}`, 
          pIdx, 
          tIdx,
          x: rect.right, 
          y: rect.top 
      });
  };

  const handleTaskChange = (field: keyof PlanTask, value: string) => {
      if (selectedTask && onUpdateTask) {
          onUpdateTask(selectedTask.pIdx, selectedTask.tIdx, { [field]: value });
      }
  };

  return (
    <div className="bg-[#0b0e14] rounded-xl border border-white/5 overflow-hidden flex flex-col h-[600px] relative" onClick={() => setSelectedTask(null)} ref={containerRef}>
        {/* Popover */}
        {selectedTask && (
            <TaskEditPopover 
                task={processedData.tasks.find(t => t.id === selectedTask.id)!}
                position={{ x: selectedTask.x, y: selectedTask.y }}
                onClose={() => setSelectedTask(null)}
                onChange={handleTaskChange}
            />
        )}

        {/* Header Legend */}
        <div className="flex justify-between items-center px-4 py-3 bg-slate-900 border-b border-white/5 flex-shrink-0">
            <div className="flex gap-4 overflow-x-auto">
                <div className="flex items-center gap-2 text-[10px] text-glass-text-secondary whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> Frontend
                </div>
                <div className="flex items-center gap-2 text-[10px] text-glass-text-secondary whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Backend
                </div>
                <div className="flex items-center gap-2 text-[10px] text-glass-text-secondary whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> DevOps
                </div>
                <div className="flex items-center gap-2 text-[10px] text-glass-text-secondary whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> QA
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="text-xs font-bold text-white whitespace-nowrap">
                    Total: {Math.ceil(totalWidth / 8)} Days
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); exportAsImage(containerRef.current, 'roadmap-gantt'); }}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded text-[10px] font-bold border border-white/10 ignore-export"
                >
                    📷 Export
                </button>
            </div>
        </div>

        <div className="flex flex-grow overflow-auto custom-scrollbar relative">
            {/* Sidebar (Task Names) */}
            <div className="w-64 flex-shrink-0 bg-slate-900/50 border-r border-white/5 sticky left-0 z-20 backdrop-blur-md">
                <div className="h-8 border-b border-white/5 bg-slate-900 sticky top-0 z-30 flex items-center px-4 text-xs font-bold text-glass-text-secondary">
                    Phase / Task
                </div>
                {processedData.tasks.map((task, idx) => (
                    <div 
                        key={idx} 
                        className={`h-10 border-b border-white/5 flex flex-col justify-center px-4 text-[11px] transition-colors ${!readOnly ? 'cursor-pointer hover:bg-white/5' : ''} ${selectedTask?.id === task.id ? 'bg-white/10 border-l-2 border-l-brand-primary' : ''}`}
                        onClick={(e) => handleTaskClick(e, task.pIdx, task.tIdx)}
                        title={task.name}
                    >
                        <span className="text-slate-300 truncate font-medium">{task.name}</span>
                        <span className="text-[9px] text-glass-text-secondary truncate">{task.phase}</span>
                    </div>
                ))}
            </div>

            {/* Timeline */}
            <div className="flex-grow relative min-w-[800px]">
                {/* Time Axis Header */}
                <div className="h-8 border-b border-white/5 bg-slate-900 sticky top-0 z-10 flex">
                    {markers.map((marker, idx) => (
                        <div 
                            key={idx} 
                            className="absolute border-l border-white/10 h-full pl-1 text-[9px] text-glass-text-secondary font-mono flex items-center"
                            style={{ left: marker * pixelsPerHour }}
                        >
                            W{idx + 1}
                        </div>
                    ))}
                </div>

                {/* Grid Lines */}
                <div className="absolute inset-0 pointer-events-none">
                    {markers.map((marker, idx) => (
                        <div 
                            key={idx} 
                            className="absolute border-l border-white/5 h-full"
                            style={{ left: marker * pixelsPerHour }}
                        ></div>
                    ))}
                </div>

                {/* Bars */}
                <div className="relative pt-0">
                    {processedData.tasks.map((task, idx) => (
                        <div key={idx} className="h-10 border-b border-white/5 relative flex items-center group">
                            <div 
                                onClick={(e) => handleTaskClick(e, task.pIdx, task.tIdx)}
                                className={`h-6 rounded-md ${getRoleColor(task.role)} bg-opacity-80 border-b-2 shadow-lg relative overflow-hidden flex items-center px-2 group-hover:z-10 ${selectedTask?.id === task.id ? 'ring-2 ring-white z-20 brightness-110' : ''} ${!readOnly ? 'hover:bg-opacity-100 hover:scale-[1.01] cursor-pointer' : ''}`}
                                style={{ 
                                    left: task.start * pixelsPerHour, 
                                    width: Math.max(2, task.duration * pixelsPerHour) 
                                }}
                            >
                                {/* Stripe pattern overlay */}
                                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                                
                                <span className="text-[9px] font-bold text-white drop-shadow-md truncate pointer-events-none sticky left-0">
                                    {task.durationRaw}
                                </span>

                                {/* Tooltip (Only show if not selected) */}
                                {selectedTask?.id !== task.id && !readOnly && (
                                    <div className="absolute left-full top-0 ml-2 bg-black/90 text-white text-[10px] p-2 rounded w-48 z-50 hidden group-hover:block border border-white/10 shadow-xl pointer-events-none">
                                        <div className="font-bold mb-1 text-brand-secondary">{task.role}</div>
                                        <div className="mb-1">{task.name}</div>
                                        <div className="flex justify-between text-glass-text-secondary">
                                            <span>{task.priority}</span>
                                            <span>{task.durationRaw}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default VisualGantt;
