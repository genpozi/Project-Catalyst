
import React, { useState } from 'react';
import { useProject } from '../ProjectContext';
import { OrganizationMember } from '../types';
import { useToast } from './Toast';

interface OrganizationModalProps {
  onClose: () => void;
}

const OrganizationModal: React.FC<OrganizationModalProps> = ({ onClose }) => {
  const { state, dispatch, currentRole } = useProject();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'members' | 'settings' | 'audit'>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationMember['role']>('Member');

  const currentOrg = state.currentOrg;
  const isAdmin = currentRole === 'Admin' || currentRole === 'Owner';

  if (!currentOrg) return null;

  const handleInvite = (e: React.FormEvent) => {
      e.preventDefault();
      if (!inviteEmail) return;
      
      if (currentOrg.members.some(m => m.email === inviteEmail)) {
          addToast("User is already in the organization.", "warning");
          return;
      }

      dispatch({ type: 'ADD_ORG_MEMBER', payload: { email: inviteEmail, role: inviteRole } });
      setInviteEmail('');
      addToast(`Invitation sent to ${inviteEmail}`, "success");
  };

  const handleRemoveMember = (userId: string) => {
      if (confirm("Are you sure you want to remove this member?")) {
          dispatch({ type: 'REMOVE_ORG_MEMBER', payload: userId });
          addToast("Member removed", "info");
      }
  };

  const handleUpdateRole = (userId: string, newRole: string) => {
      dispatch({ type: 'UPDATE_ORG_MEMBER', payload: { userId, role: newRole as any } });
      addToast("Role updated", "success");
  };

  const handleExportAudit = () => {
      const logs = currentOrg.auditLogs || [];
      const csv = ['ID,Timestamp,Actor,Action,Target,Severity'].join(',') + '\n' +
          logs.map(l => `${l.id},"${new Date(l.timestamp).toISOString()}","${l.actorName}","${l.action}","${l.target}","${l.severity}"`).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${currentOrg.name}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-[#0f172a] border border-glass-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            
            <div className="p-6 border-b border-glass-border bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-secondary to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-inner">
                        {currentOrg.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">{currentOrg.name}</h3>
                        <p className="text-xs text-glass-text-secondary">Organization Settings</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-glass-text-secondary hover:text-white">✕</button>
            </div>

            <div className="flex border-b border-glass-border bg-slate-900/30">
                <button 
                    onClick={() => setActiveTab('members')}
                    className={`px-6 py-3 text-sm font-bold transition-all ${activeTab === 'members' ? 'text-white border-b-2 border-brand-primary bg-white/5' : 'text-slate-500 hover:text-white'}`}
                >
                    Team Members
                </button>
                {isAdmin && (
                    <>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`px-6 py-3 text-sm font-bold transition-all ${activeTab === 'settings' ? 'text-white border-b-2 border-brand-primary bg-white/5' : 'text-slate-500 hover:text-white'}`}
                        >
                            Settings
                        </button>
                        <button 
                            onClick={() => setActiveTab('audit')}
                            className={`px-6 py-3 text-sm font-bold transition-all ${activeTab === 'audit' ? 'text-white border-b-2 border-brand-primary bg-white/5' : 'text-slate-500 hover:text-white'}`}
                        >
                            Audit Logs
                        </button>
                    </>
                )}
            </div>

            <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">
                
                {activeTab === 'members' && (
                    <div className="space-y-8">
                        {isAdmin && (
                            <div className="bg-brand-primary/10 border border-brand-primary/20 p-5 rounded-xl">
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <span>✉️</span> Invite New Member
                                </h4>
                                <form onSubmit={handleInvite} className="flex gap-2">
                                    <input 
                                        type="email" 
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="colleague@company.com"
                                        className="flex-grow glass-input rounded-lg px-3 py-2 text-sm"
                                        required
                                    />
                                    <select 
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value as any)}
                                        className="glass-input rounded-lg px-3 py-2 text-sm bg-slate-800"
                                    >
                                        <option value="Admin">Admin</option>
                                        <option value="Member">Member</option>
                                        <option value="Viewer">Viewer</option>
                                    </select>
                                    <button type="submit" className="bg-brand-primary hover:bg-brand-secondary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all">
                                        Send Invite
                                    </button>
                                </form>
                            </div>
                        )}

                        <div>
                            <h4 className="text-xs font-bold text-glass-text-secondary uppercase mb-3">Active Members ({currentOrg.members.length})</h4>
                            <div className="space-y-2">
                                {currentOrg.members.map((member) => (
                                    <div key={member.userId} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm">
                                                {member.avatar || member.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                                    {member.email.split('@')[0]}
                                                    {member.userId === currentOrg.ownerId && <span className="text-[9px] bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded uppercase">Owner</span>}
                                                    {member.status === 'pending' && <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded uppercase">Pending</span>}
                                                </div>
                                                <div className="text-xs text-glass-text-secondary">{member.email}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            {isAdmin && member.userId !== currentOrg.ownerId ? (
                                                <>
                                                    <select 
                                                        value={member.role}
                                                        onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                                                        className="bg-black/20 text-xs text-white rounded px-2 py-1 border border-white/10 focus:outline-none focus:border-brand-primary"
                                                    >
                                                        <option value="Admin">Admin</option>
                                                        <option value="Member">Member</option>
                                                        <option value="Viewer">Viewer</option>
                                                    </select>
                                                    <button 
                                                        onClick={() => handleRemoveMember(member.userId)}
                                                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                                                        title="Remove Member"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-500 italic px-3">{member.role}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && isAdmin && (
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
                            <label className="text-xs font-bold text-glass-text-secondary uppercase block mb-2">Organization Name</label>
                            <input 
                                value={currentOrg.name}
                                disabled
                                className="w-full glass-input rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                            />
                            <p className="text-xs text-slate-500 mt-2">Renaming organizations is disabled in this preview.</p>
                        </div>

                        <div className="bg-red-900/10 p-5 rounded-xl border border-red-500/20">
                            <h4 className="text-sm font-bold text-red-400 mb-2">Danger Zone</h4>
                            <p className="text-xs text-slate-400 mb-4">Deleting an organization is permanent and will remove all associated projects and team data.</p>
                            <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-xs font-bold rounded-lg transition-all border border-red-500/30">
                                Delete Organization
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && isAdmin && (
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <span>📜</span> Activity Log
                            </h4>
                            <button 
                                onClick={handleExportAudit}
                                className="text-xs bg-slate-800 hover:bg-white/10 text-white px-3 py-1.5 rounded border border-white/10 flex items-center gap-2"
                            >
                                <span>⬇</span> Export CSV
                            </button>
                        </div>
                        
                        <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden flex-grow">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900 text-[10px] uppercase font-bold text-glass-text-secondary">
                                    <tr>
                                        <th className="p-3">Actor</th>
                                        <th className="p-3">Action</th>
                                        <th className="p-3">Target</th>
                                        <th className="p-3 text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs text-slate-300">
                                    {(currentOrg.auditLogs || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-500 italic">No audit records found.</td>
                                        </tr>
                                    ) : (
                                        (currentOrg.auditLogs || []).sort((a,b) => b.timestamp - a.timestamp).map(log => (
                                            <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="p-3 font-medium text-white">{log.actorName}</td>
                                                <td className="p-3">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                                        log.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                                                        log.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-mono text-slate-400">{log.target}</td>
                                                <td className="p-3 text-right text-slate-500">
                                                    {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default OrganizationModal;
