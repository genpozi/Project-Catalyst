
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
  
  // Selection
  const selectedDoc = projectData.knowledgeBase?.find(d => d.id === state.ui.selectedDocId);

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
  };

  const handleDelete = (id: string) => {
      if(window.confirm("Remove this document?")) {
          dispatch({ type: 'DELETE_KNOWLEDGE_DOC', payload: id });
          if (state.ui.selectedDocId === id) dispatch({ type: 'SET_SELECTED_DOC', payload: undefined });
      }
  };

  const handleSelectDoc = (id: string) => {
      dispatch({ type: 'SET_SELECTED_DOC', payload: id });
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div>
            <h2 className="text-xl font-bold text-white">Knowledge Base</h2>
            <p className="text-xs text-glass-text-secondary">Context injection for the Architect AI.</p>
        </div>
      </div>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        
        {/* Left: Document List */}
        <div className="lg:col-span-1 flex flex-col bg-[#0b0e14] border border-white/5 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Documents</span>
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-glass-text-secondary">{projectData.knowledgeBase?.length || 0}</span>
            </div>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-2">
                {!projectData.knowledgeBase || projectData.knowledgeBase.length === 0 ? (
                    <div className="text-center py-10 opacity-50 text-xs">No documents.</div>
                ) : (
                    projectData.knowledgeBase.map(doc => (
                        <div 
                            key={doc.id}
                            onClick={() => handleSelectDoc(doc.id)}
                            className={`p-3 rounded-lg cursor-pointer border transition-all group ${
                                state.ui.selectedDocId === doc.id 
                                ? 'bg-brand-primary/10 border-brand-primary/50' 
                                : 'bg-white/5 border-transparent hover:bg-white/10'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">
                                        {doc.type === 'code' ? '💻' : doc.type === 'policy' ? '🛡️' : '📄'}
                                    </span>
                                    <span className={`text-sm font-bold truncate ${state.ui.selectedDocId === doc.id ? 'text-brand-secondary' : 'text-slate-300'}`}>
                                        {doc.title}
                                    </span>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {doc.tags.map(tag => (
                                    <span key={tag} className="text-[9px] bg-black/30 text-glass-text-secondary px-1.5 py-0.5 rounded">#{tag}</span>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Right: Content or Add Form */}
        <div className="lg:col-span-2 flex flex-col bg-[#0b0e14] border border-white/5 rounded-xl overflow-hidden">
            {selectedDoc ? (
                <>
                    <div className="p-4 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">{selectedDoc.type === 'code' ? '💻' : selectedDoc.type === 'policy' ? '🛡️' : '📄'}</span>
                            <h3 className="font-bold text-white">{selectedDoc.title}</h3>
                        </div>
                        <button 
                            onClick={() => dispatch({ type: 'SET_SELECTED_DOC', payload: undefined })}
                            className="text-xs bg-brand-primary hover:bg-brand-secondary px-3 py-1.5 rounded text-white transition-colors"
                        >
                            + New Doc
                        </button>
                    </div>
                    <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
                        <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {selectedDoc.content}
                        </pre>
                    </div>
                    <div className="p-2 border-t border-white/5 bg-black/20 text-[10px] text-slate-500 text-right px-4">
                        ID: {selectedDoc.id} • Added: {new Date(selectedDoc.addedAt).toLocaleDateString()}
                    </div>
                </>
            ) : (
                <div className="flex flex-col h-full p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <span>➕</span> Add New Knowledge
                    </h3>
                    <form onSubmit={handleAddDoc} className="space-y-4 flex-grow flex flex-col">
                        <div className="grid grid-cols-2 gap-4">
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
                        </div>

                        <div className="flex-grow flex flex-col">
                            <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Content</label>
                            <textarea 
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full flex-grow glass-input rounded-lg px-3 py-2 text-sm font-mono resize-none"
                                placeholder="Paste content here..."
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Tags</label>
                            <input 
                                value={tags}
                                onChange={e => setTags(e.target.value)}
                                className="w-full glass-input rounded-lg px-3 py-2 text-sm"
                                placeholder="comma, separated, tags"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button 
                                type="submit"
                                disabled={!title || !content}
                                className="px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                                Save Document
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseView;
