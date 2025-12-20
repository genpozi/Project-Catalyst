
import React, { useState, useEffect } from 'react';
import { RBACMatrix } from '../types';

interface VisualRBACProps {
  matrix?: RBACMatrix;
  onUpdate: (matrix: RBACMatrix) => void;
}

const VisualRBAC: React.FC<VisualRBACProps> = ({ matrix, onUpdate }) => {
  const [roles, setRoles] = useState<string[]>([]);
  const [resources, setResources] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<RBACMatrix['permissions']>([]);

  useEffect(() => {
    if (matrix) {
      setRoles(matrix.roles);
      setResources(matrix.resources);
      setPermissions(matrix.permissions);
    } else {
      // Defaults
      const defRoles = ['Admin', 'User', 'Guest'];
      const defResources = ['Users', 'Posts', 'Settings'];
      setRoles(defRoles);
      setResources(defResources);
      setPermissions([]);
      onUpdate({
          roles: defRoles,
          resources: defResources,
          permissions: []
      });
    }
  }, [matrix]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdate = (newRoles: string[], newResources: string[], newPerms: RBACMatrix['permissions']) => {
      setRoles(newRoles);
      setResources(newResources);
      setPermissions(newPerms);
      onUpdate({ roles: newRoles, resources: newResources, permissions: newPerms });
  };

  const addRole = () => {
      const name = prompt("Enter Role Name (e.g. Manager):");
      if (name && !roles.includes(name)) {
          handleUpdate([...roles, name], resources, permissions);
      }
  };

  const addResource = () => {
      const name = prompt("Enter Resource Name (e.g. Invoices):");
      if (name && !resources.includes(name)) {
          handleUpdate(roles, [...resources, name], permissions);
      }
  };

  const removeRole = (role: string) => {
      if(confirm(`Remove role ${role}?`)) {
          handleUpdate(roles.filter(r => r !== role), resources, permissions.filter(p => p.role !== role));
      }
  };

  const removeResource = (res: string) => {
      if(confirm(`Remove resource ${res}?`)) {
          handleUpdate(roles, resources.filter(r => r !== res), permissions.filter(p => p.resource !== res));
      }
  };

  const togglePermission = (role: string, resource: string, action: 'create' | 'read' | 'update' | 'delete') => {
      let existing = permissions.find(p => p.role === role && p.resource === resource);
      let newPerms = [...permissions];

      if (!existing) {
          existing = { role, resource, actions: [] };
          newPerms.push(existing);
      } else {
          // If we found it, we need to replace it in the array with a copy to maintain immutability
          newPerms = newPerms.map(p => p.role === role && p.resource === resource ? { ...p } : p);
          existing = newPerms.find(p => p.role === role && p.resource === resource)!;
      }

      if (existing.actions.includes(action)) {
          existing.actions = existing.actions.filter(a => a !== action);
      } else {
          existing.actions.push(action);
      }

      handleUpdate(roles, resources, newPerms);
  };

  const getActions = (role: string, resource: string) => {
      return permissions.find(p => p.role === role && p.resource === resource)?.actions || [];
  };

  return (
    <div className="flex flex-col h-[500px] bg-[#0b0e14] rounded-xl border border-white/5 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-slate-900/50 border-b border-white/5">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/30 flex items-center justify-center">
                    <span className="text-lg">🔐</span>
                </div>
                <div>
                    <h3 className="font-bold text-white text-sm">RBAC Matrix</h3>
                    <p className="text-[10px] text-glass-text-secondary">Define access control rules.</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={addRole} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded border border-white/10 transition-colors">+ Role</button>
                <button onClick={addResource} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded border border-white/10 transition-colors">+ Resource</button>
            </div>
        </div>

        {/* Matrix Grid */}
        <div className="flex-grow overflow-auto custom-scrollbar relative">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 sticky top-0 z-10">
                    <tr>
                        <th className="p-3 border-b border-r border-white/5 min-w-[150px] bg-slate-900 text-xs font-bold text-glass-text-secondary uppercase tracking-wider">
                            Resource \ Role
                        </th>
                        {roles.map(role => (
                            <th key={role} className="p-3 border-b border-white/5 min-w-[140px] text-center group">
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs font-bold text-white">{role}</span>
                                    <button onClick={() => removeRole(role)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 p-1 rounded">✕</button>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {resources.map(res => (
                        <tr key={res} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                            <td className="p-3 border-r border-white/5 bg-slate-900/30 text-xs font-bold text-brand-secondary font-mono flex justify-between items-center">
                                {res}
                                <button onClick={() => removeResource(res)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 p-1 rounded">✕</button>
                            </td>
                            {roles.map(role => {
                                const actions = getActions(role, res);
                                return (
                                    <td key={`${role}-${res}`} className="p-2 text-center">
                                        <div className="flex justify-center gap-1">
                                            {['create', 'read', 'update', 'delete'].map((action) => {
                                                const isActive = actions.includes(action as any);
                                                const letter = action.charAt(0).toUpperCase();
                                                let colorClass = '';
                                                if (isActive) {
                                                    if (action === 'create') colorClass = 'bg-green-500 text-black border-green-400';
                                                    else if (action === 'read') colorClass = 'bg-blue-500 text-black border-blue-400';
                                                    else if (action === 'update') colorClass = 'bg-yellow-500 text-black border-yellow-400';
                                                    else if (action === 'delete') colorClass = 'bg-red-500 text-black border-red-400';
                                                } else {
                                                    colorClass = 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500';
                                                }

                                                return (
                                                    <button
                                                        key={action}
                                                        onClick={() => togglePermission(role, res, action as any)}
                                                        className={`w-6 h-6 rounded text-[10px] font-bold border transition-all ${colorClass}`}
                                                        title={action}
                                                    >
                                                        {letter}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {resources.length === 0 && (
                <div className="text-center py-10 text-glass-text-secondary text-sm italic">
                    No resources defined. Add one to start defining permissions.
                </div>
            )}
        </div>
        
        {/* Legend */}
        <div className="p-3 border-t border-white/5 bg-slate-900/50 flex justify-center gap-4 text-[10px] text-glass-text-secondary">
            <div className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-sm"></span> Create</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-sm"></span> Read</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-sm"></span> Update</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-sm"></span> Delete</div>
        </div>
    </div>
  );
};

export default VisualRBAC;
