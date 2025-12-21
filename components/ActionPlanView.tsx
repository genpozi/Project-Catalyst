
import React, { useState, useEffect } from 'react';
import { Phase, PlanTask } from '../types';
import RefineBar from './RefineBar';
import VisualGantt from './VisualGantt';

interface ActionPlanViewProps {
  plan: Phase[];
  onContinue: (finalPlan: Phase[]) => void;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
}

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const getPriorityColor = (p: string) => {
  switch (p?.toLowerCase()) {
    case 'high': return 'bg-red-900/50 text-red-200 border-red-700';
    case 'medium': return 'bg-yellow-900/50 text-yellow-200 border-yellow-700';
    case 'low': return 'bg-green-900/50 text-green-200 border-green-700';
    default: return 'bg-slate-700 text-slate-300 border-slate-600';
  }
};

const ActionPlanView: React.FC<ActionPlanViewProps> = ({ plan, onContinue, onRefine, isRefining = false }) => {
  const [editedPlan, setEditedPlan] = useState<Phase[]>(plan);
  const [activeTab, setActiveTab] = useState<'list' | 'timeline'>('list');

  // Sync state if prop changes (e.g. after AI refinement)
  useEffect(() => {
    setEditedPlan(JSON.parse(JSON.stringify(plan)));
  }, [plan]);

  const handleTaskChange = (phaseIndex: number, taskIndex: number, field: keyof PlanTask, value: string) => {
    const newPlan = [...editedPlan];
    if (field === 'priority') {
         newPlan[phaseIndex].tasks[taskIndex].priority = value as any;
    } else {
         (newPlan[phaseIndex].tasks[taskIndex] as any)[field] = value;
    }
    setEditedPlan(newPlan);
  };

  const handleVisualTaskUpdate = (phaseIndex: number, taskIndex: number, updates: Partial<PlanTask>) => {
      const newPlan = [...editedPlan];
      const task = newPlan[phaseIndex].tasks[taskIndex];
      newPlan[phaseIndex].tasks[taskIndex] = { ...task, ...updates };
      setEditedPlan(newPlan);
  };

  const handleAddTask = (phaseIndex: number) => {
    const newPlan = [...editedPlan];
    const newTask: PlanTask = {
        description: 'New task...',
        estimatedDuration: '1 day',
        priority: 'Medium',
        role: 'Developer'
    };
    newPlan[phaseIndex].tasks.push(newTask);
    setEditedPlan(newPlan);
  };

  const handleDeleteTask = (phaseIndex: number, taskIndex: number) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      const newPlan = [...editedPlan];
      newPlan[phaseIndex].tasks.splice(taskIndex, 1);
      setEditedPlan(newPlan);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col h-full overflow-hidden">
      
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Implementation Plan</h2>
                <p className="text-xs text-glass-text-secondary">Phased roadmap and task breakdown.</p>
            </div>
            
            <div className="bg-black/20 p-1 rounded-lg flex border border-white/5">
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all ${activeTab === 'list' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                    📋 List
                </button>
                <button 
                    onClick={() => setActiveTab('timeline')}
                    className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all ${activeTab === 'timeline' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                    📅 Gantt
                </button>
            </div>
          </div>

          {onRefine && (
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Add a dedicated QA phase', 'Condense timeline to 4 weeks'" 
                className="mb-2"
            />
          )}
      </div>

      {/* Main Content */}
      <div className="flex-grow min-h-0 bg-[#0b0e14] rounded-xl border border-white/5 relative overflow-hidden flex flex-col">
        {activeTab === 'timeline' ? (
            <div className="h-full w-full relative">
                <VisualGantt plan={editedPlan} onUpdateTask={handleVisualTaskUpdate} />
                <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                    <span className="text-[10px] text-glass-text-secondary bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-white/5">
                        Click on bars to edit details. Drag interactions coming soon.
                    </span>
                </div>
            </div>
        ) : (
            <div className="h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
                {editedPlan.map((phase, phaseIndex) => (
                <div key={phaseIndex} className="bg-slate-900/30 rounded-xl border border-white/5 overflow-hidden">
                    <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-brand-accent uppercase tracking-wider">
                            Phase {phaseIndex + 1}: {phase.phase_name}
                        </h3>
                        <span className="text-[10px] bg-black/20 text-glass-text-secondary px-2 py-0.5 rounded border border-white/5">
                            {phase.tasks.length} Tasks
                        </span>
                    </div>
                    
                    <div className="p-2 space-y-1">
                        {phase.tasks.map((task, taskIndex) => (
                            <div key={taskIndex} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-800/20 p-2 rounded hover:bg-slate-800/40 transition-colors border border-transparent hover:border-white/5 group">
                                <div className="flex items-center gap-2 flex-shrink-0 min-w-[130px]">
                                    <select
                                        value={task.priority}
                                        onChange={(e) => handleTaskChange(phaseIndex, taskIndex, 'priority', e.target.value)}
                                        className={`appearance-none px-2 py-0.5 text-[9px] font-bold uppercase rounded border cursor-pointer focus:outline-none ${getPriorityColor(task.priority)}`}
                                    >
                                        <option value="High" className="bg-slate-900">High</option>
                                        <option value="Medium" className="bg-slate-900">Medium</option>
                                        <option value="Low" className="bg-slate-900">Low</option>
                                    </select>

                                    <input
                                        type="text"
                                        value={task.role}
                                        onChange={(e) => handleTaskChange(phaseIndex, taskIndex, 'role', e.target.value)}
                                        className="w-20 text-[10px] text-slate-400 bg-transparent border-b border-transparent focus:border-brand-primary outline-none text-center"
                                        placeholder="Role"
                                    />
                                </div>
                                
                                <div className="flex-grow">
                                    <input
                                        type="text"
                                        value={task.description}
                                        onChange={(e) => handleTaskChange(phaseIndex, taskIndex, 'description', e.target.value)}
                                        className="w-full text-xs text-white bg-transparent border-b border-transparent focus:border-brand-secondary outline-none px-1"
                                        placeholder="Task description"
                                    />
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-black/20 px-2 py-0.5 rounded">
                                        <span>⏱</span>
                                        <input
                                            type="text"
                                            value={task.estimatedDuration}
                                            onChange={(e) => handleTaskChange(phaseIndex, taskIndex, 'estimatedDuration', e.target.value)}
                                            className="w-10 bg-transparent text-center focus:outline-none text-slate-300"
                                            placeholder="1d"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleDeleteTask(phaseIndex, taskIndex)}
                                        className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => handleAddTask(phaseIndex)}
                            className="w-full py-1.5 mt-1 text-[10px] font-bold text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors border border-dashed border-slate-700 hover:border-slate-500"
                        >
                            + Add Task
                        </button>
                    </div>
                </div>
                ))}
            </div>
        )}
      </div>

      <div className="flex-shrink-0 pt-4 flex justify-end">
        <button
          onClick={() => onContinue(editedPlan)}
          className="px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-lg shadow-lg transition-all flex items-center gap-2"
        >
          <span>Initialize Workspace</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </button>
      </div>
    </div>
  );
};

export default ActionPlanView;
