
import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../ProjectContext';
import { ProjectData, AppPhase, ActivityItem, ProjectTemplate } from '../types';
import MarketplaceDetail from './MarketplaceDetail';

interface IdeaInputProps {
  onSubmit: (idea: string, type: string, constraints: string, imageBase64?: string) => void;
  onAnalyzeAudio: (audioBase64: string) => Promise<{ idea: string; type: string; constraints: string } | null>;
  isAnalyzingAudio: boolean;
}

const STARTER_TEMPLATES = [
    // --- CORE SOFTWARE PATTERNS ---
    {
        name: "Enterprise SaaS Starter",
        icon: "🏢",
        type: "SaaS Application",
        category: "Core",
        idea: "A production-ready, multi-tenant SaaS platform designed for scalability. Features include: Secure Authentication (Magic Links/SSO), Organization/Team management with granular RBAC, Usage-based Subscription Billing via Stripe, and a responsive Analytics Dashboard. The architecture must prioritize security and data isolation.",
        constraints: "Framework: Next.js (App Router). Database: Supabase (PostgreSQL + RLS). State: TanStack Query. UI: Tailwind CSS + Shadcn UI. Auth: Supabase Auth. Payments: Stripe SDK. Validation: Zod. Testing: Vitest."
    },
    {
        name: "Modern E-Commerce",
        icon: "🛍️",
        type: "E-Commerce",
        category: "Core",
        idea: "A high-performance headless commerce storefront. Includes faceted product search/filtering, rich product detail pages with image galleries, a persistent shopping cart, and a secure checkout flow. Includes a separate Admin Panel for inventory, order management, and customer CRM.",
        constraints: "Framework: Next.js (SSR). Data: Shopify Storefront API (or PostgreSQL/Prisma). State: Zustand (Cart). UI: Tailwind CSS + Headless UI. Animation: Framer Motion. SEO: Next-SEO. Payment: Stripe Checkout."
    },
    {
        name: "Internal Tool / CRM",
        icon: "🔨",
        type: "Internal Tool",
        category: "Core",
        idea: "A high-density data management tool for internal business operations. Features complex data tables with server-side sorting/filtering, Kanban pipelines for workflow status, comprehensive activity logging, and role-based views (Admin vs User). Focus on information density and keyboard accessibility.",
        constraints: "Framework: React (Vite). Data Table: TanStack Table (v8). State: TanStack Query. Charts: Recharts or Tremor. Backend: Node.js/Express or Supabase. Styles: Tailwind CSS. Focus on keyboard navigation/shortcuts."
    },
    {
        name: "Cross-Platform Mobile",
        icon: "📱",
        type: "Mobile App",
        category: "Core",
        idea: "A social or utility mobile application with a native feel. Features include a bottom tab navigation layout, user profiles with media uploads, a real-time feed, camera access, and push notifications. Designed for 'Offline-First' usage.",
        constraints: "Framework: React Native (Expo Router). Backend: Firebase (Auth + Firestore + Storage) or Supabase. Styling: NativeWind (Tailwind). State: Legend-State or Zustand. Offline: TanStack Query (persist)."
    },

    // --- BESPOKE & 2025 TRENDS ---
    {
        name: "Personal 'Bento' OS",
        icon: "🍱",
        type: "Personal Dashboard",
        category: "Bespoke",
        idea: "A highly aesthetic 'Life OS' dashboard using a Bento Grid layout. It aggregates disparate data streams into a unified view. Widgets include: A Pomodoro timer, Spotify 'Now Playing' controller, a daily To-Do list, a crypto/stock ticker, and a local weather card. Supports drag-and-drop widget arrangement.",
        constraints: "Framework: React (Vite). Layout: CSS Grid (Bento pattern). DnD: dnd-kit or react-grid-layout. State: Zustand + LocalStorage (persistence). UI: Glassmorphism, Dark Mode only. Icons: Lucide React."
    },
    {
        name: "Interactive Pitch Deck",
        icon: "📊",
        type: "Presentation Web App",
        category: "Bespoke",
        idea: "A keyboard-navigable, web-based slide deck that replaces PowerPoint. Features smooth page transitions, 'Live Code' blocks that are editable/runnable, interactive data charts, and 3D product showcases. It must be responsive and shareable via URL.",
        constraints: "Framework: React. Animation: Framer Motion (AnimatePresence for slides). Charts: Recharts (Interactive). Code: Prism.js/SyntaxHighlighter. 3D: Spline or React Three Fiber. No backend required (URL state)."
    },
    {
        name: "Hype Microsite",
        icon: "✨",
        type: "Landing Page",
        category: "Bespoke",
        idea: "A high-impact, single-page 'Scrollytelling' experience for a product launch. Features a sticky 3D model or video background that evolves as the user scrolls. Includes a 'Join Waitlist' form that generates a custom 'Ticket' image for the user to share on social media.",
        constraints: "Framework: React or Next.js. Animation: GSAP (ScrollTrigger) or Lenis (Smooth Scroll). 3D: React Three Fiber (Drei). Image Gen: html-to-image. Backend: Supabase (Waitlist). Style: Neo-Brutalism or Lux."
    },
    {
        name: "Digital Garden",
        icon: "🌿",
        type: "Knowledge Base",
        category: "Bespoke",
        idea: "A non-linear personal wiki and blog. Unlike a standard blog, it features bidirectional linking ([[link]]), hover previews of linked notes, and a visual 'Graph View' showing how thoughts connect. Emphasizes typography, readability, and 'seed/sprout/evergreen' content status.",
        constraints: "Framework: Next.js (SSG). Content: MDX. Graph: react-force-graph or D3.js. Styling: Tailwind Typography. Features: Local Search (Cmd+K), Backlinks calculation."
    },
    {
        name: "AI Wrapper SaaS",
        icon: "🤖",
        type: "SaaS Application",
        category: "Bespoke",
        idea: "A specialized AI tool wrapping a specific prompt workflow (e.g., 'Legal Contract Analyzer'). Features a clean input form, streaming text response, structured JSON extraction from the LLM, and a history of past generations. Includes credit/token usage tracking.",
        constraints: "Framework: Next.js. AI: Vercel AI SDK (useChat/useCompletion). Streaming: Edge Runtime. Database: Supabase (Auth + History). UI: Radix UI primitives. Styling: Tailwind."
    }
];

