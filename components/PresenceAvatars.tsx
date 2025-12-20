
import React from 'react';
import { PresenceUser } from '../types';

interface PresenceAvatarsProps {
  users: PresenceUser[];
  currentUserId?: string;
}

const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({ users, currentUserId }) => {
  // Filter unique users just in case, prioritize current user
  // Explicitly type the Map to ensure values are PresenceUser, avoiding 'unknown' type errors
  const uniqueUsers = Array.from(new Map<string, PresenceUser>(users.map(u => [u.id, u])).values());
  const displayUsers = uniqueUsers.slice(0, 4);
  const remaining = uniqueUsers.length - 4;

  return (
    <div className="flex items-center -space-x-2 mr-4">
      {displayUsers.map((user) => (
        <div 
            key={user.id} 
            className={`w-8 h-8 rounded-full border-2 border-[#0b0e14] flex items-center justify-center text-[10px] font-bold text-white relative group cursor-default transition-transform hover:-translate-y-1 ${user.id === currentUserId ? 'ring-2 ring-brand-secondary z-10' : ''}`}
            style={{ backgroundColor: user.color }}
            title={`${user.name} ${user.id === currentUserId ? '(You)' : ''}`}
        >
            {user.name.charAt(0).toUpperCase()}
            {/* Online Dot */}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#0b0e14] rounded-full"></div>
            
            {/* Tooltip */}
            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                {user.name} {user.id === currentUserId && '(You)'}
            </div>
        </div>
      ))}
      {remaining > 0 && (
          <div className="w-8 h-8 rounded-full border-2 border-[#0b0e14] bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold z-0">
              +{remaining}
          </div>
      )}
    </div>
  );
};

export default PresenceAvatars;
