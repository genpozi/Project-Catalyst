
import React, { useCallback, useState } from 'react';
import { Task, TaskStatus } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateTasks: (updatedTasks: Task[]) => void;
  onGenerateGuide: (taskId: string) => Promise<void>;
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
}> = ({ title, tasks, onDragOver, onDrop, onDragStart, onTaskClick }) => {
  return (
    <div
      className="bg-slate-800/50 rounded-lg p-4 w-full flex-shrink-0 min-h-[400px]"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, title)}
    >
      <h3 className="font-bold text-lg mb-4 text-brand-accent border-b-2 border-brand-accent/50 pb-2">{title} ({tasks.length})</h3>
      <div className="space-y-3">
        {tasks.map(task => (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            onClick={() => onTaskClick(task)}
            className="bg-slate-700 p-3 rounded-md shadow-md cursor-pointer hover:bg-slate-600 hover:ring-1 hover:ring-brand-secondary transition-all group relative"
          >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                    {task.priority || 'Normal'}
                </span>
                <span className="text-[10px] text-slate-400">{task.estimatedDuration}</span>
            </div>
            <p className="text-sm text-blue-100 font-medium mb-2">{task.content}</p>
            <div className="flex justify-between items-center text-xs text-slate-400 mt-2 border-t border-slate-600 pt-2">
                <span>{task.role || 'General'}</span>
                <div className="flex items-center gap-2">
                    {task.implementationGuide && (
                        <span className="text-[10px] bg-brand-primary/40 text-brand-accent px-1.5 py-0.5 rounded flex items-center gap-1">
                            <span>✨</span> Guide Ready
                        </span>
                    )}
                </div>
            </div>
            {/* Hover hint */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-slate-900/80 p-1 rounded-full text-brand-accent">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
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
    onGenerate: () => void; 
    isGenerating: boolean;
}> = ({ task, onClose, onGenerate, isGenerating }) => {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slide-in-up">
                
                {/* Header */}
                <div className="bg-slate-800 p-6 border-b border-slate-700 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${getPriorityColor(task.priority)}`}>
                                {task.priority} Priority
                            </span>
                            <span className="text-slate-400 text-sm">{task.phase}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">{task.content}</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-grow overflow-y-auto p-6 custom-scrollbar bg-slate-900">
                    {task.implementationGuide ? (
                        <div className="prose prose-invert max-w-none">
                            <div className="bg-brand-primary/10 border border-brand-primary/30 p-4 rounded-lg mb-6 flex items-start gap-3">
                                <span className="text-2xl">💡</span>
                                <div>
                                    <h4 className="font-bold text-brand-accent m-0">AI Implementation Guide</h4>
                                    <p className="text-sm text-blue-200 m-0 mt-1">
                                        This guide is generated based on your project's specific tech stack and schema.
                                    </p>
                                </div>
                            </div>
                            <MarkdownRenderer content={task.implementationGuide} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                <span className="text-4xl">🪄</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Need a head start?</h3>
                            <p className="text-slate-400 max-w-md mb-8">
                                I can analyze your architecture, schema, and API specs to generate a detailed step-by-step implementation guide for this task.
                            </p>
                            <button
                                onClick={onGenerate}
                                disabled={isGenerating}
                                className="px-8 py-3 bg-brand-secondary hover:bg-blue-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Consulting Architect...</span>
                                    </>
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

                {/* Footer */}
                <div className="bg-slate-800 p-4 border-t border-slate-700 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 text-slate-300 hover:text-white font-semibold">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onUpdateTasks, onGenerateGuide, onContinue }) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
      // We rely on the parent updating the 'tasks' prop, which will reflect in the modal because we render based on the prop, 
      // but we need to find the updated task object to keep the modal content fresh.
      // However, since 'tasks' prop changes, 'activeTask' local state might be stale.
      // We'll trust the parent re-render flow or we can update local state in a useEffect if needed, 
      // but the simplest is to close/re-open or just find it again.
  };

  // Sync active task with latest data
  const displayedTask = activeTask ? tasks.find(t => t.id === activeTask.id) || activeTask : null;

  return (
    <div className="animate-slide-in-up">
      {displayedTask && (
          <TaskDetailModal 
            task={displayedTask} 
            onClose={() => setActiveTask(null)} 
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
      )}

      <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-6 text-center">Project Workspace</h2>
      <p className="text-center text-blue-200 mb-8">
        Drag and drop tasks to manage progress. Click any task to access the <strong>AI Implementation Assistant</strong>.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.values(TaskStatus).map(status => (
          <KanbanColumn
            key={status}
            title={status}
            tasks={tasks.filter(t => t.status === status)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onTaskClick={setActiveTask}
          />
        ))}
      </div>
      <div className="text-center mt-8">
        <button
          onClick={onContinue}
          className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
        >
          Finalize Specification
        </button>
      </div>
    </div>
  );
};

export default KanbanBoard;