// Activity Feed Component
const ActivityFeed: React.FC<{ activities: ActivityItem[] }> = ({ activities }) => {
    return (
        <div className="h-full flex flex-col">
            <h3 className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Live Activity
            </h3>
            <div className="space-y-6 relative flex-grow overflow-y-auto custom-scrollbar pr-2">
                {/* Timeline Line */}
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-800"></div>
                
                {activities.length === 0 ? (
                    <div className="text-xs text-slate-500 pl-8">No recent activity.</div>
                ) : (
                    activities.map((item) => (
                        <div key={item.id} className="relative pl-8">
                            <div className={`absolute left-0 top-0 w-6 h-6 rounded-full border-2 border-[#0f172a] flex items-center justify-center text-[10px] z-10 ${
                                item.type === 'create' ? 'bg-blue-500 text-white' :
                                item.type === 'update' ? 'bg-purple-500 text-white' :
                                item.type === 'snapshot' ? 'bg-yellow-500 text-black' :
                                item.type === 'publish' ? 'bg-green-500 text-black' :
                                'bg-slate-700 text-slate-300'
                            }`}>
                                {item.type === 'create' ? '✨' : 
                                 item.type === 'update' ? '⚡' : 
                                 item.type === 'snapshot' ? '📸' : 
                                 item.type === 'publish' ? '🚀' : '🔧'}
                            </div>
                            <div className="text-sm text-white font-medium">
                                {item.message}
                            </div>
                            {item.projectName && <div className="text-xs text-brand-secondary mt-0.5 truncate">{item.projectName}</div>}
                            <div className="text-[10px] text-glass-text-secondary mt-1">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const Dashboard: React.FC<IdeaInputProps> = ({ onSubmit, onAnalyzeAudio, isAnalyzingAudio }) => {
  const { state, dispatch } = useProject();
  const [activeTab, setActiveTab] = useState<'overview' | 'new' | 'templates' | 'marketplace'>('overview');
  const [selectedMarketplaceItem, setSelectedMarketplaceItem] = useState<ProjectData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Form State
  const [idea, setIdea] = useState('');
  const [projectType, setProjectType] = useState('Web Application');
  const [constraints, setConstraints] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize View based on state
  useEffect(() => {
      // If user has no projects, default to 'new' tab
      if (state.projectsList.length === 0 && activeTab === 'overview') {
          setActiveTab('new');
      }
  }, [state.projectsList.length]);

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

  const handleUseCustomTemplate = (t: ProjectTemplate) => {
      // Load template data as a new project
      const newProject = {
          ...t.projectData,
          id: `new-${Date.now()}`,
          name: `${t.name} (New)`,
          lastUpdated: Date.now()
      };
      dispatch({ type: 'LOAD_PROJECT', payload: newProject as ProjectData });
      dispatch({ type: 'SET_PHASE', payload: AppPhase.BRAINSTORM });
  };

  const handleDeleteTemplate = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(confirm('Delete this template?')) {
          dispatch({ type: 'DELETE_TEMPLATE', payload: id });
      }
  };

  const handleForkProject = (project: ProjectData) => {
      dispatch({ type: 'IMPORT_FROM_MARKETPLACE', payload: project });
      setSelectedMarketplaceItem(null);
  };

  const handleLoadProject = (id: string) => {
    const fullData = localStorage.getItem(`0relai-proj-${id}`);
    if (fullData) {
      dispatch({ type: 'LOAD_PROJECT', payload: JSON.parse(fullData) });
      // Logic to jump to last active phase would go here if tracked
      dispatch({ type: 'SET_PHASE', payload: AppPhase.BRAINSTORM }); 
    }
  };

  const handleNavigate = (phase: AppPhase) => {
      dispatch({ type: 'SET_PHASE', payload: phase });
  };

  const handleLike = (e: React.MouseEvent | null, id: string) => {
      if(e) e.stopPropagation();
      dispatch({ type: 'LIKE_PROJECT', payload: id });
      
      if(selectedMarketplaceItem && selectedMarketplaceItem.id === id) {
          setSelectedMarketplaceItem({
              ...selectedMarketplaceItem,
              likes: (selectedMarketplaceItem.likes || 0) + 1
          });
      }
  };

  // --- Components ---

  const ResumeCard = () => {
      const lastProject = state.projectsList.length > 0 ? state.projectsList[0] : null;
      if (!lastProject) return null;

      return (
          <div className="bg-gradient-to-r from-brand-primary/20 to-blue-900/20 border border-brand-primary/30 rounded-2xl p-6 relative overflow-hidden group hover:border-brand-primary/50 transition-all cursor-pointer" onClick={() => handleLoadProject(lastProject.id)}>
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M14.754 10c.966.696 2.536 1.04 4.096 1.04 1.56 0 3.13-.344 4.096-1.04.966-.696 1.054-1.88.054-2.88-1-1-2.536-1.04-4.096-1.04-1.56 0-3.13.04-4.096 1.04-.966 1-.912 2.184.054 2.88zM6.697 12c-1.324-.764-2.536-1.04-4.096-1.04-1.56 0-2.828.344-4.096 1.04-.966.696-1.054 1.88-.054 2.88 1 1 2.536 1.04 4.096 1.04 1.56 0 3.13-.04 4.096-1.04.966-1 .912-2.184-.054-2.88z" /></svg>
              </div>
              
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] uppercase font-bold bg-brand-primary text-white px-2 py-0.5 rounded">Current Project</span>
                      <span className="text-xs text-glass-text-secondary">Last edited {new Date(lastProject.lastUpdated).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{lastProject.name}</h3>
                  <p className="text-sm text-blue-200 mb-6 max-w-md">Resume your architectural session. The last snapshot is ready.</p>
                  
                  <button className="bg-white text-brand-dark px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-lg">
                      <span>Resume Session</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
              </div>
          </div>
      );
  };

  const QuickActions = () => {
      // Only show if user has an active project context
      if (!state.projectData.id || state.projectData.id.startsWith('temp')) return null;

      const actions = [
          { label: 'Add Knowledge Doc', icon: '🧠', action: () => handleNavigate(AppPhase.KNOWLEDGE_BASE) },
          { label: 'Edit Architecture', icon: '✨', action: () => handleNavigate(AppPhase.ARCHITECTURE) },
          { label: 'Refine Data Model', icon: '🗄️', action: () => handleNavigate(AppPhase.DATAMODEL) },
          { label: 'Review Tasks', icon: '✅', action: () => handleNavigate(AppPhase.WORKSPACE) }
      ];

      return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {actions.map((act, i) => (
                  <button 
                    key={i} 
                    onClick={act.action}
                    className="bg-slate-900/50 border border-white/5 p-4 rounded-xl flex items-center gap-3 hover:bg-white/5 hover:border-brand-primary/30 transition-all group"
                  >
                      <span className="text-xl group-hover:scale-110 transition-transform">{act.icon}</span>
                      <span className="text-xs font-bold text-slate-300 group-hover:text-white">{act.label}</span>
                  </button>
              ))}
          </div>
      );
  };

  const StatsRow = () => (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-glass-text-secondary mb-1">Total Blueprints</div>
              <div className="text-2xl font-bold text-white">{state.projectsList.length}</div>
          </div>
          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-glass-text-secondary mb-1">Marketplace Assets</div>
              <div className="text-2xl font-bold text-white">{state.marketplace.length}</div>
          </div>
          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-glass-text-secondary mb-1">Active Tasks</div>
              <div className="text-2xl font-bold text-white">{state.projectData.tasks?.length || 0}</div>
          </div>
          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-glass-text-secondary mb-1">Sync Status</div>
              <div className="text-2xl font-bold text-white">{state.user ? 'Cloud' : 'Local'}</div>
          </div>
      </div>
  );

  return (
    <div className="animate-slide-in-up flex gap-8 h-full">
      {selectedMarketplaceItem && (
          <MarketplaceDetail 
            project={selectedMarketplaceItem}
            onClose={() => setSelectedMarketplaceItem(null)}
            onFork={() => handleForkProject(selectedMarketplaceItem)}
            onLike={(id) => handleLike(null, id)}
          />
      )}

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col h-full overflow-hidden">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8 flex-shrink-0">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Architect Dashboard</h1>
                <p className="text-glass-text-secondary text-sm">Welcome back, Architect.</p>
            </div>
            
            <div className="bg-brand-panel p-1 rounded-xl border border-glass-border inline-flex">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                    <span>🏠</span> Overview
                </button>
                <button 
                    onClick={() => setActiveTab('new')}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'new' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                    <span>✨</span> Create
                </button>
                <button 
                    onClick={() => setActiveTab('templates')}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'templates' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                    <span>📐</span> Templates
                </button>
                <button 
                    onClick={() => setActiveTab('marketplace')}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'marketplace' ? 'bg-brand-primary text-white shadow-lg' : 'text-glass-text-secondary hover:text-white'}`}
                >
                    <span>🌍</span> Marketplace
                </button>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-fade-in">
                    <ResumeCard />
                    <QuickActions />
                    <StatsRow />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Recent Projects List */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-white text-lg">Recent Projects</h3>
                                <button onClick={() => setActiveTab('new')} className="text-xs text-brand-secondary hover:text-white transition-colors">+ New Project</button>
                            </div>
                            
                            <div className="space-y-3">
                                {state.projectsList.length === 0 ? (
                                    <div className="p-8 border border-dashed border-slate-700 rounded-xl text-center">
                                        <p className="text-slate-500 text-sm mb-4">No projects yet.</p>
                                        <button onClick={() => setActiveTab('new')} className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-xs font-bold">Create First Blueprint</button>
                                    </div>
                                ) : (
                                    state.projectsList.slice(0, 5).map(p => (
                                        <div key={p.id} onClick={() => handleLoadProject(p.id)} className="bg-slate-900/50 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:border-brand-primary/30 hover:bg-slate-900 transition-all cursor-pointer group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-lg font-bold text-slate-400 group-hover:text-white group-hover:from-brand-secondary group-hover:to-brand-accent transition-all relative">
                                                    {p.name.charAt(0)}
                                                    {/* Source Indicator */}
                                                    <div className="absolute -bottom-1 -right-1 text-[8px] bg-slate-900 rounded-full p-0.5 border border-slate-700" title={p.source === 'cloud' || p.source === 'byob' ? 'Synced to Cloud' : 'Local Only'}>
                                                        {p.source === 'cloud' || p.source === 'byob' ? '☁️' : '💻'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white text-sm group-hover:text-brand-secondary transition-colors">{p.name}</h4>
                                                    <p className="text-xs text-slate-500">Updated {new Date(p.lastUpdated).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-slate-600 group-hover:translate-x-1 transition-transform">
                                                ➔
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Templates (Mini) */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-white text-lg">Quick Start</h3>
                                <button onClick={() => setActiveTab('templates')} className="text-xs text-brand-secondary hover:text-white transition-colors">View All</button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {STARTER_TEMPLATES.slice(0, 4).map((t, idx) => (
                                    <div key={idx} onClick={() => handleUseTemplate(t)} className="bg-slate-900/30 border border-white/5 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
                                        <div className="text-2xl mb-2 group-hover:scale-110 transition-transform origin-left">{t.icon}</div>
                                        <h4 className="font-bold text-white text-xs mb-1">{t.name}</h4>
                                        <p className="text-[10px] text-slate-500">{t.category}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW BLUEPRINT TAB */}
            {activeTab === 'new' && (
                <div className="animate-fade-in max-w-3xl mx-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                                            <option className="bg-slate-900">Personal Dashboard</option>
                                            <option className="bg-slate-900">Interactive Presentation</option>
                                            <option className="bg-slate-900">Microsite / Landing Page</option>
                                            <option className="bg-slate-900">Mobile App (iOS/Android)</option>
                                            <option className="bg-slate-900">API / Backend Service</option>
                                            <option className="bg-slate-900">Game</option>
                                        </select>
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
                                    placeholder="e.g. Must use Supabase, No TypeScript..."
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
                </div>
            )}

            {/* TEMPLATES TAB */}
            {activeTab === 'templates' && (
                <div className="animate-fade-in">
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {['All', 'Core', 'Bespoke'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${selectedCategory === cat ? 'bg-white text-black border-white' : 'bg-transparent text-slate-400 border-slate-700 hover:border-white hover:text-white'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* New Template Card */}
                        <div className="bg-slate-900/30 border border-white/5 rounded-xl p-5 border-dashed flex flex-col items-center justify-center text-center">
                            <div className="text-4xl mb-4 opacity-50">📐</div>
                            <h3 className="font-bold text-white mb-2">Create Custom Template</h3>
                            <p className="text-xs text-glass-text-secondary mb-4">Save any active project as a template from the header menu.</p>
                        </div>

                        {/* Saved Templates */}
                        {state.customTemplates.map(t => (
                            <div key={t.id} onClick={() => handleUseCustomTemplate(t)} className="bg-slate-800/50 border border-white/5 rounded-xl p-5 hover:bg-slate-800 cursor-pointer group relative overflow-hidden">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => handleDeleteTemplate(e, t.id)} className="text-slate-500 hover:text-red-400 p-1">✕</button>
                                </div>
                                <div className="text-3xl mb-3">{t.icon}</div>
                                <h3 className="font-bold text-white text-lg mb-1">{t.name}</h3>
                                <p className="text-xs text-glass-text-secondary line-clamp-2 mb-4">{t.description}</p>
                                <div className="text-[10px] text-brand-primary font-bold uppercase tracking-wider">My Template</div>
                            </div>
                        ))}

                        {/* System Templates */}
                        {STARTER_TEMPLATES
                            .filter(t => selectedCategory === 'All' || t.category === selectedCategory)
                            .map((t, idx) => (
                            <div key={idx} onClick={() => handleUseTemplate(t)} className="bg-[#0f172a] border border-white/5 rounded-xl p-5 hover:bg-white/5 cursor-pointer group flex flex-col h-full">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="text-3xl group-hover:scale-110 transition-transform origin-left">{t.icon}</div>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-glass-text-secondary bg-white/5 px-2 py-1 rounded">{t.category}</span>
                                </div>
                                <h3 className="font-bold text-white text-lg mb-2">{t.name}</h3>
                                <p className="text-xs text-slate-400 line-clamp-3 mb-4 flex-grow">{t.idea}</p>
                                <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-auto">
                                    <span className="text-[10px] text-slate-500">{t.type}</span>
                                    <span className="text-xs text-brand-secondary group-hover:translate-x-1 transition-transform">Start →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MARKETPLACE TAB */}
            {activeTab === 'marketplace' && (
                <div className="animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {state.marketplace.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-slate-500 italic">No community blueprints yet. Be the first to publish!</div>
                        ) : (
                            state.marketplace.map((p) => (
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
                                        </div>
                                        <span className="text-xs text-brand-secondary font-bold group-hover:translate-x-1 transition-transform">
                                            View Details →
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Activity Sidebar */}
      <div className="hidden lg:block w-72 bg-[#0f172a] border-l border-glass-border p-6 flex-shrink-0 animate-fade-in">
          <ActivityFeed activities={state.recentActivities} />
      </div>
    </div>
  );
};

export default Dashboard;
