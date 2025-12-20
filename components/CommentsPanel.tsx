
import React, { useState } from 'react';
import { Comment, Collaborator } from '../types';

interface CommentsPanelProps {
  section: string;
  comments: Comment[];
  currentUser: Collaborator;
  onAddComment: (text: string, section: string) => void;
  onResolveComment: (id: string) => void;
  onClose: () => void;
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({ section, comments, currentUser, onAddComment, onResolveComment, onClose }) => {
  const [input, setInput] = useState('');

  const filteredComments = comments.filter(c => c.section === section);
  const activeComments = filteredComments.filter(c => !c.resolved);
  const resolvedComments = filteredComments.filter(c => c.resolved);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(input.trim()) {
        onAddComment(input, section);
        setInput('');
    }
  };

  return (
    <div className="w-80 bg-[#0f172a] border-l border-glass-border flex flex-col h-full flex-shrink-0 shadow-2xl animate-fade-in z-20">
      <div className="p-4 border-b border-glass-border flex justify-between items-center bg-slate-900/50">
        <h3 className="font-bold text-white text-sm">Comments ({activeComments.length})</h3>
        <button onClick={onClose} className="text-glass-text-secondary hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-4">
        {activeComments.length === 0 && resolvedComments.length === 0 && (
            <div className="text-center text-glass-text-secondary text-xs py-8">
                No comments on this section yet.
            </div>
        )}

        {activeComments.map(comment => (
            <div key={comment.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-brand-primary/30 transition-all group">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">
                            {comment.avatar || comment.author.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-white">{comment.author}</span>
                    </div>
                    <span className="text-[10px] text-glass-text-secondary">
                        {new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-2">{comment.text}</p>
                <button 
                    onClick={() => onResolveComment(comment.id)}
                    className="text-[10px] text-green-400 hover:text-green-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Resolve
                </button>
            </div>
        ))}

        {resolvedComments.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-800">
                <h4 className="text-[10px] font-bold text-glass-text-secondary uppercase tracking-wider mb-3">Resolved</h4>
                <div className="space-y-3 opacity-50">
                    {resolvedComments.map(comment => (
                        <div key={comment.id} className="bg-slate-900/50 p-2 rounded border border-transparent">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500">{comment.author}</span>
                                <button onClick={() => onResolveComment(comment.id)} className="text-[10px] text-slate-500 hover:text-white">Unresolve</button>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 line-through">{comment.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      <div className="p-4 bg-slate-900 border-t border-glass-border">
        <form onSubmit={handleSubmit} className="relative">
            <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Add a comment..."
                className="w-full glass-input rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-1 focus:ring-brand-primary"
            />
            <button 
                type="submit"
                disabled={!input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
        </form>
      </div>
    </div>
  );
};

export default CommentsPanel;
