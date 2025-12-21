
import React, { useState } from 'react';

interface DocumentationViewProps {
  onClose: () => void;
}

const DocumentationView: React.FC<DocumentationViewProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const HELP_CARDS = [
      {
          title: "Getting Started",
          icon: "🚀",
          description: "Learn the basics of 0relai and create your first architectural blueprint in minutes.",
          color: "bg-blue-500",
          link: "#getting-started"
      },
      {
          title: "The Council",
          icon: "🏛️",
          description: "Understand how the Multi-Agent system debates security, devops, and architecture.",
          color: "bg-purple-500",
          link: "#the-council"
      },
      {
          title: "Edge Runtime",
          icon: "⚡",
          description: "Execute Node.js code directly in your browser with WebContainers.",
          color: "bg-orange-500",
          link: "#edge-runtime"
      },
      {
          title: "Security & Compliance",
          icon: "🛡️",
          description: "Generate SOC2/HIPAA checklists and RBAC matrices.",
          color: "bg-red-500",
          link: "#security"
      },
      {
          title: "Hybrid Intelligence",
          icon: "🧠",
          description: "Switch between Cloud (Gemini) and Local (WebLLM) models for privacy.",
          color: "bg-green-500",
          link: "#intelligence"
      },
      {
          title: "Export & Deploy",
          icon: "📦",
          description: "Push to GitHub, download ZIP bundles, or generate Docker containers.",
          color: "bg-cyan-500",
          link: "#export"
      }
  ];

  const FAQS = [
      { q: "Is my data private?", a: "Yes. By default, projects are stored locally in your browser. Cloud sync is optional." },
      { q: "Can I use my own API key?", a: "Currently managed by 0relai Pro, but BYOB (Bring Your Own Bucket) is supported for storage." },
      { q: "How do I reset a stuck project?", a: "Go to Settings > General > Clear Data to wipe the local cache." }
  ];

  return (
    <div className="fixed inset-0 bg-[#0b0e14] z-[200] flex flex-col animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-slate-900/50">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-glow">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">0relai Manual</h1>
                    <p className="text-sm text-glass-text-secondary">Documentation & User Guide</p>
                </div>
            </div>
            <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
            >
                ✕
            </button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto p-8 space-y-12">
                
                {/* Hero Search */}
                <div className="text-center py-12">
                    <h2 className="text-4xl font-black text-white mb-6">How can we help you build?</h2>
                    <div className="relative max-w-2xl mx-auto">
                        <input 
                            type="text" 
                            placeholder="Search topics, tutorials, or API references..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-6 py-4 text-lg text-white focus:border-brand-primary focus:outline-none shadow-2xl"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Categories Grid */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span className="text-brand-secondary">#</span> Core Modules
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {HELP_CARDS.map((card, idx) => (
                            <div key={idx} className="group bg-slate-900/40 border border-white/5 p-6 rounded-2xl hover:bg-slate-800/60 hover:border-white/10 transition-all cursor-pointer relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-24 h-24 ${card.color} opacity-10 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity`}></div>
                                <div className="text-3xl mb-4 bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center border border-white/5">
                                    {card.icon}
                                </div>
                                <h4 className="text-lg font-bold text-white mb-2">{card.title}</h4>
                                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                    {card.description}
                                </p>
                                <span className="text-xs font-bold text-brand-secondary uppercase tracking-wider group-hover:text-white transition-colors flex items-center gap-1">
                                    Learn More <span>→</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ / Info */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="text-brand-secondary">?</span> Frequently Asked Questions
                        </h3>
                        <div className="space-y-4">
                            {FAQS.map((faq, i) => (
                                <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/5">
                                    <h4 className="font-bold text-white mb-2">{faq.q}</h4>
                                    <p className="text-sm text-slate-400">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-brand-primary/20 to-purple-900/20 rounded-2xl p-8 border border-white/10 flex flex-col justify-center text-center">
                        <div className="text-4xl mb-4">💬</div>
                        <h3 className="text-xl font-bold text-white mb-2">Need Human Help?</h3>
                        <p className="text-sm text-blue-200 mb-6">
                            Join our Discord community or contact enterprise support.
                        </p>
                        <button className="bg-white text-brand-dark px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg">
                            Contact Support
                        </button>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default DocumentationView;
