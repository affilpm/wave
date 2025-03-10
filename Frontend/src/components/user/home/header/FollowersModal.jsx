import React from 'react';
import { X } from 'lucide-react';

const FollowersModal = ({ isOpen, onClose, title, users }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-800 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto flex-1 p-2">
          {users.length === 0 ? (
            <div className="p-4 text-center text-neutral-400">
              {title === 'Followers' ? 'No followers yet' : 'Not following anyone yet'}
            </div>
          ) : (
            <ul>
              {users.map((follow) => {
                const user = follow.user || follow.artist?.user;
                return (
                  <li key={follow.id} className="p-2 hover:bg-neutral-700 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-600">
                        <img
                          src={user?.profile_photo || '/api/placeholder/40/40'}
                          alt={user?.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium">{user?.username}</p>
                        {follow.artist && (
                          <p className="text-xs text-green-400">Artist</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowersModal;