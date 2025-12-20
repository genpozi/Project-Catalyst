
import React, { useState, useRef } from 'react';
import { useProject } from '../ProjectContext';
import { ProjectData, AppPhase } from '../types';
import MarketplaceDetail from './MarketplaceDetail';

interface IdeaInputProps {
  onSubmit: (idea: string, type: string, constraints: string, imageBase64?: string) => void;
  onAnalyzeAudio: (audioBase64: string) => Promise<{ idea: string; type: string; constraints: string } | null>;
  isAnalyzingAudio: boolean;
}

const STARTER_TEMPLATES = [
    {
        name: "Micro-SaaS Starter",
        icon: "🚀",
        type: "Web Application",
        category: "SaaS",
        idea: "A subscription-based SaaS platform for niche project management. Includes team collaboration, recurring billing via Stripe, and an admin dashboard.",
        constraints: "Next.js 14, Tailwind CSS, Supabase (Auth/DB), Stripe, Shadcn UI"
    },
    {
        name: "E-Commerce Headless",
        icon: "🛍️",
        type: "Web Application",
        category: "Retail",
        idea: "A modern, high-performance headless e-commerce store. Features include product search, shopping cart, checkout, and order history.",
        constraints: "Remix, Shopify Storefront API (or MedusaJS), Tailwind CSS, Redis for caching"
    },
    {
        name: "AI Content Generator",
        icon: "✨",
        type: "Web Application",
        category: "AI",
        idea: "An application that uses LLMs to generate marketing copy and blog posts. Includes a credit system, rich text editor, and history.",
        constraints: "React, Node.js/Express, OpenAI API, PostgreSQL, Docker"
    },
    {
        name: "Social Hiker App",
        icon: "🏔️",
        type: "Mobile App",
        category: "Social",
        idea: "A mobile social network for hikers to share trails, photos, and organize meetups. Includes geolocation, maps, and real-time chat.",
        constraints: "React Native (Expo), Firebase, Google Maps API"
    }
];

// Mock Activity Data
const ACTIVITIES = [
    { id: 1, user: 'Sarah L.', action: 'published', project: 'Fintech Dashboard', time: '2m ago', avatar: '👩‍💻' },
    { id: 2, user: 'DevBot', action: 'generated', project: 'Docker Config', time: '15m ago', avatar: '🤖' },
    { id: 3, user: 'Mike R.', action: 'forked', project: 'E-Commerce Headless', time: '1h ago', avatar: '👨‍💻' },
    { id: 4, user: 'System', action: 'alert', project: 'Security Audit Failed', time: '3h ago', avatar: '⚠️' },
];

