
import React, { useState, useEffect, useRef } from 'react';

const ActivityTerminal: React.FC = () => {
  const [logs, setLogs] = useState<string[]>(["> Initializing Neural Architect v2.0..."]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const steps = [
    "Analyzing project constraints and requirements...",
    "Querying knowledge base for competitive patterns...",
    "Selecting optimal technology stack...",
    "Resolution: Frontend -> React/Vite",
    "Resolution: Backend -> Node/Express",
    "Constructing entity-relationship models...",
    "Normalizing database schema (3NF)...",
    "Drafting API contracts (OpenAPI 3.0)...",
    "Generating infrastructure-as-code (Terraform)...",
    "Synthesizing UI design tokens...",
    "Compiling final blueprint artifacts...",
    "Verifying architectural integrity...",
  ];

  useEffect(() => {
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) + "." + Math.floor(Math.random() * 999);
        setLogs(prev => [...prev, `[${timestamp}] ${steps[stepIndex]}`]);
        stepIndex++;
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in text-center p-8 w-full max-w-2xl mx-auto">
      
      {/* Visual Abstract Graphic */}
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border border-brand-primary/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
        <div className="absolute inset-2 border border-tech-cyan/30 rounded-full animate-[spin_4s_linear_infinite_reverse]"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Architect Agent Active</h3>
      <p className="text-glass-text-secondary text-sm mb-6">Processing high-dimensional architectural vectors...</p>
      
      {/* Terminal Window */}
      <div className="w-full bg-[#0b0e14] rounded-lg border border-glass-border overflow-hidden shadow-2xl text-left font-mono text-xs">
        <div className="bg-[#151b26] px-4 py-2 border-b border-glass-border flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
            <span className="ml-2 text-glass-text-secondary opacity-50">agent_runner.exe</span>
        </div>
        <div 
            ref={scrollRef}
            className="h-48 overflow-y-auto p-4 space-y-1 text-slate-300"
        >
            {logs.map((log, i) => (
                <div key={i} className="break-words">
                    <span className="text-tech-cyan mr-2">➜</span>
                    {log}
                </div>
            ))}
            <div className="animate-pulse text-brand-primary">_</div>
        </div>
      </div>
    </div>
  );
};

export default ActivityTerminal;
