
import React, { useState } from 'react';
import { signInWithOtp } from '../utils/supabaseClient';
import { useToast } from './Toast';

interface AuthModalProps {
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { addToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    try {
      const { error } = await signInWithOtp(email);
      if (error) throw error;
      setSent(true);
      addToast('Magic link sent! Check your email.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0f172a] border border-glass-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-glass-border bg-slate-900/50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🔐</span> Architect Login
            </h3>
            <button onClick={onClose} className="text-glass-text-secondary hover:text-white">✕</button>
        </div>

        <div className="p-8">
            {sent ? (
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto text-3xl mb-4 border border-green-500/50">
                        ✉️
                    </div>
                    <h4 className="text-lg font-bold text-white">Check your email</h4>
                    <p className="text-sm text-blue-200">
                        We sent a magic link to <strong>{email}</strong>.<br/>
                        Click it to login.
                    </p>
                    <button 
                        onClick={onClose}
                        className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all text-sm"
                    >
                        Close
                    </button>
                </div>
            ) : (
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-xl">
                        <p className="text-xs text-blue-200">
                            Sign in to sync your blueprints to the cloud and access the 0relai ecosystem.
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-1">Email Address</label>
                        <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full glass-input rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-primary outline-none"
                            placeholder="architect@example.com"
                            required
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                <span>Sending Magic Link...</span>
                            </>
                        ) : (
                            <>
                                <span>Send Login Link</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </>
                        )}
                    </button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
