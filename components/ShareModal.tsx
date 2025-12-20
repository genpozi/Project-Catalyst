
import React, { useState } from 'react';
import { Collaborator } from '../types';
import { useProject } from '../ProjectContext';

interface ShareModalProps {
  collaborators: Collaborator[];
  onClose: () => void;
  onInvite: (email: string, role: 'Editor' | 'Viewer') => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ collaborators, onClose, onInvite }) => {
  const { state, dispatch } = useProject();
  const [activeTab, setActiveTab] = useState<'team' | 'publish'>('team');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Editor' | 'Viewer'>('Editor');
  
  // Publish State
  const [authorName, setAuthorName] = useState('Anonymous Architect');
  const [tags, setTags] = useState('');
  const [isPublished, setIsPublished] = useState(state.projectData.isPublished || false);

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(email) {
        onInvite(email, role);
        setEmail('');
    }
  };

  const handlePublish = () => {
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
      dispatch({ 
          type: 'PUBLISH_PROJECT', 
          payload: { 
              author: authorName, 
              tags: tagList.length > 0 ? tagList : ['Community'] 
          } 
      });
      setIsPublished(true);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl border border-glass-border overflow-hidden animate-slide-in-up flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-glass-border flex justify-between items-center bg-slate-900/50">
            <h3 className="text-lg font-bold text-white">Share & Publish</h3>
            <button onClick={onClose} className="text-glass-text-secondary hover:text-white">✕</button>
        </div>

        {/* Tab Nav */}
        <div className="flex border-b border-glass-border">
            <button 
                onClick={() => setActiveTab('team')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'team' ? 'bg-brand-primary/10 text-brand-primary border-b-2 border-brand-primary' : 'text-glass-text-secondary hover:bg-white/5'}`}
            >
                Team Access
            </button>
            <button 
                onClick={() => setActiveTab('publish')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'publish' ? 'bg-brand-primary/10 text-brand-primary border-b-2 border-brand-primary' : 'text-glass-text-secondary hover:bg-white/5'}`}
            >
                Marketplace
            </button>
        </div>

        <div className="p-6 space-y-6 flex-grow">
            {activeTab === 'team' && (
                <>
                    {/* Invite Form */}
                    <div>
                        <label className="text-xs font-bold text-glass-text-secondary uppercase mb-2 block">Invite by Email</label>
                        <form onSubmit={handleInviteSubmit} className="flex gap-2">
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="colleague@example.com"
                                className="flex-grow glass-input rounded-lg px-3 py-2 text-sm"
                                required
                            />
                            <select 
                                value={role}
                                onChange={(e) => setRole(e.target.value as any)}
                                className="glass-input rounded-lg px-3 py-2 text-sm bg-slate-800"
                            >
                                <option>Editor</option>
                                <option>Viewer</option>
                            </select>
                            <button type="submit" className="bg-brand-primary hover:bg-brand-secondary text-white px-4 py-2 rounded-lg text-sm font-bold transition-all">
                                Invite
                            </button>
                        </form>
                    </div>

                    {/* List */}
                    <div>
                        <label className="text-xs font-bold text-glass-text-secondary uppercase mb-3 block">Team Members</label>
                        <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                            {collaborators.map(c => (
                                <div key={c.id} className="flex items-center justify-between bg-slate-800/30 p-2 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm shadow-inner text-white">
                                            {c.avatar}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white flex items-center gap-2">
                                                {c.name}
                                                {c.id === 'me' && <span className="text-[9px] bg-white/10 px-1.5 rounded text-glass-text-secondary font-normal">You</span>}
                                            </div>
                                            <div className="text-xs text-glass-text-secondary">{c.email}</div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                                        {c.role}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'publish' && (
                <div className="text-center">
                    {isPublished ? (
                        <div className="py-8 animate-fade-in">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/50">
                                <span className="text-3xl">🌍</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Blueprint Published!</h3>
                            <p className="text-glass-text-secondary text-sm mb-6">
                                Your architecture is now available in the Community Marketplace. Other users can fork and build upon your work.
                            </p>
                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                                <span className="text-xs text-slate-400 truncate max-w-[200px]">0relai.com/blueprint/{state.projectData.id}</span>
                                <button className="text-brand-secondary text-xs font-bold hover:text-white">Copy Link</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 text-left">
                            <div className="bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-xl mb-6">
                                <h4 className="text-sm font-bold text-brand-accent mb-1 flex items-center gap-2">
                                    <span>🚀</span> Share with the Community
                                </h4>
                                <p className="text-xs text-blue-200">
                                    Publishing creates a public snapshot of your current blueprint. Sensitive data (chat history, comments) will be excluded.
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Author Name</label>
                                <input 
                                    value={authorName}
                                    onChange={(e) => setAuthorName(e.target.value)}
                                    className="w-full glass-input px-3 py-2 rounded-lg text-sm"
                                    placeholder="Your Name or Alias"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Tags (comma separated)</label>
                                <input 
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    className="w-full glass-input px-3 py-2 rounded-lg text-sm"
                                    placeholder="e.g. SaaS, Fintech, React, Serverless"
                                />
                            </div>

                            <button 
                                onClick={handlePublish}
                                className="w-full py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <span>Publish to Marketplace</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
        
        {activeTab === 'team' && (
            <div className="p-4 bg-slate-900 border-t border-glass-border flex justify-between items-center">
                <div className="text-xs text-glass-text-secondary flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Link Active
                </div>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }} className="text-xs text-brand-secondary hover:text-white font-bold flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    Copy Link
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
