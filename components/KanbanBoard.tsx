
import React, { useCallback, useState } from 'react';
import { Task, TaskStatus, ChecklistItem } from '../types';
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
    case 'high': return 'bg-red-900/60 text-red-200';
    case 'medium': return 'bg-yellow-900/60 text-yellow-200';
    case 'low': return 'bg-green-900/60 text-green-200';
    default: return 'bg-slate-600 text-slate-300';
  }
};

const KanbanColumn: React.FC<{
  title: TaskStatus;
  tasks: Task[];
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}> = ({ title, tasks, onDragOver, onDrop, onDragStart, onTaskClick, onAddTask }) => {
  return (
    <div
      className="bg-white/5 border border-white/5 rounded-2xl p-4 w-full flex-shrink-0 min-h-[500px] flex flex-col"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, title)}
    >
      <div className="flex justify-between items-center mb-6 px-2">
        <h3 className="font-bold text-lg text-brand-accent tracking-tight">{title} <span className="text-glass-text-secondary text-sm ml-1">({tasks.length})</span></h3>
        <button 
            onClick={() => onAddTask(title)}
            className="w-6 h-6 rounded-full bg-white/5 hover:bg-brand-primary hover:text-white transition-all text-glass-text-secondary flex items-center justify-center text-lg font-light"
        >
            +
        </button>
      </div>
      <div className="space-y-4 flex-grow overflow-y-auto custom-scrollbar pr-1">
        {tasks.map(task => (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            onClick={() => onTaskClick(task)}
            className="glass-panel p-4 rounded-xl shadow-lg cursor-pointer hover:border-brand-secondary/50 hover:bg-white/5 transition-all group relative border border-white/5"
          >
            <div className="flex justify-between items-start mb-3">
                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider ${getPriorityColor(task.priority)}`}>
                    {task.priority || 'Medium'}
                </span>
                <span className="text-[10px] text-glass-text-secondary font-mono">{task.estimatedDuration}</span>
            </div>
            <p className="text-sm text-blue-100 font-semibold mb-3 leading-relaxed">{task.content}</p>
            <div className="flex justify-between items-center text-[10px] text-glass-text-secondary mt-3 border-t border-white/5 pt-3">
                <span className="uppercase tracking-widest">{task.role || 'Agent'}</span>
                <div className="flex items-center gap-1.5">
                    {task.checklist && (
                      <span className="text-[9px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
                        {task.checklist.filter(c => c.completed).length}/{task.checklist.length}
                      </span>
                    )}
                    {task.implementationGuide && (
                        <span className="text-[9px] bg-brand-primary/20 text-brand-accent px-2 py-0.5 rounded-full border border-brand-primary/20 animate-pulse">
                            READY
                        </span>
                    )}
                </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="flex-grow flex flex-col items-center justify-center py-10 opacity-20">
            <div className="w-12 h-12 border border-dashed border-white rounded-full flex items-center justify-center text-xl mb-2">?</div>
            <p className="text-xs">No tasks here</p>
          </div>
        )}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-[#0f172a] border border-white/10 w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-in-up">
                
                <div className="bg-white/5 p-8 border-b border-white/10 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${getPriorityColor(task.priority)}`}>
                                {task.priority} Priority
                            </span>
                            <span className="text-glass-text-secondary text-xs uppercase tracking-widest">{task.phase} Layer</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">{task.content}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => { if(window.confirm('Delete task?')) { onDelete(task.id); onClose(); } }}
                            className="p-3 text-red-400 hover:bg-red-500/10 rounded-full transition-all"
                            title="Delete Task"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        <button onClick={onClose} className="p-3 text-glass-text-secondary hover:text-white hover:bg-white/5 rounded-full transition-all">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-8 custom-scrollbar flex flex-col lg:flex-row gap-8">
                    {/* Left: Checklist & Metadata */}
                    <div className="lg:w-[350px] space-y-6 flex-shrink-0">
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-brand-accent flex items-center gap-2 text-xs uppercase tracking-widest">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                            Task Checklist
                          </h3>
                          {!task.checklist && (
                            <button 
                              onClick={onGenerateChecklist}
                              disabled={isGeneratingChecklist}
                              className="text-[10px] bg-brand-primary/20 text-brand-accent px-3 py-1 rounded-lg hover:bg-brand-primary/40 disabled:opacity-50 transition-all font-bold"
                            >
                              {isGeneratingChecklist ? '...' : 'AUTO-GEN'}
                            </button>
                          )}
                        </div>
                        
                        {task.checklist ? (
                          <div className="space-y-3">
                            {task.checklist.map(item => (
                              <div key={item.id} className="flex items-start gap-3 group">
                                <input 
                                  type="checkbox" 
                                  checked={item.completed} 
                                  onChange={() => onToggleChecklist(item.id)}
                                  className="mt-1 h-5 w-5 rounded-lg border-white/10 bg-white/5 text-brand-primary focus:ring-brand-primary transition-all cursor-pointer"
                                />
                                <span className={`text-sm leading-snug transition-all ${item.completed ? 'text-glass-text-secondary line-through' : 'text-blue-100'}`}>
                                  {item.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-10 text-glass-text-secondary text-xs italic opacity-50">
                            Checklist is currently empty.
                          </div>
                        )}
                      </div>

                      <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-[11px] text-glass-text-secondary uppercase tracking-widest space-y-4 shadow-inner">
                        <div className="flex justify-between items-center"><span>Assignee</span> <span className="text-white font-bold">{task.role || 'Unassigned'}</span></div>
                        <div className="flex justify-between items-center"><span>Timeline</span> <span className="text-white font-bold">{task.estimatedDuration || 'TBD'}</span></div>
                        <div className="flex justify-between items-center"><span>ID</span> <span className="text-white font-mono opacity-50">{task.id.split('-')[1]}</span></div>
                      </div>
                    </div>

                    {/* Right: Implementation Guide */}
                    <div className="flex-grow bg-black/20 rounded-3xl border border-white/5 p-8 relative overflow-hidden">
                        {task.implementationGuide ? (
                            <div className="prose prose-invert max-w-none animate-fade-in">
                                <div className="bg-brand-primary/10 border border-brand-primary/20 p-5 rounded-2xl mb-8 flex items-start gap-4">
                                    <span className="text-3xl drop-shadow-lg">💡</span>
                                    <div>
                                        <h4 className="font-bold text-brand-accent m-0 uppercase tracking-widest text-xs">Technical Architect's Brief</h4>
                                        <p className="text-sm text-blue-100/80 m-0 mt-1">Specific code-level execution steps refined for your stack.</p>
                                    </div>
                                </div>
                                <MarkdownRenderer content={task.implementationGuide} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-fade-in">
                                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 relative group border border-white/5">
                                    <div className="absolute inset-0 bg-brand-primary/10 rounded-3xl animate-pulse group-hover:bg-brand-primary/20"></div>
                                    <span className="text-4xl relative z-10 transition-transform group-hover:scale-110">🪄</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">Architectural Implementation Logic</h3>
                                <p className="text-glass-text-secondary text-sm max-w-sm mb-8 leading-relaxed">
                                    0relai will analyze the entire project blueprint to generate a custom step-by-step guide for this specific task.
                                </p>
                                <button
                                    onClick={onGenerate}
                                    disabled={isGenerating}
                                    className="px-10 py-4 glass-button-primary disabled:grayscale disabled:opacity-50 text-white font-bold rounded-2xl shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105"
                                >
                                    {isGenerating ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Consulting Architect...</span>
                                        </div>
                                    ) : (
                                        <>
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                          <span>Generate Implementation Guide</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white/5 p-6 border-t border-white/10 flex justify-end gap-4">
                    <button onClick={onClose} className="px-8 py-3 text-glass-text-secondary hover:text-white font-bold uppercase tracking-widest text-xs transition-all">Dismiss</button>
                    <button onClick={onClose} className="px-10 py-3 glass-button-primary text-white font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all">Done</button>
                </div>
            </div>
        </div>
    );
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onUpdateTasks, onGenerateGuide, onGenerateChecklist, onContinue }) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);

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
        content: 'New Architectural Task',
        description: 'New Architectural Task',
        status: status,
        priority: 'Medium',
        estimatedDuration: '1h',
        role: 'Developer',
        phase: 'General'
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
    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "0relai_tasks_jira_import.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Fixed memory leak
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

      <div className="flex justify-between items-center mb-10">
        <div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Project Workspace</h2>
            <p className="text-glass-text-secondary text-sm">
                Drag cards to update status. Consult the <strong className="text-brand-accent">Architect</strong> for implementation.
            </p>
        </div>
        <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold flex items-center gap-2 border border-white/10 transition-all"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export to Jira/Linear (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
        {Object.values(TaskStatus).map(status => (
          <KanbanColumn
            key={status}
            title={status}
            tasks={tasks.filter(t => t.status === status)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onTaskClick={setActiveTask}
            onAddTask={handleAddTask}
          />
        ))}
      </div>
      <div className="text-center mt-12 mb-6">
        <button
          onClick={onContinue}
          className="px-12 py-4 glass-button-primary text-white font-bold rounded-2xl shadow-xl hover:scale-105 transition-all text-lg tracking-tight"
        >
          Finalize Documentation & Launch
        </button>
      </div>
    </div>
  );
};

export default KanbanBoard;
