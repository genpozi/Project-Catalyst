
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useProject } from '../ProjectContext';
import { GeminiService } from '../GeminiService';
import { LocalIntelligence } from '../LocalIntelligence';
import MarkdownRenderer from './MarkdownRenderer';
import { ChatMessage, KnowledgeDoc, ProjectData } from '../types';
import { AGENT_PERSONAS, AgentRoleId } from '../utils/agentPersonas';
import { GenerateContentResponse } from '@google/genai';
import LiveArchitect from './LiveArchitect';
import { orchestrator } from '../utils/AgentOrchestrator';
import { useToast } from './Toast';

const CouncilProposalCard: React.FC<{ 
    proposal: Partial<ProjectData>; 
    summary: string; 
    onAccept: () => void;
}> = ({ proposal, summary, onAccept }) => {
    const [accepted, setAccepted] = useState(false);

    const handleAccept = () => {
        setAccepted(true);
        onAccept();
    };

    if (accepted) {
        return (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mt-2 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 text-black flex items-center justify-center font-bold">✓</div>
                <span className="text-green-200 text-sm font-bold">Proposal Accepted & Applied</span>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-yellow-900/20 to-amber-900/20 border border-yellow-500/30 rounded-xl p-4 mt-4 shadow-lg">
            <div className="flex items-center gap-2 mb-3 text-yellow-400">
                <span className="text-xl">⚖️</span>
                <h4 className="font-bold text-sm uppercase tracking-wider">Council Resolution</h4>
            </div>
            
            <p className="text-sm text-slate-200 mb-4 font-medium leading-relaxed">
                {summary || "The council has proposed changes to the project blueprint."}
            </p>

            {/* Diff Preview (Simplified) */}
            <div className="bg-black/30 rounded-lg p-3 mb-4 text-xs font-mono text-slate-400 max-h-32 overflow-y-auto custom-scrollbar">
                {Object.keys(proposal).map(key => (
                    <div key={key} className="flex gap-2">
                        <span className="text-yellow-500">•</span>
                        <span className="capitalize">{key}</span>
                        <span className="opacity-50">updated</span>
                    </div>
                ))}
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={handleAccept}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 rounded-lg text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                >
                    <span>✓</span> Apply Changes
                </button>
            </div>
        </div>
    );
};

const ArchitectChat: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state, dispatch } = useProject();
  const { addToast } = useToast();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(state.projectData.chatHistory || []);
  const [isTyping, setIsTyping] = useState(false);
  const [useLocalModel, setUseLocalModel] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isCouncilMode, setIsCouncilMode] = useState(false);
  const [activeRoleId, setActiveRoleId] = useState<AgentRoleId>('ARCHITECT');
  const [localContextDocs, setLocalContextDocs] = useState<string[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const gemini = useMemo(() => new GeminiService(), []);
  const localEngine = useMemo(() => LocalIntelligence.getInstance(), []);
  const chatSessionRef = useRef<any>(null);

  const activePersona = AGENT_PERSONAS[activeRoleId];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLiveMode, localContextDocs, isCouncilMode]);

  useEffect(() => {
    return () => {
      if (messages.length > 0) {
        dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { chatHistory: messages } });
      }
    };
  }, [messages, dispatch]);

  // Index project data when entering local mode
  useEffect(() => {
      if (useLocalModel && localEngine.isReady) {
          localEngine.indexContext(state.projectData);
      }
  }, [useLocalModel, state.projectData]);

  const initChat = async () => {
    if (!useLocalModel && !isCouncilMode) {
        chatSessionRef.current = await gemini.createChatSession(state.projectData, activeRoleId);
    }
  };

  useEffect(() => {
      if (!useLocalModel && !isLiveMode && !isCouncilMode) initChat();
  }, [useLocalModel, isLiveMode, activeRoleId, isCouncilMode]);

  // --- Active Context Logic ---
  const activeContext = useMemo(() => {
      if (state.ui.selectedNodeId) {
          const node = state.projectData.architecture?.visualLayout?.find(n => n.id === state.ui.selectedNodeId);
          if (node) return { type: 'node', label: node.label, data: node };
      }
      if (state.ui.selectedFilePath) {
          return { type: 'file', label: state.ui.selectedFilePath, data: null };
      }
      if (state.ui.selectedDocId) {
          const doc = state.projectData.knowledgeBase?.find(d => d.id === state.ui.selectedDocId);
          if (doc) return { type: 'doc', label: doc.title, data: doc };
      }
      return null;
  }, [state.ui, state.projectData]);

  const contextActions = useMemo(() => {
      if (!activeContext) return [];
      switch (activeContext.type) {
          case 'node': return ["Explain role", "Optimise this", "Suggest alternatives"];
          case 'file': return ["Explain code", "Refactor", "Add comments"];
          case 'doc': return ["Summarize", "Extract key rules", "Find contradictions"];
          default: return [];
      }
  }, [activeContext]);

  const handleClearContext = () => {
      dispatch({ type: 'SET_SELECTED_NODE', payload: undefined });
      dispatch({ type: 'SET_SELECTED_FILE', payload: undefined });
      dispatch({ type: 'SET_SELECTED_DOC', payload: undefined });
  };

  const handleApplyProposal = (proposal: Partial<ProjectData>) => {
      // Merge specific fields deeply if needed, but for now top-level merge
      // For architecture stack, simple merge works.
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: proposal });
      addToast("Blueprint updated by Council decision.", "success");
  };

  const handleSend = async (e: React.FormEvent, overrideText?: string) => {
    if(e) e.preventDefault();
    const textToSend = overrideText || input;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setLocalContextDocs([]);

    try {
        if (isCouncilMode && !useLocalModel) {
            // --- COUNCIL MODE ---
            const stream = orchestrator.runCouncil(textToSend, state.projectData);
            
            for await (const step of stream) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString() + Math.random(),
                    role: 'model',
                    text: step.response,
                    timestamp: Date.now(),
                    agentId: step.roleId,
                    proposal: step.proposal,
                    proposalSummary: step.proposalSummary
                }]);
            }
        } else {
            // --- STANDARD MODE ---
            const aiMsgId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, { id: aiMsgId, role: 'model', text: '', timestamp: Date.now(), agentId: activeRoleId }]);
            let fullText = '';

            let messageToSend = userMsg.text;
            if (activeContext) {
                let contextData = "";
                if (activeContext.type === 'node') contextData = `Node: ${JSON.stringify(activeContext.data)}`;
                if (activeContext.type === 'file') contextData = `File Path: ${activeContext.label}`; 
                if (activeContext.type === 'doc') contextData = `Doc: ${(activeContext.data as KnowledgeDoc).content}`;
                messageToSend = `[CONTEXT: User is focusing on ${activeContext.type} "${activeContext.label}". Data: ${contextData}]\n\n${userMsg.text}`;
            }

            if (useLocalModel) {
                if (!localEngine.isReady) {
                    fullText = "Error: Local Engine is not ready. Please initialize it in Settings.";
                    setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m));
                } else {
                    await localEngine.chatStream(
                        messageToSend, 
                        (chunk) => {
                            fullText = chunk;
                            setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m));
                        },
                        (retrievedDocs) => {
                            setLocalContextDocs(retrievedDocs);
                        }
                    );
                }
            } else {
                if (!chatSessionRef.current) await initChat();
                const result = await chatSessionRef.current.sendMessageStream({ message: messageToSend });
                for await (const chunk of result) {
                    const c = chunk as GenerateContentResponse;
                    fullText += (c.text || '');
                    setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m));
                }
            }
        }
    } catch (err) {
        console.error("Chat error", err);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Connection to Architect Lost. Please try again.', timestamp: Date.now() }]);
    } finally {
        setIsTyping(false);
    }
  };

  if (isLiveMode) {
      return (
          <div className="flex flex-col h-full bg-[#0f172a] border-l border-glass-border w-96 flex-shrink-0 shadow-2xl relative z-40">
              <div className="flex items-center justify-between p-4 border-b border-glass-border bg-slate-900/50">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      Live Voice Session
                  </h3>
                  <button onClick={() => setIsLiveMode(false)} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white transition-colors">
                      Switch to Text
                  </button>
              </div>
              <LiveArchitect projectData={state.projectData} onClose={() => setIsLiveMode(false)} />
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f172a] border-l border-glass-border w-96 flex-shrink-0 shadow-2xl relative z-40 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col p-4 border-b border-glass-border bg-slate-900/50 gap-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors shadow-lg ${isCouncilMode ? 'bg-gradient-to-br from-purple-600 to-yellow-600' : useLocalModel ? 'bg-purple-600' : activePersona.color}`}>
                    {isCouncilMode ? '🏛️' : useLocalModel ? '🧠' : <span className="text-lg">{activePersona.icon}</span>}
                </div>
                <div>
                    <h3 className="font-bold text-white text-sm">
                        {isCouncilMode ? 'The Council' : useLocalModel ? 'Local Architect' : activePersona.name}
                    </h3>
                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setUseLocalModel(!useLocalModel)} title="Toggle Intelligence Provider">
                        <span className={`w-1.5 h-1.5 rounded-full ${useLocalModel ? (localEngine.isReady ? 'bg-green-500' : 'bg-red-500') : 'bg-blue-500'} animate-pulse`}></span>
                        <span className="text-[10px] text-glass-text-secondary uppercase hover:text-white transition-colors">
                            {isCouncilMode ? 'Debate Mode Active' : useLocalModel ? (localEngine.isReady ? 'Gemma-2B Active' : 'Model Offline') : activePersona.framework}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-1">
                <button 
                    onClick={() => { setIsCouncilMode(!isCouncilMode); setUseLocalModel(false); }}
                    className={`p-1.5 rounded transition-colors ${isCouncilMode ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-glass-text-secondary hover:text-white'}`}
                    title="Toggle Council Debate Mode"
                >
                    ⚖️
                </button>
                <button 
                    onClick={() => { setIsLiveMode(true); setIsCouncilMode(false); }}
                    className="p-1.5 hover:bg-brand-secondary/20 rounded text-brand-secondary hover:text-white transition-colors"
                    title="Start Voice Call"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
                <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded text-glass-text-secondary hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        {/* Persona Selector */}
        {!useLocalModel && !isCouncilMode && (
            <div className="flex gap-1 bg-black/20 p-1 rounded-lg overflow-x-auto custom-scrollbar">
                {(Object.values(AGENT_PERSONAS) as any).map((p: any) => (
                    p.id !== 'CHAIRPERSON' && (
                        <button
                            key={p.id}
                            onClick={() => setActiveRoleId(p.id)}
                            className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
                                activeRoleId === p.id 
                                ? 'bg-white/10 text-white shadow' 
                                : 'text-glass-text-secondary hover:text-white'
                            }`}
                            title={p.description}
                        >
                            <span>{p.icon}</span> {p.id}
                        </button>
                    )
                ))}
            </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0b0e14]">
        {messages.length === 0 && (
            <div className="text-center p-6 text-glass-text-secondary text-sm">
                <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl ${isCouncilMode ? 'bg-yellow-500/20' : activePersona.color + ' bg-opacity-20'}`}>
                    {isCouncilMode ? '🏛️' : activePersona.icon}
                </div>
                {isCouncilMode ? (
                    <>
                        <p>The Council is assembled.</p>
                        <p className="mt-2 text-xs opacity-70">Ask a complex question to trigger a debate. If consensus is reached, I will propose updates to your blueprint.</p>
                    </>
                ) : (
                    <>
                        <p>👋 Hello! I'm your {activePersona.name}.</p>
                        <p className="mt-2 text-xs opacity-70">{activePersona.description}</p>
                    </>
                )}
            </div>
        )}
        {messages.map((msg) => {
            const agent = msg.agentId ? AGENT_PERSONAS[msg.agentId] : null;
            
            return (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.role === 'model' && agent && (
                        <div className="flex items-center gap-2 mb-1 ml-1">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${agent.color} text-white`}>
                                {agent.icon}
                            </div>
                            <span className="text-[10px] font-bold text-glass-text-secondary uppercase">{agent.name}</span>
                        </div>
                    )}

                    <div className={`max-w-[90%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-brand-primary text-white rounded-br-none' 
                        : agent 
                            ? `bg-[#1e293b] text-slate-300 rounded-bl-none border-l-2 border-${agent.color.replace('bg-', '')}`
                            : 'bg-[#1e293b] text-slate-300 rounded-bl-none border border-glass-border'
                    }`}>
                        {msg.role === 'model' ? <MarkdownRenderer content={msg.text} /> : msg.text}
                        
                        {/* Council Action Card */}
                        {msg.proposal && (
                            <CouncilProposalCard 
                                proposal={msg.proposal} 
                                summary={msg.proposalSummary || ''} 
                                onAccept={() => handleApplyProposal(msg.proposal!)} 
                            />
                        )}
                    </div>
                    <span className="text-[9px] text-glass-text-secondary mt-1 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
            );
        })}
        {isTyping && (
            <div className="flex flex-col gap-2 p-2">
                <div className="flex items-center gap-2 text-glass-text-secondary text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${activePersona.color}`}></div>
                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce delay-100 ${activePersona.color}`}></div>
                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce delay-200 ${activePersona.color}`}></div>
                    <span className="text-[10px] uppercase font-bold tracking-wider ml-1">
                        {isCouncilMode ? 'Council Deliberating...' : 'Thinking...'}
                    </span>
                </div>
            </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-900 border-t border-glass-border">
        {activeContext && (
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase font-bold text-brand-secondary">Context:</span>
                <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-white border border-white/10">
                    {activeContext.type === 'node' ? '📦' : activeContext.type === 'file' ? '📄' : '🧠'} {activeContext.label}
                </span>
                <button onClick={handleClearContext} className="text-glass-text-secondary hover:text-white">✕</button>
                <div className="flex gap-1 ml-auto overflow-x-auto max-w-[200px]">
                    {contextActions.map((action, i) => (
                        <button key={i} onClick={(e) => handleSend(e, action)} className="text-[9px] bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded text-slate-300 border border-white/5 whitespace-nowrap">
                            {action}
                        </button>
                    ))}
                </div>
            </div>
        )}
        <form onSubmit={(e) => handleSend(e)} className="relative">
            <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isCouncilMode ? "Pose a topic for debate..." : useLocalModel ? "Ask local model..." : `Ask ${activePersona.name}...`}
                className="w-full bg-[#0f172a] text-white rounded-xl border border-glass-border pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all placeholder-glass-text-secondary"
            />
            <button 
                type="submit" 
                disabled={!input.trim() || isTyping}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
        </form>
      </div>
    </div>
  );
};

export default ArchitectChat;
