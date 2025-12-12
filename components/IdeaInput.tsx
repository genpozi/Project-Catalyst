
import React, { useState, useRef } from 'react';

interface IdeaInputProps {
  onSubmit: (idea: string, type: string, constraints: string, imageBase64?: string) => void;
  onAnalyzeAudio: (audioBase64: string) => Promise<{ idea: string; type: string; constraints: string } | null>;
  isAnalyzingAudio: boolean;
}

const IdeaInput: React.FC<IdeaInputProps> = ({ onSubmit, onAnalyzeAudio, isAnalyzingAudio }) => {
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

  return (
    <div className="animate-slide-in-up">
      <div className="flex flex-col items-start mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">New Project</h2>
        <p className="text-glass-text-secondary">Define the vision. We'll handle the architecture.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Row 1: Type & Voice */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7">
                <div className="bg-glass-surface rounded-2xl p-1 border border-glass-border flex flex-col">
                    <label className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider px-4 py-2">Project Type</label>
                    <div className="relative">
                        <select 
                            value={projectType}
                            onChange={(e) => setProjectType(e.target.value)}
                            className="w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none focus:bg-white/5 appearance-none text-lg font-medium cursor-pointer"
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
                    className={`w-full h-full rounded-2xl border border-glass-border flex items-center justify-center gap-3 transition-all relative overflow-hidden group ${
                        isRecording ? 'bg-red-500/10 border-red-500/50' : 'bg-glass-surface hover:bg-white/5'
                    }`}
                >
                    {isRecording && <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500 text-white' : 'bg-white/10 text-white group-hover:bg-brand-primary group-hover:scale-110 transition-all'}`}>
                         {isAnalyzingAudio ? (
                             <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                         ) : (
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                         )}
                    </div>
                    <span className={`font-semibold z-10 ${isRecording ? 'text-red-200' : 'text-glass-text'}`}>
                        {isAnalyzingAudio ? 'Analyzing...' : isRecording ? 'Stop & Analyze' : 'Record Idea'}
                    </span>
                </button>
            </div>
        </div>

        {/* Core Idea */}
        <div className="bg-glass-surface rounded-2xl p-1 border border-glass-border">
             <label className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider px-4 py-2 block">Core Concept</label>
             <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Describe your vision..."
                className="w-full h-32 bg-transparent text-white px-4 py-2 rounded-xl focus:outline-none focus:bg-white/5 resize-none text-lg leading-relaxed placeholder-white/20"
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
                    className="w-full h-24 bg-transparent text-white px-4 py-2 rounded-xl focus:outline-none focus:bg-white/5 resize-none leading-relaxed placeholder-white/20"
                />
            </div>

            <div 
                onClick={() => fileInputRef.current?.click()}
                className="bg-glass-surface rounded-2xl border border-glass-border border-dashed hover:border-brand-secondary/50 hover:bg-white/5 cursor-pointer transition-all flex flex-col items-center justify-center p-6 relative group"
            >
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                {imageBase64 ? (
                    <>
                        <img src={imageBase64} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-50 group-hover:opacity-30 transition-opacity" />
                        <div className="z-10 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md text-sm font-semibold text-white border border-white/10">Change Image</div>
                    </>
                ) : (
                    <>
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-glass-text-secondary group-hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                        <span className="text-glass-text-secondary group-hover:text-white text-sm font-medium">Attach Wireframe / Sketch</span>
                    </>
                )}
            </div>
        </div>

        <button
          type="submit"
          disabled={!idea.trim() || isAnalyzingAudio}
          className="w-full glass-button-primary text-white font-bold text-lg py-4 rounded-2xl transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Initialize Blueprint
        </button>
      </form>
    </div>
  );
};

export default IdeaInput;
