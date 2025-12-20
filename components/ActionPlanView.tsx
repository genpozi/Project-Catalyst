
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
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
         // Cast to the specific union type
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
    <div className="animate-slide-in-up flex flex-col h-full">
      {!isRefining && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2 text-center">Project Action Plan</h2>
            <p className="text-center text-blue-200 mb-6">Review and refine the AI-generated roadmap.</p>
          </>
      )}
      
      {onRefine && (
        <div className="max-w-3xl mx-auto mb-6 w-full">
            <RefineBar 
                onRefine={onRefine} 
                isRefining={isRefining} 
                placeholder="e.g. 'Add a dedicated QA phase', 'Condense timeline to 4 weeks'" 
            />
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-800 p-1 rounded-lg inline-flex">
            <button 
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'list' ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
            >
                📋 List Editor
            </button>
            <button 
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'timeline' ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
            >
                📅 Interactive Timeline
            </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar">
      {activeTab === 'timeline' ? (
          <div>
              <VisualGantt plan={editedPlan} onUpdateTask={handleVisualTaskUpdate} />
              <p className="text-center text-[10px] text-glass-text-secondary mt-2 opacity-70">
                  Click on any bar to edit task details. Changes update the plan immediately.
              </p>
          </div>
      ) : (
          <div className="space-y-6 pb-8">
            {editedPlan.map((phase, phaseIndex) => (
              <div key={phaseIndex} className="bg-slate-800/50 p-4 rounded-lg ring-1 ring-slate-700">
                <h3 className="text-xl font-semibold text-brand-accent mb-4 border-b border-slate-700 pb-2">
                  Phase {phaseIndex + 1}: {phase.phase_name}
                </h3>
                <div className="space-y-3">
                  {phase.tasks.map((task, taskIndex) => (
                    <div key={taskIndex} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-700/30 p-3 rounded-md border border-slate-700/50">
                      <div className="flex items-center gap-2 flex-shrink-0 min-w-[140px]">
                          {/* Priority Select */}
                          <div className="relative">
                            <select
                                value={task.priority}
                                onChange={(e) => handleTaskChange(phaseIndex, taskIndex, 'priority', e.target.value)}
                                className={`appearance-none px-2 py-0.5 text-xs font-bold rounded border cursor-pointer focus:outline-none focus:ring-1 focus:ring-white ${getPriorityColor(task.priority)}`}
                            >
                                <option value="High" className="bg-slate-800 text-red-200">High</option>
                                <option value="Medium" className="bg-slate-800 text-yellow-200">Medium</option>
                                <option value="Low" className="bg-slate-800 text-green-200">Low</option>
                            </select>
                          </div>

                          {/* Role Input */}
                          <input
                            type="text"
                            value={task.role}
                            onChange={(e) => handleTaskChange(phaseIndex, taskIndex, 'role', e.target.value)}
                            className="w-24 text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 focus:border-brand-accent focus:outline-none placeholder-slate-500"
                            placeholder="Role"
                            title="Responsible Role"
                          />
                      </div>
                      
                      <div className="flex-grow">
                          <input
                            type="text"
                            value={task.description}
                            onChange={(e) => handleTaskChange(phaseIndex, taskIndex, 'description', e.target.value)}
                            className="w-full p-1.5 bg-transparent border-b border-transparent hover:border-slate-600 focus:border-brand-secondary text-blue-100 focus:outline-none transition-colors"
                            placeholder="Task description"
                          />
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="flex items-center gap-1 text-xs text-brand-accent">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            {/* Duration Input */}
                            <input
                                type="text"
                                value={task.estimatedDuration}
                                onChange={(e) => handleTaskChange(phaseIndex, taskIndex, 'estimatedDuration', e.target.value)}
                                className="w-16 bg-transparent border-b border-slate-700 focus:border-brand-accent focus:outline-none text-center"
                                placeholder="Duration"
                                title="Estimated Duration"
                            />
                          </div>
                          <button
                            onClick={() => handleDeleteTask(phaseIndex, taskIndex)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-md hover:bg-red-900/20 transition-colors"
                            aria-label="Delete task"
                          >
                            <TrashIcon />
                          </button>
                      </div>
                    </div>
                  ))}
                  <button
                      onClick={() => handleAddTask(phaseIndex)}
                      className="mt-3 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-brand-accent font-semibold rounded-md transition-colors flex items-center gap-2"
                    >
                      <span className="text-lg leading-none">+</span> Add Task
                    </button>
                </div>
              </div>
            ))}
          </div>
      )}
      </div>

      <div className="text-center mt-8 pb-4">
        <button
          onClick={() => onContinue(editedPlan)}
          className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
        >
          Set Up Workspace
        </button>
      </div>
    </div>
  );
};

export default ActionPlanView;
