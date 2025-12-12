
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
        const result = reader.result as string;
        setImageBase64(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Chrome/Firefox standard
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64String = (reader.result as string).split(',')[1];
          
          // Send to parent for AI analysis
          const result = await onAnalyzeAudio(base64String);
          if (result) {
            setIdea(result.idea);
            if (result.type) setProjectType(result.type);
            if (result.constraints) setConstraints(result.constraints);
          }
        };
        
        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) {
      const pureBase64 = imageBase64 ? imageBase64.split(',')[1] : undefined;
      onSubmit(idea.trim(), projectType, constraints.trim(), pureBase64);
    }
  };

  return (
    <div className="text-center animate-slide-in-up">
      <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-4">Define Your Vision</h2>
      <p className="text-lg text-blue-200 mb-8 max-w-2xl mx-auto">
        Tell us about what you want to build. Type, upload a sketch, or just <strong className="text-brand-secondary">speak your mind</strong>.
      </p>
      
      <div className="max-w-3xl mx-auto mb-8 flex justify-center">
        {!isRecording ? (
           <button
             onClick={startRecording}
             disabled={isAnalyzingAudio}
             className="flex items-center gap-3 px-6 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-full transition-all transform hover:scale-105 shadow-lg group disabled:opacity-50"
           >
             <div className="bg-red-500 w-3 h-3 rounded-full animate-pulse group-hover:bg-red-400"></div>
             <span className="text-slate-200 font-semibold">{isAnalyzingAudio ? 'Analyzing Audio...' : 'Record Voice Memo'}</span>
           </button>
        ) : (
           <button
             onClick={stopRecording}
             className="flex items-center gap-3 px-6 py-3 bg-red-900/80 hover:bg-red-800 border border-red-500 rounded-full transition-all transform hover:scale-105 shadow-lg animate-pulse"
           >
             <div className="bg-white w-3 h-3 rounded-sm"></div>
             <span className="text-white font-bold">Stop Recording & Analyze</span>
           </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto text-left space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
            <label className="block text-brand-accent font-semibold mb-2">Project Type</label>
            <select 
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-brand-text focus:ring-2 focus:ring-brand-secondary focus:outline-none"
            >
                <option>Web Application</option>
                <option>Mobile App (iOS/Android)</option>
                <option>API / Backend Service</option>
                <option>CLI Tool</option>
                <option>Desktop Application</option>
                <option>Game</option>
                <option>AI/ML Model</option>
            </select>
            </div>
            
            <div>
               <label className="block text-brand-accent font-semibold mb-2">Context Image (Optional)</label>
               <div className="flex items-center gap-3">
                   <input 
                        type="file" 
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                   />
                   <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-3 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-300 rounded-lg w-full text-left flex items-center justify-between transition-colors"
                   >
                       <span className="truncate">{imageBase64 ? 'Image Attached' : 'Upload Sketch / Wireframe'}</span>
                       <span className="text-xl">📎</span>
                   </button>
               </div>
            </div>
        </div>

        {imageBase64 && (
            <div className="relative inline-block group">
                <img src={imageBase64} alt="Preview" className="h-32 rounded-lg border border-slate-600 shadow-lg object-cover" />
                <button 
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        )}

        <div>
          <label className="block text-brand-accent font-semibold mb-2">Core Idea</label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g., A platform connecting local farmers with restaurants using real-time inventory tracking..."
            className="w-full h-32 p-4 bg-slate-800 border border-slate-600 rounded-lg text-brand-text placeholder-slate-400 focus:ring-2 focus:ring-brand-secondary focus:outline-none transition-shadow"
            required
          />
        </div>

        <div>
           <label className="block text-brand-accent font-semibold mb-2">Technical Constraints & Preferences (Optional)</label>
           <textarea
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="e.g., Must use Supabase, prefer React over Vue, need to support offline mode..."
            className="w-full h-24 p-4 bg-slate-800 border border-slate-600 rounded-lg text-brand-text placeholder-slate-400 focus:ring-2 focus:ring-brand-secondary focus:outline-none transition-shadow"
           />
        </div>

        <button
          type="submit"
          disabled={!idea.trim() || isAnalyzingAudio}
          className="w-full mt-6 px-8 py-4 bg-brand-secondary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
        >
          Initialize Project Architecture
        </button>
      </form>
    </div>
  );
};

export default IdeaInput;
