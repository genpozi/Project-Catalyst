
import React, { useCallback, useState } from 'react';
import { Task, TaskStatus, ProjectData } from '../types';
import VirtualList from './VirtualList';
import { useProject } from '../ProjectContext';

interface KanbanBoardProps {
  tasks: Task[];
  projectData?: ProjectData;
  onUpdateTasks: (updatedTasks: Task[]) => void;
  onGenerateGuide: (taskId: string) => Promise<void>;
  onGenerateChecklist?: (taskId: string) => Promise<void>;
  onGenerateCode?: (taskId: string) => Promise<void>;
  onRefineCode?: (taskId: string, feedback: string) => Promise<void>;
  onCommitFile?: (taskId: string) => void;
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

const NewTaskModal: React.FC<{
    status: TaskStatus;
    onClose: () => void;
    onSubmit: (task: Partial<Task>) => void;
}> = ({ status, onClose, onSubmit }) => {
    const [content, setContent] = useState('');
    const [role, setRole] = useState('Developer');
    const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
    const [estimate, setEstimate] = useState('1h');

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <div className="bg-[#1e293b] border border-white/10 w-full max-w-md rounded-xl shadow-2xl p-6 animate-fade-in">
                <h3 className="text-lg font-bold text-white mb-4">Add Task to {status}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Task Summary</label>
                        <input 
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full glass-input px-3 py-2 rounded-lg text-sm"
                            placeholder="e.g. Implement Auth Middleware"
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Role</label>
                            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full glass-input px-3 py-2 rounded-lg bg-slate-900 text-sm">
                                <option>Developer</option>
                                <option>Designer</option>
                                <option>DevOps</option>
                                <option>QA</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Priority</label>
                            <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full glass-input px-3 py-2 rounded-lg bg-slate-900 text-sm">
                                <option>High</option>
                                <option>Medium</option>
                                <option>Low</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Est. Duration</label>
                        <input 
                            value={estimate}
                            onChange={(e) => setEstimate(e.target.value)}
                            className="w-full glass-input px-3 py-2 rounded-lg text-sm"
                            placeholder="e.g. 2h 30m"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-glass-text-secondary hover:text-white transition-colors">Cancel</button>
                    <button 
                        onClick={() => {
                            if(content.trim()) {
                                onSubmit({ content, role, priority, estimatedDuration: estimate, status });
                                onClose();
                            }
                        }}
                        disabled={!content.trim()}
                        className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-xs font-bold shadow-lg transition-all disabled:opacity-50"
                    >
                        Create Task
                    </button>
                </div>
            </div>
        </div>
    );
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
  isReadOnly: boolean;
}> = ({ title, tasks, count, onDragOver, onDrop, onDragStart, onTaskClick, onAddTask, isReadOnly }) => {
  
  const statusColor = {
    [TaskStatus.TODO]: 'bg-slate-500',
    [TaskStatus.IN_PROGRESS]: 'bg-brand-primary',
    [TaskStatus.DONE]: 'bg-green-500'
  }[title];

  const renderRow = (task: Task, style: React.CSSProperties) => (
      <div style={style} className="px-1 py-1.5">
          <div
            draggable={!isReadOnly}
            onDragStart={(e) => !isReadOnly && onDragStart(e, task)}
            onClick={() => onTaskClick(task)}
            className={`group bg-[#1e293b] border border-white/5 rounded-lg transition-all p-3 cursor-pointer relative h-full flex flex-col hover:bg-[#252f45] hover:border-white/10 hover:shadow-lg`}
          >
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                        {task.role === 'Designer' ? '🎨' : task.role === 'DevOps' ? '⚙️' : '💻'}
                        {task.role}
                    </span>
                </div>
            </div>

            <p className="text-xs text-gray-300 font-medium leading-snug mb-2 line-clamp-2 flex-grow">
                {task.content}
            </p>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                <div className="flex gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${getPriorityColor(task.priority)}`}>
                        {task.priority || 'MED'}
                    </span>
                    <span className="text-[9px] bg-black/20 text-glass-text-secondary px-1.5 py-0.5 rounded border border-white/5 font-mono">
                        {task.estimatedDuration}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {task.implementationGuide && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_3px_#22d3ee]"></div>}
                    {task.codeSnippet && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_3px_#c084fc]"></div>}
                </div>
            </div>
          </div>
      </div>
  );

  return (
    <div
      className="bg-[#0f172a] border border-white/5 rounded-xl p-3 h-full flex flex-col overflow-hidden"
      onDragOver={onDragOver}
      onDrop={(e) => !isReadOnly && onDrop(e, title)}
    >
      <div className="flex justify-between items-center mb-3 px-1 flex-shrink-0">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
            <h3 className="font-bold text-xs text-gray-200 tracking-wide uppercase">{title}</h3>
            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-glass-text-secondary font-mono">{count}</span>
        </div>
        {!isReadOnly && (
            <button 
                onClick={() => onAddTask(title)}
                className="text-glass-text-secondary hover:text-white transition-colors hover:bg-white/5 p-1 rounded"
                title="Add Task"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            </button>
        )}
      </div>

      <div className="flex-grow relative">
          <VirtualList 
            items={tasks}
            itemHeight={110} // Compact height for cleaner density
            renderItem={renderRow}
            className="h-full custom-scrollbar"
          />
      </div>
    </div>
  );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, projectData, onUpdateTasks, onGenerateGuide, onGenerateChecklist, onGenerateCode, onRefineCode, onCommitFile, onContinue }) => {
  const { currentRole } = useProject();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [addingTaskStatus, setAddingTaskStatus] = useState<TaskStatus | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.setData('taskId', task.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
    if (currentRole === 'Viewer') return;
    const taskId = e.dataTransfer.getData('taskId');
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    onUpdateTasks(updatedTasks);
  }, [tasks, onUpdateTasks, currentRole]);

  const handleAddTaskSubmit = (task: Partial<Task>) => {
      const newTask: Task = {
          id: `manual-${Date.now()}`,
          content: task.content || 'New Task',
          description: 'Manual task added via Kanban.',
          status: task.status || TaskStatus.TODO,
          priority: task.priority || 'Medium',
          estimatedDuration: task.estimatedDuration || '1h',
          role: task.role || 'Developer',
          phase: 'Execution'
      };
      onUpdateTasks([...tasks, newTask]);
  };

  return (
    <div className="h-full flex flex-col animate-fade-in overflow-hidden">
      {addingTaskStatus && (
          <NewTaskModal 
            status={addingTaskStatus} 
            onClose={() => setAddingTaskStatus(null)} 
            onSubmit={handleAddTaskSubmit}
          />
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                Task Board
                {currentRole === 'Viewer' && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-normal">Viewer Mode</span>}
            </h2>
            <p className="text-xs text-glass-text-secondary">Manage implementation tasks and progress.</p>
        </div>
        {!currentRole && (
             <button
                onClick={onContinue}
                className="px-4 py-1.5 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-lg transition-all"
            >
                Next Phase
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow min-h-0">
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
            onAddTask={() => setAddingTaskStatus(status)}
            isReadOnly={currentRole === 'Viewer'}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
