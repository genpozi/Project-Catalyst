
import React, { useCallback, useState } from 'react';
import { Task, TaskStatus, ProjectData } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import CodeEditor from './CodeEditor';
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
            <div className="bg-brand-panel border border-glass-border w-full max-w-md rounded-xl shadow-2xl p-6 animate-slide-in-up">
                <h3 className="text-lg font-bold text-white mb-4">Add Task to {status}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Task Summary</label>
                        <input 
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full glass-input px-3 py-2 rounded-lg"
                            placeholder="e.g. Implement Auth Middleware"
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Role</label>
                            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full glass-input px-3 py-2 rounded-lg">
                                <option>Developer</option>
                                <option>Designer</option>
                                <option>DevOps</option>
                                <option>QA</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Priority</label>
                            <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full glass-input px-3 py-2 rounded-lg">
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
                            className="w-full glass-input px-3 py-2 rounded-lg"
                            placeholder="e.g. 2h 30m"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-glass-text-secondary hover:text-white transition-colors">Cancel</button>
                    <button 
                        onClick={() => {
                            if(content.trim()) {
                                onSubmit({ content, role, priority, estimatedDuration: estimate, status });
                                onClose();
                            }
                        }}
                        disabled={!content.trim()}
                        className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-sm font-bold shadow-lg transition-all disabled:opacity-50"
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
            className={`group bg-[#0b0e14] border border-glass-border rounded transition-all p-3 cursor-pointer relative h-full flex flex-col ${isReadOnly ? '' : 'hover:border-brand-primary/50'}`}
          >
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-tech-cyan flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {task.role}
                    </span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <div className="p-1 rounded text-glass-text-secondary hover:text-white" title="View Details">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </div>
                </div>
            </div>

            <p className="text-sm text-gray-300 font-medium leading-snug mb-2 line-clamp-2 flex-grow">
                {task.content}
            </p>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-glass-border/50">
                <div className="flex gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${getPriorityColor(task.priority)}`}>
                        {task.priority || 'MED'}
                    </span>
                    <span className="text-[9px] bg-brand-surface text-glass-text-secondary px-1.5 py-0.5 rounded border border-glass-border font-mono">
                        {task.estimatedDuration}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {task.implementationGuide && <div className="w-1.5 h-1.5 rounded-full bg-tech-cyan shadow-[0_0_3px_#06b6d4]"></div>}
                    {task.codeSnippet && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_3px_#c084fc]"></div>}
                </div>
            </div>
          </div>
      </div>
  );

  return (
    <div
      className="bg-brand-panel border border-glass-border rounded-lg p-3 w-full flex-shrink-0 min-h-[500px] flex flex-col"
      onDragOver={onDragOver}
      onDrop={(e) => !isReadOnly && onDrop(e, title)}
    >
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
            <h3 className="font-bold text-sm text-gray-200 tracking-wide">{title}</h3>
            <span className="text-xs bg-brand-surface px-1.5 py-0.5 rounded text-glass-text-secondary font-mono">{count}</span>
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

      <div className="flex-grow overflow-hidden relative">
          <VirtualList 
            items={tasks}
            itemHeight={140} 
            renderItem={renderRow}
            className="h-full custom-scrollbar"
          />
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
    onGenerateCode: () => void;
    onRefineCode?: (taskId: string, feedback: string) => Promise<void>;
    onCommitFile?: (taskId: string) => void;
    onToggleChecklist: (id: string) => void;
    isGenerating: boolean;
    isGeneratingChecklist: boolean;
    isGeneratingCode: boolean;
    isReadOnly: boolean;
}> = ({ task, onClose, onDelete, onGenerate, onGenerateChecklist, onGenerateCode, onRefineCode, onCommitFile, onToggleChecklist, isGenerating, isGeneratingChecklist, isGeneratingCode, isReadOnly }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'guide' | 'code'>('details');
    const [copiedCode, setCopiedCode] = useState(false);
    const [refineCodeInput, setRefineCodeInput] = useState('');
    const [isRefiningCode, setIsRefiningCode] = useState(false);

    const handleCopyCode = () => {
        if(task.codeSnippet?.code) {
            navigator.clipboard.writeText(task.codeSnippet.code);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        }
    };

    const handleRefineCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!refineCodeInput.trim() || !onRefineCode || isReadOnly) return;
        setIsRefiningCode(true);
        await onRefineCode(task.id, refineCodeInput);
        setIsRefiningCode(false);
        setRefineCodeInput('');
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-brand-panel border border-glass-border w-full max-w-5xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-slide-in-up">
                
                <div className="bg-brand-dark p-6 border-b border-glass-border flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <span className="text-xs font-mono text-tech-cyan bg-tech-cyan/10 px-2 py-0.5 rounded border border-tech-cyan/20">TASK-{task.id.split('-')[1] || '00'}</span>
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                                {task.priority} Priority
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">{task.content}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-2 text-glass-text-secondary hover:text-white hover:bg-white/5 rounded transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-brand-dark px-6 border-b border-glass-border">
                    <button 
                        onClick={() => setActiveTab('details')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-brand-primary text-white' : 'border-transparent text-glass-text-secondary hover:text-white'}`}
                    >
                        Details & Checklist
                    </button>
                    <button 
                        onClick={() => setActiveTab('guide')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'guide' ? 'border-brand-primary text-white' : 'border-transparent text-glass-text-secondary hover:text-white'}`}
                    >
                        Architect's Guide
                        {task.implementationGuide && <span className="w-1.5 h-1.5 rounded-full bg-tech-cyan"></span>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('code')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'code' ? 'border-brand-primary text-white' : 'border-transparent text-glass-text-secondary hover:text-white'}`}
                    >
                        Code Forge
                        {task.codeSnippet && <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>}
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-6 bg-brand-panel">
                    
                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div>
                                    <h3 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider mb-2">Description</h3>
                                    <p className="text-sm text-slate-300 leading-relaxed bg-brand-dark/50 p-4 rounded-lg border border-glass-border">
                                        {task.description || "No additional description provided."}
                                    </p>
                                </div>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-xs font-bold text-glass-text uppercase tracking-wider">Sub-Tasks</h3>
                                        {!task.checklist && !isReadOnly && (
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
                                                <label key={item.id} className="flex items-start gap-3 p-3 bg-brand-dark/30 border border-glass-border rounded hover:bg-white/5 cursor-pointer transition-colors group">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={item.completed}
                                                        onChange={() => !isReadOnly && onToggleChecklist(item.id)}
                                                        disabled={isReadOnly}
                                                        className="mt-0.5 rounded border-glass-border bg-brand-dark text-brand-primary focus:ring-0"
                                                    />
                                                    <span className={`text-sm leading-snug ${item.completed ? 'text-glass-text-secondary line-through' : 'text-gray-300'}`}>
                                                        {item.text}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 border border-dashed border-glass-border rounded bg-brand-dark/20">
                                            <span className="text-xs text-glass-text-secondary">No sub-tasks defined.</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-brand-dark/50 p-6 rounded-lg border border-glass-border h-fit">
                                <h4 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider mb-4 border-b border-glass-border pb-2">Meta Data</h4>
                                <div className="space-y-4">
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
                            </div>
                        </div>
                    )}

                    {activeTab === 'guide' && (
                        <div>
                             {task.implementationGuide ? (
                                 <div className="animate-fade-in max-w-3xl mx-auto">
                                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-glass-border">
                                        <span className="text-2xl">⚡</span>
                                        <div>
                                            <h3 className="font-bold text-white">Implementation Strategy</h3>
                                            <p className="text-xs text-glass-text-secondary">AI-generated architectural guidance</p>
                                        </div>
                                    </div>
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <MarkdownRenderer content={task.implementationGuide} />
                                    </div>
                                 </div>
                            ) : (
                                <div className="h-[400px] flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                        <span className="text-3xl">🪄</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">Generate Solution</h3>
                                    <p className="text-sm text-glass-text-secondary max-w-sm mb-6">
                                        Ask the Architect Agent to generate a step-by-step implementation guide for this specific task.
                                    </p>
                                    <button
                                        onClick={onGenerate}
                                        disabled={isGenerating || isReadOnly}
                                        className="px-6 py-2 bg-brand-primary text-white text-sm font-bold rounded-md hover:bg-brand-secondary transition-colors shadow-glow disabled:opacity-50"
                                    >
                                        {isGenerating ? 'Architecting...' : isReadOnly ? 'View Only' : 'Initialize Guide Agent'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'code' && (
                        <div className="h-full flex flex-col">
                             {task.codeSnippet ? (
                                <div className="flex flex-col h-full animate-fade-in">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="font-bold text-white">{task.codeSnippet.filename}</h3>
                                            <p className="text-xs text-glass-text-secondary">{task.codeSnippet.description}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {!isReadOnly && (
                                                <button 
                                                    onClick={onGenerateCode}
                                                    disabled={isGeneratingCode}
                                                    className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-white transition-colors"
                                                >
                                                    {isGeneratingCode ? 'Regenerating...' : 'Regenerate'}
                                                </button>
                                            )}
                                            <button 
                                                onClick={handleCopyCode}
                                                className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-white transition-colors font-bold"
                                            >
                                                {copiedCode ? 'Copied!' : 'Copy Code'}
                                            </button>
                                            {onCommitFile && !isReadOnly && (
                                                <button
                                                    onClick={() => onCommitFile(task.id)}
                                                    className="text-xs bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded text-white transition-colors font-bold flex items-center gap-1 shadow-lg"
                                                    title="Save this code to your project file structure"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                                    Commit to Codebase
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-grow bg-[#0f172a] rounded-lg border border-glass-border overflow-hidden relative mb-4">
                                        <div className="absolute top-0 right-0 px-2 py-1 bg-black/50 text-[10px] text-glass-text-secondary font-mono rounded-bl-lg z-10">
                                            {task.codeSnippet.language}
                                        </div>
                                        <CodeEditor 
                                            value={task.codeSnippet.code}
                                            readOnly={true}
                                            language={task.codeSnippet.language}
                                        />
                                    </div>
                                    
                                    {!isReadOnly && (
                                        <div className="mt-auto">
                                            <form onSubmit={handleRefineCodeSubmit} className="relative flex gap-2">
                                                <input 
                                                    type="text"
                                                    value={refineCodeInput}
                                                    onChange={(e) => setRefineCodeInput(e.target.value)}
                                                    placeholder="Ask to refactor or change the code... (e.g. 'Use async/await', 'Add comments')"
                                                    className="flex-grow glass-input rounded-lg px-4 py-3 text-sm focus:ring-brand-primary focus:border-brand-primary"
                                                />
                                                <button 
                                                    type="submit"
                                                    disabled={!refineCodeInput.trim() || isRefiningCode}
                                                    className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 rounded-lg disabled:opacity-50 transition-colors"
                                                >
                                                    {isRefiningCode ? 'Refining...' : 'Refine'}
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                             ) : (
                                <div className="h-[400px] flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-brand-accent/20">
                                        <span className="text-3xl">🔥</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">The Code Forge</h3>
                                    <p className="text-sm text-glass-text-secondary max-w-sm mb-6">
                                        Generate production-ready code for this task using your project's stack, design system, and file structure context.
                                    </p>
                                    <button
                                        onClick={onGenerateCode}
                                        disabled={isGeneratingCode || isReadOnly}
                                        className="px-6 py-2 bg-gradient-to-r from-brand-secondary to-brand-accent text-white text-sm font-bold rounded-md hover:scale-105 transition-all shadow-glow flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isGeneratingCode ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Forging Code...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                                <span>{isReadOnly ? 'View Only' : 'Generate Code Artifact'}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                             )}
                        </div>
                    )}
                </div>

                <div className="bg-brand-dark p-4 border-t border-glass-border flex justify-between items-center">
                    {!isReadOnly && (
                        <button 
                            onClick={() => { if(window.confirm('Delete task?')) { onDelete(task.id); onClose(); } }}
                            className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Delete Task
                        </button>
                    )}
                    <div className={isReadOnly ? 'w-full flex justify-end' : ''}>
                        <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/15 text-white font-bold rounded-md text-sm transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, projectData, onUpdateTasks, onGenerateGuide, onGenerateChecklist, onGenerateCode, onRefineCode, onCommitFile, onContinue }) => {
  const { currentRole } = useProject();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [addingTaskStatus, setAddingTaskStatus] = useState<TaskStatus | null>(null);

  const isReadOnly = currentRole === 'Viewer';

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.setData('taskId', task.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
    if (isReadOnly) return;
    const taskId = e.dataTransfer.getData('taskId');
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    onUpdateTasks(updatedTasks);
  }, [tasks, onUpdateTasks, isReadOnly]);

  const handleGenerate = async () => {
      if (!activeTask || isReadOnly) return;
      setIsGenerating(true);
      await onGenerateGuide(activeTask.id);
      setIsGenerating(false);
  };

  const handleGenChecklist = async () => {
    if (!activeTask || !onGenerateChecklist || isReadOnly) return;
    setIsGeneratingChecklist(true);
    await onGenerateChecklist(activeTask.id);
    setIsGeneratingChecklist(false);
  };

  const handleGenCode = async () => {
    if (!activeTask || !onGenerateCode || isReadOnly) return;
    setIsGeneratingCode(true);
    await onGenerateCode(activeTask.id);
    setIsGeneratingCode(false);
  };

  const handleToggleItem = (itemId: string) => {
    if (!activeTask || isReadOnly) return;
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

  const handleDeleteTask = (id: string) => {
    if (isReadOnly) return;
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
            onGenerateCode={handleGenCode}
            onRefineCode={onRefineCode}
            onCommitFile={onCommitFile}
            onToggleChecklist={handleToggleItem}
            isGenerating={isGenerating}
            isGeneratingChecklist={isGeneratingChecklist}
            isGeneratingCode={isGeneratingCode}
            isReadOnly={isReadOnly}
          />
      )}

      {addingTaskStatus && (
          <NewTaskModal 
            status={addingTaskStatus} 
            onClose={() => setAddingTaskStatus(null)} 
            onSubmit={handleAddTaskSubmit}
          />
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                Active Agents Board
                {isReadOnly && <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 font-normal">Viewer Mode</span>}
            </h2>
            <p className="text-glass-text-secondary text-sm">Manage and execute architectural directives.</p>
        </div>
        <button 
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-brand-surface hover:bg-brand-surface/80 text-white text-xs font-bold rounded border border-glass-border flex items-center gap-2 transition-all"
        >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10V6m0 0L9 9m3-3l3 3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export CSV
        </button>
      </div>

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
            onAddTask={() => setAddingTaskStatus(status)}
            isReadOnly={isReadOnly}
          />
        ))}
      </div>
      
      {!isReadOnly && (
        <div className="text-center mt-8 mb-4">
            <button
            onClick={onContinue}
            className="px-10 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded shadow-lg transition-all text-sm"
            >
            Finalize & Deploy Documentation
            </button>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
