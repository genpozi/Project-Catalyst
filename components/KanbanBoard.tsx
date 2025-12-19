
import React, { useCallback, useState } from 'react';
import { Task, TaskStatus } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateTasks: (updatedTasks: Task[]) => void;
  onGenerateGuide: (taskId: string) => Promise<void>;
  onGenerateChecklist?: (taskId: string) => Promise<void>;
  onContinue: () => void;
}

const getPriorityColor = (p?: string) => {
  switch (p?.toLowerCase()) {
    case 'high': return 'text-red-400 border-red-500/30 bg-red-500/10';
    case 'medium': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    case 'low': return 'text-green-400 border-green-500/30 bg-green-500/10';
    default: return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
  }
};

const KanbanColumn: React.FC<{
  title: TaskStatus;
  tasks: Task[];
  count: number;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}> = ({ title, tasks, count, onDragOver, onDrop, onDragStart, onTaskClick, onAddTask }) => {
  
  // Status Color Indicators
  const statusColor = {
    [TaskStatus.TODO]: 'bg-slate-500',
    [TaskStatus.IN_PROGRESS]: 'bg-brand-primary',
    [TaskStatus.DONE]: 'bg-green-500'
  }[title];

  return (
    <div
      className="bg-brand-panel border border-glass-border rounded-lg p-3 w-full flex-shrink-0 min-h-[500px] flex flex-col"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, title)}
    >
      {/* Column Header */}
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
            <h3 className="font-bold text-sm text-gray-200 tracking-wide">{title}</h3>
            <span className="text-xs bg-brand-surface px-1.5 py-0.5 rounded text-glass-text-secondary font-mono">{count}</span>
        </div>
        <button 
            onClick={() => onAddTask(title)}
            className="text-glass-text-secondary hover:text-white transition-colors"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
        </button>
      </div>

      {/* Tasks Container */}
      <div className="space-y-3 flex-grow overflow-y-auto custom-scrollbar pr-1">
        {tasks.map(task => (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            className="group bg-[#0b0e14] border border-glass-border rounded hover:border-brand-primary/50 transition-all p-3 cursor-pointer relative"
          >
            {/* Header: Role & Priority */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-tech-cyan flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {task.role} Agent
                    </span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                        className="p-1 hover:bg-brand-surface rounded text-glass-text-secondary hover:text-white" 
                        title="View Details"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <p className="text-sm text-gray-300 font-medium leading-snug mb-3 line-clamp-3">
                {task.content}
            </p>

            {/* Meta Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
                <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${getPriorityColor(task.priority)}`}>
                    {task.priority || 'MED'}
                </span>
                <span className="text-[9px] bg-brand-surface text-glass-text-secondary px-1.5 py-0.5 rounded border border-glass-border font-mono">
                    {task.estimatedDuration}
                </span>
            </div>

            {/* Action Footer (Automaker Style) */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-glass-border">
                <button 
                    onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                    className="flex-1 bg-brand-surface hover:bg-brand-primary/20 hover:text-brand-primary text-xs py-1 rounded border border-glass-border transition-colors flex items-center justify-center gap-1.5 text-glass-text-secondary"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    Specs
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                    className="flex-1 bg-brand-surface hover:bg-brand-secondary/20 hover:text-brand-secondary text-xs py-1 rounded border border-glass-border transition-colors flex items-center justify-center gap-1.5 text-glass-text-secondary"
                >
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                   {task.checklist ? `${task.checklist.filter(c => c.completed).length}/${task.checklist.length}` : 'Log'}
                </button>
                {task.implementationGuide && (
                    <div className="w-2 h-2 rounded-full bg-tech-cyan shadow-[0_0_5px_#06b6d4]"></div>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TaskDetailModal: React.FC<{ 
    task: Task; 
    onClose: () => void; 
    onDelete: (id: string) => void;
    onGenerate: () => void; 
    onGenerateChecklist: () => void;
    onToggleChecklist: (id: string) => void;
    isGenerating: boolean;
    isGeneratingChecklist: boolean;
}> = ({ task, onClose, onDelete, onGenerate, onGenerateChecklist, onToggleChecklist, isGenerating, isGeneratingChecklist }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-brand-panel border border-glass-border w-full max-w-5xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-slide-in-up">
                
                {/* Modal Header */}
                <div className="bg-brand-dark p-6 border-b border-glass-border flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <span className="text-xs font-mono text-tech-cyan bg-tech-cyan/10 px-2 py-0.5 rounded border border-tech-cyan/20">TASK-{task.id.split('-')[1]}</span>
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                                {task.priority} Priority
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">{task.content}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-2 text-glass-text-secondary hover:text-white hover:bg-white/5 rounded transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col lg:flex-row">
                    {/* Left: Metadata & Checklist */}
                    <div className="lg:w-[320px] bg-brand-dark/50 border-r border-glass-border flex-shrink-0 p-6 space-y-6">
                        
                        {/* Meta Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[10px] uppercase text-glass-text-secondary font-bold tracking-wider">Assignee</span>
                                <div className="text-sm text-white font-mono mt-1">{task.role}</div>
                            </div>
                             <div>
                                <span className="text-[10px] uppercase text-glass-text-secondary font-bold tracking-wider">Phase</span>
                                <div className="text-sm text-white mt-1">{task.phase}</div>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase text-glass-text-secondary font-bold tracking-wider">Estimate</span>
                                <div className="text-sm text-white font-mono mt-1">{task.estimatedDuration}</div>
                            </div>
                        </div>

                        {/* Checklist Section */}
                        <div>
                             <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-bold text-glass-text uppercase tracking-wider">Sub-Tasks</h3>
                                {!task.checklist && (
                                    <button 
                                        onClick={onGenerateChecklist}
                                        disabled={isGeneratingChecklist}
                                        className="text-[10px] bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded border border-brand-primary/30 hover:bg-brand-primary/30 transition-colors"
                                    >
                                        {isGeneratingChecklist ? 'Generating...' : '+ AI Generate'}
                                    </button>
                                )}
                             </div>
                             
                             {task.checklist ? (
                                <div className="space-y-2">
                                    {task.checklist.map(item => (
                                        <label key={item.id} className="flex items-start gap-3 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors group">
                                            <input 
                                                type="checkbox" 
                                                checked={item.completed}
                                                onChange={() => onToggleChecklist(item.id)}
                                                className="mt-0.5 rounded border-glass-border bg-brand-dark text-brand-primary focus:ring-0"
                                            />
                                            <span className={`text-sm leading-snug ${item.completed ? 'text-glass-text-secondary line-through' : 'text-gray-300'}`}>
                                                {item.text}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                             ) : (
                                <div className="text-center py-6 border border-dashed border-glass-border rounded">
                                    <span className="text-xs text-glass-text-secondary">No sub-tasks defined.</span>
                                </div>
                             )}
                        </div>
                    </div>

                    {/* Right: Implementation Guide */}
                    <div className="flex-grow p-8 bg-brand-panel">
                        {task.implementationGuide ? (
                             <div className="animate-fade-in">
                                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-glass-border">
                                    <span className="text-xl">⚡</span>
                                    <h3 className="font-bold text-white">Architectural Guide</h3>
                                </div>
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <MarkdownRenderer content={task.implementationGuide} />
                                </div>
                             </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                    <span className="text-2xl">🪄</span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Generate Solution</h3>
                                <p className="text-sm text-glass-text-secondary max-w-sm mb-6">
                                    Ask the Architect Agent to generate a step-by-step implementation guide for this specific task.
                                </p>
                                <button
                                    onClick={onGenerate}
                                    disabled={isGenerating}
                                    className="px-6 py-2 bg-brand-primary text-white text-sm font-bold rounded-md hover:bg-brand-secondary transition-colors shadow-glow"
                                >
                                    {isGenerating ? 'Architecting...' : 'Initialize Guide Agent'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-brand-dark p-4 border-t border-glass-border flex justify-between items-center">
                    <button 
                        onClick={() => { if(window.confirm('Delete task?')) { onDelete(task.id); onClose(); } }}
                        className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete Task
                    </button>
                    <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/15 text-white font-bold rounded-md text-sm transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onUpdateTasks, onGenerateGuide, onGenerateChecklist, onContinue }) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);

  // Drag and Drop Logic
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.setData('taskId', task.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
    const taskId = e.dataTransfer.getData('taskId');
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    onUpdateTasks(updatedTasks);
  }, [tasks, onUpdateTasks]);

  // Handlers
  const handleGenerate = async () => {
      if (!activeTask) return;
      setIsGenerating(true);
      await onGenerateGuide(activeTask.id);
      setIsGenerating(false);
  };

  const handleGenChecklist = async () => {
    if (!activeTask || !onGenerateChecklist) return;
    setIsGeneratingChecklist(true);
    await onGenerateChecklist(activeTask.id);
    setIsGeneratingChecklist(false);
  };

  const handleToggleItem = (itemId: string) => {
    if (!activeTask) return;
    const updatedTasks = tasks.map(t => {
      if (t.id === activeTask.id) {
        return {
          ...t,
          checklist: t.checklist?.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item)
        };
      }
      return t;
    });
    onUpdateTasks(updatedTasks);
  };

  const handleAddTask = (status: TaskStatus) => {
    const newTask: Task = {
        id: `manual-${Date.now()}`,
        content: 'New Implementation Task',
        description: 'Describe the task...',
        status: status,
        priority: 'Medium',
        estimatedDuration: '1h',
        role: 'Developer',
        phase: 'Execution'
    };
    onUpdateTasks([...tasks, newTask]);
  };

  const handleDeleteTask = (id: string) => {
    onUpdateTasks(tasks.filter(t => t.id !== id));
  };

  const handleExportCSV = () => {
    const headers = ['Summary', 'Description', 'Status', 'Priority', 'Assignee', 'Estimate', 'Phase'];
    const rows = tasks.map(t => [
        `"${t.content.replace(/"/g, '""')}"`,
        `"${(t.description || t.content).replace(/"/g, '""')}"`,
        t.status,
        t.priority,
        t.role,
        t.estimatedDuration,
        t.phase
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "0relai_tasks_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const displayedTask = activeTask ? tasks.find(t => t.id === activeTask.id) || activeTask : null;

  return (
    <div className="animate-slide-in-up flex flex-col h-full">
      {displayedTask && (
          <TaskDetailModal 
            task={displayedTask} 
            onClose={() => setActiveTask(null)} 
            onDelete={handleDeleteTask}
            onGenerate={handleGenerate}
            onGenerateChecklist={handleGenChecklist}
            onToggleChecklist={handleToggleItem}
            isGenerating={isGenerating}
            isGeneratingChecklist={isGeneratingChecklist}
          />
      )}

      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Active Agents Board</h2>
            <p className="text-glass-text-secondary text-sm">Manage and execute architectural directives.</p>
        </div>
        <button 
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-brand-surface hover:bg-brand-surface/80 text-white text-xs font-bold rounded border border-glass-border flex items-center gap-2 transition-all"
        >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export CSV
        </button>
      </div>

      {/* Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
        {Object.values(TaskStatus).map(status => (
          <KanbanColumn
            key={status}
            title={status}
            tasks={tasks.filter(t => t.status === status)}
            count={tasks.filter(t => t.status === status).length}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onTaskClick={setActiveTask}
            onAddTask={handleAddTask}
          />
        ))}
      </div>
      
      <div className="text-center mt-8 mb-4">
        <button
          onClick={onContinue}
          className="px-10 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded shadow-lg transition-all text-sm"
        >
          Finalize & Deploy Documentation
        </button>
      </div>
    </div>
  );
};

export default KanbanBoard;
