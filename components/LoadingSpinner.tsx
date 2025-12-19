
import React, { useState, useEffect } from 'react';

const LoadingSpinner: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = [
    "Initializing neural architect...",
    "Scanning competitive landscape...",
    "Selecting optimal tech stack components...",
    "Engineering relational data structures...",
    "Mapping recursive file systems...",
    "Synthesizing UI/UX design tokens...",
    "Drafting secure API specifications...",
    "Compiling agent-protocol instructions...",
    "Building implementation roadmap...",
    "Finalizing architectural blueprint..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in text-center p-8">
      <div className="relative w-32 h-32 mb-10">
        {/* Outer Ring */}
        <div className="absolute inset-0 border-4 border-brand-primary/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-brand-accent rounded-full animate-spin"></div>
        
        {/* Middle Ring */}
        <div className="absolute inset-4 border-2 border-brand-secondary/10 rounded-full"></div>
        <div className="absolute inset-4 border-2 border-b-brand-secondary rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
        
        {/* Inner Hub */}
        <div className="absolute inset-10 bg-gradient-to-br from-brand-primary to-brand-accent rounded-full flex items-center justify-center shadow-lg shadow-brand-primary/40">
           <svg className="w-6 h-6 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
           </svg>
        </div>

        {/* Floating Particles */}
        <div className="absolute -top-4 -left-4 w-2 h-2 bg-brand-accent rounded-full animate-ping"></div>
        <div className="absolute -bottom-2 -right-2 w-1.5 h-1.5 bg-brand-secondary rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
      </div>

      <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Architecting Solution</h3>
      <p className="text-brand-accent font-mono text-sm uppercase tracking-[0.2em] animate-pulse">
        {messages[messageIndex]}
      </p>
      
      <div className="mt-8 flex gap-1 justify-center">
        {[0, 1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className="w-8 h-1 bg-slate-800 rounded-full overflow-hidden"
          >
            <div 
              className="h-full bg-brand-primary transition-all duration-500" 
              style={{ width: messageIndex >= i ? '100%' : '0%' }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingSpinner;
