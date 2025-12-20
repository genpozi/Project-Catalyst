
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ProjectData } from '../types';
import { base64ToBytes, decodeAudioData, createPcmBlob } from '../utils/audio';

interface LiveArchitectProps {
  projectData: ProjectData;
  onClose: () => void;
}

const LiveArchitect: React.FC<LiveArchitectProps> = ({ projectData, onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
  const [isTalking, setIsTalking] = useState(false); // Model is talking
  const [volume, setVolume] = useState(0); // For visualization

  // Audio Context Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session Ref
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    startSession();
    return () => {
      activeRef.current = false;
      stopSession();
    };
  }, []);

  const getSystemInstruction = () => {
      const stack = projectData.architecture?.stack 
        ? `Frontend: ${projectData.architecture.stack.frontend}, Backend: ${projectData.architecture.stack.backend}, DB: ${projectData.architecture.stack.database}` 
        : 'Not yet decided';
      
      return `You are 0relai, an advanced voice-enabled software architect.
      User Project: "${projectData.name}"
      Idea: ${projectData.initialIdea}
      Current Tech Stack: ${stack}
      
      Your goal is to discuss the architecture, answer technical questions, and help brainstorm.
      Keep responses concise and conversational. Do not read out long code blocks, summarize them.
      Be enthusiastic and professional.
      `;
  };

  const startSession = async () => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        // Setup Audio Contexts
        inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        setStatus('connecting');

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: getSystemInstruction(),
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                }
            },
            callbacks: {
                onopen: () => {
                    if (!activeRef.current) return;
                    console.log('Live Session Open');
                    setStatus('connected');
                    setupAudioInput(sessionPromise);
                },
                onmessage: (msg: LiveServerMessage) => {
                    if (!activeRef.current) return;
                    handleServerMessage(msg);
                },
                onclose: () => {
                    console.log('Live Session Closed');
                    if (activeRef.current) setStatus('closed');
                },
                onerror: (e) => {
                    console.error('Live Session Error', e);
                    if (activeRef.current) setStatus('error');
                }
            }
        });
        
        sessionPromiseRef.current = sessionPromise;

    } catch (e) {
        console.error("Failed to start live session", e);
        setStatus('error');
    }
  };

  const setupAudioInput = async (sessionPromise: Promise<any>) => {
      if (!inputContextRef.current || !streamRef.current) return;

      const ctx = inputContextRef.current;
      const source = ctx.createMediaStreamSource(streamRef.current);
      sourceRef.current = source;

      // Use ScriptProcessor for raw PCM access (AudioWorklet is better but more complex to setup in single file)
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
          if (!activeRef.current) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Simple Volume Visualization
          let sum = 0;
          for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
          const rms = Math.sqrt(sum / inputData.length);
          // Only set volume if user is speaking (approx)
          if (!isTalking) setVolume(Math.min(rms * 5, 1)); 

          const pcmBlob = createPcmBlob(inputData);
          
          sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
          });
      };

      source.connect(processor);
      processor.connect(ctx.destination);
  };

  const handleServerMessage = async (message: LiveServerMessage) => {
      // Audio Output
      const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
      if (audioData && outputContextRef.current) {
          setIsTalking(true);
          
          // Visualize model volume (fake it based on chunk arrival)
          setVolume(Math.random() * 0.5 + 0.5);

          const ctx = outputContextRef.current;
          nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
          
          const audioBuffer = await decodeAudioData(
              base64ToBytes(audioData),
              ctx,
              24000
          );

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          
          source.onended = () => {
              scheduledSourcesRef.current.delete(source);
              if (scheduledSourcesRef.current.size === 0) {
                  setIsTalking(false);
                  setVolume(0);
              }
          };

          source.start(nextStartTimeRef.current);
          nextStartTimeRef.current += audioBuffer.duration;
          scheduledSourcesRef.current.add(source);
      }

      // Interruption Handling
      if (message.serverContent?.interrupted) {
          console.log("Model interrupted");
          scheduledSourcesRef.current.forEach(source => {
              try { source.stop(); } catch(e) {}
          });
          scheduledSourcesRef.current.clear();
          nextStartTimeRef.current = 0;
          setIsTalking(false);
          setVolume(0);
      }
  };

  const stopSession = () => {
      // Close Media Stream
      streamRef.current?.getTracks().forEach(track => track.stop());
      
      // Close Audio Contexts
      inputContextRef.current?.close();
      outputContextRef.current?.close();
      
      // Stop Processor
      if (processorRef.current && sourceRef.current) {
          sourceRef.current.disconnect();
          processorRef.current.disconnect();
      }

      // Close Gemini Session
      sessionPromiseRef.current?.then(session => session.close());
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className={`w-64 h-64 rounded-full bg-brand-primary blur-3xl transition-all duration-100 ease-linear`}
                 style={{ transform: `scale(${1 + volume})` }}></div>
        </div>

        <div className="flex-grow flex flex-col items-center justify-center z-10 p-8 text-center">
            
            {/* Avatar / Visualizer */}
            <div className="relative mb-10">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                    status === 'error' ? 'bg-red-900/20 border-red-500' :
                    status === 'connecting' ? 'bg-slate-800 animate-pulse border-slate-600' :
                    isTalking ? 'bg-brand-primary/20 border-brand-primary shadow-[0_0_50px_rgba(79,70,229,0.5)]' :
                    'bg-slate-800 border-white/20'
                } border-2`}>
                    <div className={`w-24 h-24 rounded-full bg-slate-950 flex items-center justify-center`}>
                        <span className="text-4xl">
                            {status === 'error' ? '⚠️' : 
                             status === 'connecting' ? '...' : 
                             isTalking ? '🧠' : '🎙️'}
                        </span>
                    </div>
                </div>
                
                {/* Ripples */}
                {status === 'connected' && (
                    <>
                        <div className={`absolute inset-0 rounded-full border border-brand-primary/30 animate-[ping_2s_linear_infinite] ${isTalking ? 'opacity-100' : 'opacity-0'}`}></div>
                        <div className={`absolute -inset-4 rounded-full border border-brand-primary/20 animate-[ping_2s_linear_infinite_1s] ${isTalking ? 'opacity-100' : 'opacity-0'}`}></div>
                    </>
                )}
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
                {status === 'connecting' && "Connecting to Architect..."}
                {status === 'connected' && (isTalking ? "Architect is speaking..." : "Listening...")}
                {status === 'error' && "Connection Failed"}
                {status === 'closed' && "Session Ended"}
            </h3>
            
            <p className="text-glass-text-secondary text-sm max-w-xs mx-auto mb-8">
                {status === 'connected' 
                    ? "Speak naturally. I can hear you and see your project context." 
                    : "Please wait while we establish a secure line."}
            </p>

            {status === 'error' && (
                <button 
                    onClick={() => { setStatus('connecting'); startSession(); }}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all mb-4"
                >
                    Retry Connection
                </button>
            )}
        </div>

        {/* Controls */}
        <div className="p-6 border-t border-glass-border bg-slate-900/50 flex justify-center z-20">
            <button 
                onClick={onClose}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                title="End Call"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    </div>
  );
};

export default LiveArchitect;