const IdeaInput: React.FC<IdeaInputProps> = ({ onSubmit, onAnalyzeAudio, isAnalyzingAudio }) => {
  const { state, dispatch } = useProject();
  const [activeTab, setActiveTab] = useState<'new' | 'marketplace' | 'saved'>('new');
  const [selectedMarketplaceItem, setSelectedMarketplaceItem] = useState<ProjectData | null>(null);
  
  // Form State
  const [idea, setIdea] = useState('');
  const [projectType, setProjectType] = useState('Web Application');
  const [constraints, setConstraints] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { alert("Could not access microphone."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64String = (reader.result as string).split(',')[1];
          const result = await onAnalyzeAudio(base64String);
          if (result) {
            setIdea(result.idea);
            setProjectType(result.type || 'Web Application');
            setConstraints(result.constraints || '');
          }
        };
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) {
      onSubmit(idea.trim(), projectType, constraints.trim(), imageBase64 ? imageBase64.split(',')[1] : undefined);
    }
  };

  const handleUseTemplate = (t: typeof STARTER_TEMPLATES[0]) => {
      setIdea(t.idea);
      setProjectType(t.type);
      setConstraints(t.constraints);
      setActiveTab('new');
  };

  const handleForkProject = (project: ProjectData) => {
      dispatch({ type: 'IMPORT_FROM_MARKETPLACE', payload: project });
      setSelectedMarketplaceItem(null);
  };

  const handleLoadProject = (id: string) => {
    const fullData = localStorage.getItem(`0relai-proj-${id}`);
    if (fullData) {
      dispatch({ type: 'LOAD_PROJECT', payload: JSON.parse(fullData) });
    }
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm("Are you sure you want to delete this project?")) {
          dispatch({ type: 'DELETE_PROJECT', payload: id });
          localStorage.removeItem(`0relai-proj-${id}`);
      }
  };

  const handleLike = (e: React.MouseEvent | null, id: string) => {
      if(e) e.stopPropagation();
      dispatch({ type: 'LIKE_PROJECT', payload: id });
      
      // Update local state if detail view is open
      if(selectedMarketplaceItem && selectedMarketplaceItem.id === id) {
          setSelectedMarketplaceItem({
              ...selectedMarketplaceItem,
              likes: (selectedMarketplaceItem.likes || 0) + 1
          });
      }
  };

  // Helper to estimate progress for saved projects
  const getProjectProgress = (p: any) => {
      // In a real app we'd store progress meta, but here we can infer or mock it
      // Let's assume the name might contain " (Fork)" etc or just randomize for demo if data missing
      return Math.floor(Math.random() * 80) + 10;
  };

  return (
    <div className="animate-slide-in-up flex gap-8">
      {selectedMarketplaceItem && (
          <MarketplaceDetail 
            project={selectedMarketplaceItem}
            onClose={() => setSelectedMarketplaceItem(null)}
            onFork={() => handleForkProject(selectedMarketplaceItem)}
            onLike={(id) => handleLike(null, id)}
          />
      )}

      <div className="flex-grow">
        <div className="flex flex-col items-center mb-10 text-center">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-brand-secondary mb-4 tracking-tight">
                Architect Your Vision
            </h1>
            <p className="text-glass-text-secondary max-w-xl text-lg">
                From abstract idea to production-ready blueprint in minutes. 
                Powered by Gemini 2.0 Flash Thinking.
            </p>
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex justify-center mb-8">
            <div className="bg-brand-panel p-1 rounded-xl border border-glass-border inline-flex">
                <button 
                    onClick={() => setActiveTab('new')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'new' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                    ✨ New Blueprint
                </button>
                <button 
                    onClick={() => setActiveTab('marketplace')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'marketplace' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                    🏢 Community & Templates
                </button>
                <button 
                    onClick={() => setActiveTab('saved')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'saved' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                    📂 My Projects
                </button>
            </div>
        </div>
        
        {/* --- TAB: NEW BLUEPRINT --- */}
        {activeTab === 'new' && (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
                {/* Row 1: Type & Voice */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-7">
                        <div className="bg-glass-surface rounded-2xl p-1 border border-glass-border flex flex-col h-full">
                            <label className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider px-4 py-2">Project Type</label>
                            <div className="relative flex-grow">
                                <select 
                                    value={projectType}
                                    onChange={(e) => setProjectType(e.target.value)}
                                    className="w-full h-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none focus:bg-white/5 appearance-none text-lg font-medium cursor-pointer"
                                >
                                    <option className="bg-slate-900">Web Application</option>
                                    <option className="bg-slate-900">Mobile App (iOS/Android)</option>
                                    <option className="bg-slate-900">API / Backend Service</option>
                                    <option className="bg-slate-900">CLI Tool</option>
                                    <option className="bg-slate-900">Desktop Application</option>
                                    <option className="bg-slate-900">Game</option>
                                    <option className="bg-slate-900">AI/ML Model</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-glass-text-secondary">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-5">
                        <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isAnalyzingAudio}
                            className={`w-full h-full min-h-[80px] rounded-2xl border border-glass-border flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden group ${
                                isRecording ? 'bg-red-500/10 border-red-500/50' : 'bg-glass-surface hover:bg-white/5'
                            }`}
                        >
                            {isRecording && <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500 text-white' : 'bg-white/10 text-white group-hover:bg-brand-primary group-hover:scale-110 transition-all'}`}>
                                {isAnalyzingAudio ? (
                                    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                                )}
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider z-10 ${isRecording ? 'text-red-200' : 'text-glass-text-secondary'}`}>
                                {isAnalyzingAudio ? 'Processing...' : isRecording ? 'Stop Recording' : 'Voice Input'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Core Idea */}
                <div className="bg-glass-surface rounded-2xl p-1 border border-glass-border shadow-lg">
                    <label className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider px-4 py-2 block">Core Concept</label>
                    <textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="Describe your vision in detail. What problem does it solve? Who is it for?"
                        className="w-full h-40 bg-transparent text-white px-4 py-2 rounded-xl focus:outline-none focus:bg-white/5 resize-none text-lg leading-relaxed placeholder-white/20"
                        required
                    />
                </div>

                {/* Row 3: Constraints & Image */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-glass-surface rounded-2xl p-1 border border-glass-border">
                        <label className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider px-4 py-2 block">Technical Constraints</label>
                        <textarea
                            value={constraints}
                            onChange={(e) => setConstraints(e.target.value)}
                            placeholder="e.g. Must use Supabase, No TypeScript, Deployment on Vercel..."
                            className="w-full h-32 bg-transparent text-white px-4 py-2 rounded-xl focus:outline-none focus:bg-white/5 resize-none leading-relaxed placeholder-white/20 text-sm"
                        />
                    </div>

                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-glass-surface rounded-2xl border border-glass-border border-dashed hover:border-brand-secondary/50 hover:bg-white/5 cursor-pointer transition-all flex flex-col items-center justify-center p-6 relative group h-full"
                    >
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        {imageBase64 ? (
                            <>
                                <img src={`data:image/png;base64,${imageBase64}`} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-50 group-hover:opacity-30 transition-opacity" />
                                <div className="z-10 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md text-sm font-semibold text-white border border-white/10">Change Image</div>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-glass-text-secondary group-hover:text-white">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                </div>
                                <span className="text-glass-text-secondary group-hover:text-white text-sm font-medium">Attach Wireframe</span>
                            </>
                        )}
                    </div>
                </div>

                <button
                type="submit"
                disabled={!idea.trim() || isAnalyzingAudio}
                className="w-full glass-button-primary text-white font-bold text-xl py-5 rounded-2xl transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-brand-primary/20 flex items-center justify-center gap-3"
                >
                    <span>Initialize Blueprint</span>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
            </form>
        )}

        {/* --- TAB: MARKETPLACE --- */}
        {activeTab === 'marketplace' && (
            <div className="max-w-6xl mx-auto animate-fade-in">
                <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>🌱</span> Starter Templates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {STARTER_TEMPLATES.map((t, idx) => (
                            <div key={idx} className="group bg-brand-panel border border-glass-border rounded-xl p-4 hover:border-brand-primary/50 transition-all hover:bg-brand-surface relative overflow-hidden flex flex-col h-full">
                                <div className="absolute top-0 right-0 px-2 py-0.5 bg-white/5 rounded-bl-lg text-[9px] uppercase font-bold text-glass-text-secondary tracking-widest border-b border-l border-white/5">
                                    {t.category}
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                                    {t.icon}
                                </div>
                                <h3 className="text-sm font-bold text-white mb-1">{t.name}</h3>
                                <p className="text-xs text-glass-text-secondary mb-3 line-clamp-2 flex-grow">
                                    {t.idea}
                                </p>
                                <button 
                                    onClick={() => handleUseTemplate(t)}
                                    className="w-full py-1.5 bg-white/5 hover:bg-brand-primary text-glass-text hover:text-white rounded text-xs font-bold transition-all border border-white/10"
                                >
                                    Use Template
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>🌍</span> Community Blueprints
                    </h3>
                    {state.marketplace.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-glass-border rounded-xl bg-white/5">
                            <p className="text-glass-text-secondary text-sm">No community projects published yet. Be the first!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {state.marketplace.map((p) => (
                                <div 
                                    key={p.id} 
                                    onClick={() => setSelectedMarketplaceItem(p)}
                                    className="group bg-[#0f172a] border border-glass-border rounded-xl p-5 hover:border-brand-secondary/50 transition-all flex flex-col relative overflow-hidden cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-secondary to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                                                {p.author?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white group-hover:text-brand-secondary transition-colors">{p.name}</h4>
                                                <span className="text-[10px] text-glass-text-secondary">by {p.author || 'Anonymous'}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {p.tags?.slice(0, 2).map((tag, i) => (
                                                <span key={i} className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-glass-text-secondary border border-white/5">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <p className="text-xs text-slate-400 mb-4 line-clamp-2 h-8">
                                        {p.initialIdea}
                                    </p>

                                    <div className="mt-auto pt-4 border-t border-glass-border flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={(e) => handleLike(e, p.id)}
                                                className="text-xs flex items-center gap-1 text-glass-text-secondary hover:text-pink-400 transition-colors"
                                            >
                                                <span>♥</span> {p.likes || 0}
                                            </button>
                                            <div className="text-[10px] text-glass-text-secondary">
                                                {new Date(p.lastUpdated).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <span className="text-xs text-brand-secondary font-bold group-hover:translate-x-1 transition-transform">
                                            View Details →
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- TAB: SAVED PROJECTS --- */}
        {activeTab === 'saved' && (
            <div className="max-w-4xl mx-auto animate-fade-in">
                <div className="space-y-4">
                    {state.projectsList.length === 0 ? (
                        <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <span className="text-4xl block mb-4">📂</span>
                            <p className="text-glass-text-secondary">No saved blueprints found.</p>
                        </div>
                    ) : (
                        state.projectsList.sort((a,b) => b.lastUpdated - a.lastUpdated).map(p => {
                            const progress = getProjectProgress(p);
                            return (
                                <div key={p.id} className="group bg-brand-panel p-4 rounded-xl border border-glass-border hover:border-brand-secondary/50 flex flex-col sm:flex-row items-center justify-between transition-all cursor-pointer gap-4" onClick={() => handleLoadProject(p.id)}>
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-secondary/20 to-brand-accent/20 flex items-center justify-center text-white font-bold border border-white/5 text-lg">
                                            {p.name.charAt(0)}
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="font-bold text-white group-hover:text-brand-secondary transition-colors text-lg">{p.name}</h3>
                                            <div className="flex items-center gap-3 text-xs text-glass-text-secondary mt-1">
                                                <span>Updated {new Date(p.lastUpdated).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span>~{progress}% Complete</span>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden max-w-[200px]">
                                                <div className="h-full bg-brand-secondary" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                        <button 
                                            onClick={() => handleLoadProject(p.id)}
                                            className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg transition-all"
                                        >
                                            Continue
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteProject(e, p.id)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Delete Project"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Activity Feed Sidebar */}
      <div className="hidden lg:block w-72 bg-[#0f172a] border-l border-glass-border p-6 flex-shrink-0 animate-fade-in">
          <h3 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Team Activity
          </h3>
          <div className="space-y-6 relative">
              {/* Timeline Line */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-800"></div>
              
              {ACTIVITIES.map((item) => (
                  <div key={item.id} className="relative pl-8">
                      <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-slate-800 border-2 border-[#0f172a] flex items-center justify-center text-xs z-10">
                          {item.avatar}
                      </div>
                      <div className="text-sm text-white font-medium">
                          {item.user} <span className="text-slate-500 font-normal">{item.action}</span>
                      </div>
                      <div className="text-xs text-brand-secondary mt-0.5 truncate">{item.project}</div>
                      <div className="text-[10px] text-glass-text-secondary mt-1">{item.time}</div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default IdeaInput;
