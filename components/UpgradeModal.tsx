
import React from 'react';
import { useProject } from '../ProjectContext';

interface UpgradeModalProps {
  onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose }) => {
  const { dispatch } = useProject();

  const handleUpgrade = (tier: 'Pro' | 'Enterprise') => {
      // Simulate API call to Stripe
      setTimeout(() => {
          dispatch({ type: 'UPGRADE_TIER', payload: tier });
          alert(`Welcome to ${tier}! You now have unlimited access.`);
          onClose();
      }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-5xl">
            <div className="text-center mb-10">
                <h2 className="text-4xl font-black text-white mb-4">Unlock the Full Architect</h2>
                <p className="text-xl text-blue-200">Scale your vision with unlimited blueprints and cloud intelligence.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Free Tier */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-8 flex flex-col items-center text-center opacity-70 scale-95">
                    <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest mb-2">Starter</h3>
                    <div className="text-3xl font-black text-white mb-6">$0<span className="text-sm font-normal text-slate-500">/mo</span></div>
                    
                    <ul className="space-y-4 text-sm text-slate-300 mb-8 flex-grow">
                        <li>1 Active Project</li>
                        <li>Local Intelligence (WebLLM) Only</li>
                        <li>Basic Export (JSON)</li>
                        <li>Community Support</li>
                    </ul>

                    <button 
                        className="w-full py-3 rounded-xl border border-slate-600 text-slate-400 font-bold text-sm cursor-default"
                        disabled
                    >
                        Current Plan
                    </button>
                </div>

                {/* Pro Tier - Highlighted */}
                <div className="bg-gradient-to-b from-brand-primary/20 to-slate-900 border border-brand-primary rounded-3xl p-8 flex flex-col items-center text-center shadow-[0_0_50px_rgba(79,70,229,0.3)] relative transform scale-105 z-10">
                    <div className="absolute top-0 -translate-y-1/2 bg-brand-primary text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full tracking-wider shadow-lg">
                        Most Popular
                    </div>
                    <h3 className="text-xl font-bold text-brand-secondary uppercase tracking-widest mb-2">Professional</h3>
                    <div className="text-4xl font-black text-white mb-6">$20<span className="text-sm font-normal text-slate-400">/mo</span></div>
                    
                    <ul className="space-y-4 text-sm text-white mb-8 flex-grow">
                        <li className="flex items-center gap-2 justify-center"><span className="text-green-400">✓</span> Unlimited Projects</li>
                        <li className="flex items-center gap-2 justify-center"><span className="text-green-400">✓</span> Cloud Architect (Gemini 2.0)</li>
                        <li className="flex items-center gap-2 justify-center"><span className="text-green-400">✓</span> Cloud Sync & Backup</li>
                        <li className="flex items-center gap-2 justify-center"><span className="text-green-400">✓</span> Git Integration</li>
                        <li className="flex items-center gap-2 justify-center"><span className="text-green-400">✓</span> Full Export Bundle</li>
                    </ul>

                    <button 
                        onClick={() => handleUpgrade('Pro')}
                        className="w-full py-4 bg-brand-primary hover:bg-brand-secondary text-white font-bold text-lg rounded-xl shadow-lg transition-all transform hover:scale-[1.02]"
                    >
                        Upgrade to Pro
                    </button>
                </div>

                {/* Team Tier */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-8 flex flex-col items-center text-center scale-95">
                    <h3 className="text-xl font-bold text-purple-400 uppercase tracking-widest mb-2">Team</h3>
                    <div className="text-3xl font-black text-white mb-6">$50<span className="text-sm font-normal text-slate-500">/mo</span></div>
                    
                    <ul className="space-y-4 text-sm text-slate-300 mb-8 flex-grow">
                        <li>Everything in Pro</li>
                        <li>Shared Workspaces</li>
                        <li>Role-Based Access (RBAC)</li>
                        <li>Priority Support</li>
                        <li>Audit Logs</li>
                    </ul>

                    <button 
                        onClick={() => handleUpgrade('Enterprise')}
                        className="w-full py-3 bg-slate-800 hover:bg-purple-900/30 border border-slate-600 hover:border-purple-500 text-white font-bold text-sm rounded-xl transition-all"
                    >
                        Contact Sales
                    </button>
                </div>

            </div>

            <div className="text-center mt-10">
                <button onClick={onClose} className="text-sm text-slate-500 hover:text-white underline">
                    Maybe later
                </button>
            </div>
        </div>
    </div>
  );
};

export default UpgradeModal;
