
import React, { useState, useEffect, useRef } from 'react';
import { LocalIntelligence } from '../LocalIntelligence';
import { useProject } from '../ProjectContext';
import ModelManager from './ModelManager';
import { exportWorkspaceBackup, importWorkspaceBackup } from '../utils/exportService';
import { cloudStorage } from '../utils/cloudStorage';
import { ghSync } from '../utils/githubSync';
import { useToast } from './Toast';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { state, dispatch } = useProject();
  const { addToast } = useToast();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'general' | 'intelligence' | 'cloud' | 'github' | 'billing'>('general');

  const [dataUsage, setDataUsage] = useState<string>('Calculating...');
  const [fineTuningOptIn, setFineTuningOptIn] = useState(localStorage.getItem('0relai-opt-in') === 'true');
  const [gpuStatus, setGpuStatus] = useState<{ supported: boolean; message?: string }>({ supported: true });
  const [isBackingUp, setIsBackingUp] = useState(false);
  
  // Cloud Settings
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [isTestingCloud, setIsTestingCloud] = useState(false);

  // GitHub Settings
  const [ghToken, setGhToken] = useState('');
  const [ghUser, setGhUser] = useState<any>(null);
  
  const engine = LocalIntelligence.getInstance();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    estimateStorage();
    checkGpu();
    loadCloudConfig();
    loadGhConfig();
  }, []);

  const loadCloudConfig = () => {
      const config = cloudStorage.getConfig();
      if (config.type === 'supabase') {
          setCloudEnabled(true);
          setSbUrl(config.supabaseUrl || '');
          setSbKey(config.supabaseKey || '');
      }
  };

  const loadGhConfig = async () => {
      const token = ghSync.getToken();
      if (token) {
          setGhToken(token);
          try {
              const user = await ghSync.getUser();
              setGhUser(user);
          } catch (e) {
              console.warn("Invalid GH token");
          }
      }
  };

  const handleSaveGh = async () => {
      if (!ghToken) return;
      ghSync.setToken(ghToken);
      try {
          const user = await ghSync.getUser();
          setGhUser(user);
          addToast(`Connected to GitHub as ${user.login}`, "success");
      } catch (e) {
          addToast("Invalid Personal Access Token", "error");
          setGhUser(null);
      }
  };

  const checkGpu = async () => {
      const status = await engine.checkCompatibility();
      setGpuStatus(status);
  };

  const estimateStorage = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      if (usage > 1024 * 1024) {
        setDataUsage(`${(usage / (1024 * 1024)).toFixed(2)} MB`);
      } else {
        setDataUsage(`${(usage / 1024).toFixed(2)} KB`);
      }
    } else {
      setDataUsage('Unknown');
    }
  };

  const handleClearCache = async () => {
    if (window.confirm("This will clear all locally saved projects. This action cannot be undone. Are you sure?")) {
      localStorage.clear();
      alert("Local cache cleared. Please refresh the page.");
      window.location.reload();
    }
  };

  const toggleOptIn = () => {
    const newVal = !fineTuningOptIn;
    setFineTuningOptIn(newVal);
    localStorage.setItem('0relai-opt-in', newVal.toString());
  };

  const handleBackup = async () => {
      setIsBackingUp(true);
      try {
          const blob = await exportWorkspaceBackup();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `0relai-workspace-backup-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addToast("Workspace backup downloaded.", "success");
      } catch (e) {
          addToast("Backup failed.", "error");
      } finally {
          setIsBackingUp(false);
      }
  };

  const handleRestoreClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!confirm("This will merge the backup with your current projects. Duplicate IDs will be skipped. Continue?")) return;

      try {
          const result = await importWorkspaceBackup(file);
          alert(`Restored ${result.projects} projects and ${result.templates} templates. Reloading...`);
          window.location.reload();
      } catch (err) {
          addToast("Failed to restore backup. Invalid file.", "error");
      }
      
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveCloud = async () => {
      setIsTestingCloud(true);
      if (cloudEnabled) {
          if (!sbUrl || !sbKey) {
              addToast("Supabase URL and Key are required.", "error");
              setIsTestingCloud(false);
              return;
          }
          const success = await cloudStorage.testConnection(sbUrl, sbKey);
          if (success) {
              cloudStorage.setConfig({ type: 'supabase', supabaseUrl: sbUrl, supabaseKey: sbKey });
              addToast("Connected to Supabase! Syncing...", "success");
              // Trigger a project list refresh
              const projects = await cloudStorage.listProjects();
              dispatch({ type: 'SYNC_PROJECTS_LIST', payload: projects });
          } else {
              addToast("Connection failed. Check URL/Key/CORS.", "error");
          }
      } else {
          cloudStorage.setConfig({ type: 'local' });
          addToast("Switched to Local Storage.", "info");
      }
      setIsTestingCloud(false);
  };

  const handleUpgradeClick = () => {
      dispatch({ type: 'TRIGGER_UPGRADE_MODAL', payload: true });
      onClose();
  };

  const isPlatformAuth = !!state.user;
  const currentTier = state.userProfile?.tier || 'Free';
  const projectsUsed = state.userProfile?.projectsUsed || state.projectsList.length;
  const projectsLimit = state.userProfile?.projectsLimit || 1;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-[#0f172a] border border-glass-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-6 border-b border-glass-border flex justify-between items-center bg-slate-900/50">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>⚙️</span> System Settings
                </h3>
                <button onClick={onClose} className="text-glass-text-secondary hover:text-white">✕</button>
            </div>

            <div className="flex border-b border-glass-border bg-slate-900/30 overflow-x-auto">
                {['general', 'intelligence', 'cloud', 'github', 'billing'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 min-w-[80px] py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === tab ? 'text-white border-b-2 border-brand-primary' : 'text-slate-500 hover:text-white'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-grow">
                
                {activeTab === 'general' && (
                    <section className="space-y-6">
                        <div className="bg-brand-primary/10 rounded-xl p-4 border border-brand-primary/20">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-lg">📦</span>
                                <div>
                                    <h5 className="text-sm font-bold text-white">Workspace Backup</h5>
                                    <p className="text-xs text-blue-200">Export all projects and templates.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleBackup}
                                    disabled={isBackingUp}
                                    className="flex-1 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    {isBackingUp ? 'Exporting...' : '⬇ Export All'}
                                </button>
                                <button 
                                    onClick={handleRestoreClick}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    ⬆ Restore
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".json" 
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-lg">💾</div>
                                <div>
                                    <div className="text-sm font-bold text-white">Local Usage</div>
                                    <div className="text-xs text-brand-secondary font-mono">{dataUsage}</div>
                                </div>
                            </div>
                            <button 
                                onClick={handleClearCache}
                                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded transition-all border border-red-500/20"
                            >
                                Clear Data
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-white">Anonymous Telemetry</div>
                                <div className="text-xs text-slate-400 max-w-xs">
                                    Allow 0relai to use anonymous architectural patterns to improve future model performance.
                                </div>
                            </div>
                            <button 
                                onClick={toggleOptIn}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${fineTuningOptIn ? 'bg-brand-primary' : 'bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${fineTuningOptIn ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    </section>
                )}

                {activeTab === 'intelligence' && (
                    <section>
                        <h4 className="text-xs font-bold text-brand-secondary uppercase tracking-wider mb-4">WebGPU Engine</h4>
                        {!gpuStatus.supported ? (
                            <div className="mb-4 bg-red-900/20 border border-red-500/30 p-4 rounded-xl text-xs text-red-200 flex items-start gap-3">
                                <span className="text-lg">⚠️</span>
                                <div>
                                    <strong className="block mb-1">WebGPU Unavailable</strong>
                                    {gpuStatus.message}
                                    <br/><span className="opacity-70 mt-1 block">Use Chrome/Edge 113+ or enable flags.</span>
                                </div>
                            </div>
                        ) : (
                            <ModelManager />
                        )}
                    </section>
                )}

                {activeTab === 'cloud' && (
                    <section className="space-y-6">
                        {isPlatformAuth ? (
                            <div className="bg-brand-primary/10 border border-brand-primary/30 p-5 rounded-xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-2xl">🔐</span>
                                    <div>
                                        <h5 className="font-bold text-white">Managed Cloud Active</h5>
                                        <p className="text-xs text-blue-200">
                                            Signed in as <strong>{state.user.email}</strong>
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Platform authentication is active. Custom BYOB settings are currently disabled to prevent data conflicts. Your projects are automatically synced to the managed cloud.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 p-4 rounded-xl border border-green-500/20">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">☁️</span>
                                        <div>
                                            <h5 className="text-sm font-bold text-white">Supabase Sync (BYOB)</h5>
                                            <p className="text-xs text-green-200">Connect your own database</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setCloudEnabled(!cloudEnabled)}
                                        className={`w-12 h-6 rounded-full p-1 transition-colors ${cloudEnabled ? 'bg-green-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${cloudEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>

                                {cloudEnabled && (
                                    <div className="space-y-3 animate-fade-in">
                                        <div>
                                            <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Project URL</label>
                                            <input 
                                                value={sbUrl}
                                                onChange={(e) => setSbUrl(e.target.value)}
                                                className="w-full glass-input rounded-lg px-3 py-2 text-xs font-mono"
                                                placeholder="https://xyz.supabase.co"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Anon Key</label>
                                            <input 
                                                value={sbKey}
                                                onChange={(e) => setSbKey(e.target.value)}
                                                type="password"
                                                className="w-full glass-input rounded-lg px-3 py-2 text-xs font-mono"
                                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                            />
                                        </div>
                                        <div className="text-[10px] text-slate-400 bg-black/20 p-2 rounded">
                                            <strong>Prerequisites:</strong> Create a 'blueprints' table in Supabase with RLS enabled for public read/write.
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!isPlatformAuth && (
                            <button 
                                onClick={handleSaveCloud}
                                disabled={isTestingCloud}
                                className="w-full py-3 bg-brand-secondary hover:bg-brand-primary text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                            >
                                {isTestingCloud ? 'Verifying...' : 'Save & Connect'}
                            </button>
                        )}
                    </section>
                )}

                {activeTab === 'github' && (
                    <section className="space-y-6">
                        <div className="bg-[#161b22] border border-white/10 p-5 rounded-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                <div>
                                    <h5 className="font-bold text-white">GitHub Integration</h5>
                                    <p className="text-xs text-glass-text-secondary">Enable direct push and Pull Requests.</p>
                                </div>
                            </div>

                            {ghUser ? (
                                <div className="flex items-center justify-between bg-black/20 p-3 rounded-lg mb-4">
                                    <div className="flex items-center gap-2">
                                        <img src={ghUser.avatar_url} className="w-6 h-6 rounded-full" />
                                        <span className="text-sm text-white font-bold">{ghUser.login}</span>
                                    </div>
                                    <button 
                                        onClick={() => { setGhToken(''); setGhUser(null); ghSync.setToken(''); }}
                                        className="text-xs text-red-400 hover:text-white"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-glass-text-secondary uppercase block mb-1">Personal Access Token (Classic)</label>
                                        <input 
                                            value={ghToken}
                                            onChange={(e) => setGhToken(e.target.value)}
                                            type="password"
                                            className="w-full glass-input rounded-lg px-3 py-2 text-xs font-mono"
                                            placeholder="ghp_xxxxxxxxxxxx"
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Required scopes: <code>repo</code>
                                        </p>
                                    </div>
                                    <button 
                                        onClick={handleSaveGh}
                                        className="w-full py-2 bg-slate-700 hover:bg-white hover:text-black text-white font-bold rounded-lg transition-all text-xs"
                                    >
                                        Connect
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {activeTab === 'billing' && (
                    <section className="space-y-6">
                        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 p-5 rounded-xl border border-white/10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h5 className="font-bold text-white text-lg">Current Plan</h5>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${currentTier === 'Free' ? 'bg-slate-700 text-slate-300' : 'bg-brand-primary text-white'}`}>
                                        {currentTier}
                                    </span>
                                </div>
                                {currentTier === 'Free' && (
                                    <button 
                                        onClick={handleUpgradeClick}
                                        className="bg-brand-primary hover:bg-brand-secondary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg transition-all"
                                    >
                                        Upgrade to Pro
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs text-glass-text-secondary mb-1">
                                        <span>Active Projects</span>
                                        <span>{projectsUsed} / {projectsLimit === -1 ? '∞' : projectsLimit}</span>
                                    </div>
                                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500" 
                                            style={{ width: `${Math.min(100, (projectsUsed / (projectsLimit === -1 ? 100 : projectsLimit)) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                
                                {currentTier === 'Free' && (
                                    <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded-lg text-xs text-yellow-200">
                                        Upgrade to create unlimited projects and use Cloud AI features.
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* Footer */}
                <div className="text-center pt-2">
                    <p className="text-xs text-glass-text-secondary">
                        0relai v3.3.0 (Hybrid Intelligence)<br/>
                        Built with Gemini 2.0 & WebLLM
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SettingsModal;
