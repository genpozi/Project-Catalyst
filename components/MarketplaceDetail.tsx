
import React, { useState } from 'react';
import { ProjectData } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface MarketplaceDetailProps {
  project: ProjectData;
  onFork: () => void;
  onLike: (id: string) => void;
  onClose: () => void;
}

const MarketplaceDetail: React.FC<MarketplaceDetailProps> = ({ project, onFork, onLike, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stack' | 'preview'>('overview');

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0f172a] border border-glass-border w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Hero Header */}
        <div className="relative h-48 bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 border-b border-glass-border p-8 flex flex-col justify-end">
            <div className="absolute top-4 right-4 flex gap-2">
                <button 
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-black/20 hover:bg-white/10 text-white flex items-center justify-center transition-colors backdrop-blur-md"
                >
                    ✕
                </button>
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/10">
                        {project.projectType || 'Blueprint'}
                    </span>
                    <button 
                        onClick={() => onLike(project.id)}
                        className="flex items-center gap-1 text-xs text-white bg-pink-500/20 hover:bg-pink-500/40 px-2 py-0.5 rounded border border-pink-500/30 transition-colors"
                    >
                        <span>♥</span> <span className="font-bold">{project.likes || 0}</span>
                    </button>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">{project.name}</h2>
                <div className="flex items-center gap-2 text-sm text-blue-200">
                    <span>by {project.author || 'Anonymous Architect'}</span>
                    <span>•</span>
                    <span>Updated {new Date(project.lastUpdated).toLocaleDateString()}</span>
                </div>
            </div>

            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        </div>

        {/* Navigation */}
        <div className="flex border-b border-glass-border bg-slate-900/50 px-6">
            {['overview', 'stack', 'preview'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors capitalize ${
                        activeTab === tab ? 'border-brand-primary text-white' : 'border-transparent text-glass-text-secondary hover:text-white'
                    }`}
                >
                    {tab}
                </button>
            ))}
            <div className="flex-grow"></div>
            <div className="flex items-center py-2">
                <button 
                    onClick={onFork}
                    className="bg-white text-brand-dark hover:bg-blue-50 px-6 py-2 rounded-xl font-bold shadow-lg shadow-white/5 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 011.414.293l4.414 4.414a1 1 0 01.293 1.414V19a2 2 0 01-2 2h-1M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                    Fork Blueprint
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto custom-scrollbar p-8 bg-[#0b0e14]">
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <section>
                            <h3 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider mb-3">Core Vision</h3>
                            <div className="text-lg text-slate-300 leading-relaxed font-light">
                                {project.initialIdea}
                            </div>
                        </section>

                        {project.brainstormingResults && (
                            <section className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
                                <h3 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider mb-4">Key Features</h3>
                                <div className="flex flex-wrap gap-2">
                                    {project.brainstormingResults.features.map((f, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-lg text-sm font-medium">
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}
                        
                        {project.actionPlan && (
                            <section>
                                <h3 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider mb-3">Development Roadmap</h3>
                                <div className="space-y-3">
                                    {project.actionPlan.map((phase, i) => (
                                        <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/5">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-xs border border-slate-700">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{phase.phase_name}</h4>
                                                <span className="text-xs text-glass-text-secondary">{phase.tasks.length} tasks defined</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-900 p-5 rounded-2xl border border-glass-border">
                            <h3 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider mb-4">Target Audience</h3>
                            <div className="space-y-4">
                                {project.brainstormingResults?.personas.slice(0, 3).map((p, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded bg-gradient-to-br from-brand-secondary to-brand-accent flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                            {p.role.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-sm">{p.role}</div>
                                            <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900 p-5 rounded-2xl border border-glass-border">
                            <h3 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider mb-4">Compliance</h3>
                            <div className="space-y-2">
                                {project.securityContext?.complianceChecklist.slice(0, 4).map((c, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-300">{c.requirement.substring(0, 30)}...</span>
                                        <span className={`px-1.5 py-0.5 rounded uppercase font-bold text-[9px] ${c.status === 'Met' ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'stack' && project.architecture && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white">Technology Stack</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                <span className="text-xs uppercase text-slate-500 font-bold block mb-1">Frontend</span>
                                <span className="text-brand-accent font-mono font-bold">{project.architecture.stack.frontend}</span>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                <span className="text-xs uppercase text-slate-500 font-bold block mb-1">Backend</span>
                                <span className="text-brand-accent font-mono font-bold">{project.architecture.stack.backend}</span>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                <span className="text-xs uppercase text-slate-500 font-bold block mb-1">Database</span>
                                <span className="text-brand-accent font-mono font-bold">{project.architecture.stack.database}</span>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                <span className="text-xs uppercase text-slate-500 font-bold block mb-1">Infrastructure</span>
                                <span className="text-brand-accent font-mono font-bold">{project.architecture.stack.deployment}</span>
                            </div>
                        </div>
                        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 mt-6">
                            <h4 className="text-sm font-bold text-white mb-2">Architectural Rationale</h4>
                            <p className="text-sm text-slate-300 italic">"{project.architecture.stack.rationale}"</p>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">Data Model</h3>
                        {project.schema?.mermaidChart ? (
                            <div className="bg-white rounded-xl p-4 overflow-hidden h-[400px] relative">
                                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                    <span className="text-xs">Diagram Preview</span>
                                </div>
                                {/* Simple text representation if mermaid doesn't render in modal easily */}
                                <pre className="text-[10px] text-slate-800 font-mono overflow-auto h-full relative z-10">
                                    {project.schema.mermaidChart}
                                </pre>
                            </div>
                        ) : (
                            <div className="h-64 bg-slate-900 rounded-xl flex items-center justify-center text-slate-600 italic">
                                No schema defined.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'preview' && (
                <div className="h-full min-h-[500px] bg-white rounded-2xl overflow-hidden border border-white/10 relative">
                    {project.designSystem?.wireframeCode ? (
                        <iframe 
                            srcDoc={project.designSystem.wireframeCode}
                            className="w-full h-full border-0"
                            title="Blueprint Preview"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                            <span className="text-4xl mb-4">🖼️</span>
                            <p>No wireframe preview available for this blueprint.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceDetail;
