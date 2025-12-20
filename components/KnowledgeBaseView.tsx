
import React, { useState, useEffect, useRef } from 'react';
import { ProjectData, KnowledgeDoc } from '../types';
import { useProject } from '../ProjectContext';

interface KnowledgeBaseViewProps {
  projectData: ProjectData;
  onContinue: () => void;
}

const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ projectData, onContinue }) => {
  const { state, dispatch } = useProject();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'text' | 'code' | 'policy'>('text');
  const [tags, setTags] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const docRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newDoc: KnowledgeDoc = {
        id: Date.now().toString(),
        title,
        content,
        type,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        addedAt: Date.now()
    };

    dispatch({ type: 'ADD_KNOWLEDGE_DOC', payload: newDoc });
    setTitle('');
    setContent('');
    setTags('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm("Remove this document from the AI's context?")) {
          dispatch({ type: 'DELETE_KNOWLEDGE_DOC', payload: id });
      }
  };

  const handleSelectDoc = (id: string) => {
      if (state.ui.selectedDocId !== id) {
          dispatch({ type: 'SET_SELECTED_DOC', payload: id });
      }
  };

  // Scroll to selected doc
  useEffect(() => {
      if (state.ui.selectedDocId) {
          const el = docRefs.current[state.ui.selectedDocId];
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Flash effect handled by CSS classes based on state
          }
      }
  }, [state.ui.selectedDocId]);

  return (
    <div className="animate-slide-in-up">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2">Memory Palace (Context Injection)</h2>
        <p className="text-blue-200 max-w-2xl mx-auto">
            Upload your company standards, legacy API docs, or preferred coding patterns. 
            The Architect will reference these "Memories" when generating your blueprint.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Add Form */}
        <div className="lg:col-span-1">
            <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5 sticky top-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span>🧠</span> Add Knowledge
                </h3>
                
                <form onSubmit={handleAddDoc} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Title</label>
                        <input 
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full glass-input rounded-lg px-3 py-2 text-sm"
                            placeholder="e.g. 'Auth Guidelines'"
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Type</label>
                        <div className="flex bg-black/20 p-1 rounded-lg">
                            {(['text', 'code', 'policy'] as const).map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded capitalize transition-all ${type === t ? 'bg-brand-primary text-white shadow' : 'text-glass-text-secondary hover:text-white'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Content / Snippet</label>
                        <textarea 
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="w-full glass-input rounded-lg px-3 py-2 text-sm min-h-[150px] font-mono"
                            placeholder="Paste text, JSON schemas, or policy rules here..."
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Tags (comma separated)</label>
                        <input 
                            value={tags}
                            onChange={e => setTags(e.target.value)}
                            className="w-full glass-input rounded-lg px-3 py-2 text-sm"
                            placeholder="e.g. security, frontend, legacy"
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={!title || !content}
                        className="w-full py-2 bg-brand-secondary hover:bg-brand-primary text-white font-bold rounded-lg transition-all disabled:opacity-50"
                    >
                        Save to Memory
                    </button>
                </form>
            </div>
        </div>

        {/* Right: Library */}
        <div className="lg:col-span-2">
            <h3 className="text-lg font-bold text-white mb-4">Active Context ({projectData.knowledgeBase?.length || 0})</h3>
            
            {!projectData.knowledgeBase || projectData.knowledgeBase.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <span className="text-4xl block mb-3 opacity-50">📚</span>
                    <p className="text-glass-text-secondary text-sm">No documents added yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectData.knowledgeBase.map(doc => (
                        <div 
                            key={doc.id} 
                            ref={el => { docRefs.current[doc.id] = el; }}
                            onClick={() => handleSelectDoc(doc.id)}
                            className={`bg-brand-panel border p-4 rounded-xl group transition-all flex flex-col cursor-pointer ${
                                state.ui.selectedDocId === doc.id 
                                ? 'border-brand-accent/80 ring-2 ring-brand-accent/20' 
                                : 'border-glass-border hover:border-brand-accent/50'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                        {doc.type === 'code' ? '💻' : doc.type === 'policy' ? '🛡️' : '📄'}
                                    </span>
                                    <h4 className="font-bold text-white text-sm">{doc.title}</h4>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                                    className="text-glass-text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                            
                            <div className="flex-grow bg-black/30 rounded p-2 mb-3 overflow-hidden relative">
                                <p className="text-xs text-slate-400 font-mono line-clamp-4 whitespace-pre-wrap">
                                    {doc.content}
                                </p>
                                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/30 to-transparent"></div>
                            </div>

                            <div className="flex flex-wrap gap-1 mt-auto">
                                {doc.tags.map(tag => (
                                    <span key={tag} className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-glass-text-secondary border border-white/5">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      <div className="text-center mt-10">
        <button
          onClick={onContinue}
          className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105 flex items-center gap-2 mx-auto"
        >
          <span>Continue with Context</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </div>
    </div>
  );
};

export default KnowledgeBaseView;
