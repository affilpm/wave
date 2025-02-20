import React, { useState } from 'react';
import { Camera, Edit2, Check, X } from 'lucide-react';

const Profile = () => {
  const [username, setUsername] = useState('John Doe');
  const [isEditing, setIsEditing] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);

  const handleSave = () => {
    setUsername(tempUsername);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempUsername(username);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="flex items-center gap-6">
          {/* Profile Image */}
          <div className="relative group">
            <div className="w-48 h-48 rounded-full bg-neutral-800 overflow-hidden shadow-xl">
              <img
                src="/api/placeholder/192/192"
                alt="Profile"
                className="w-full h-full object-cover"
              />
              <button className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera className="w-8 h-8" />
              </button>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-400">Profile</span>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 text-white text-5xl font-bold w-96 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter username"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleSave}
                    className="p-2 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <h1 className="text-5xl font-bold">{username}</h1>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 rounded-full hover:bg-neutral-800 transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="mt-4">
              <span className="text-sm text-neutral-400">2 Public Playlists • 47 Followers • 98 Following</span>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Public Playlists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-neutral-800 p-4 rounded-lg hover:bg-neutral-700 transition-colors cursor-pointer">
                <div className="aspect-square bg-neutral-900 rounded-md mb-4">
                  <img
                    src="/api/placeholder/160/160"
                    alt="Playlist"
                    className="w-full h-full object-cover rounded-md"
                  />
                </div>
                <h3 className="font-semibold truncate">My Playlist #{i}</h3>
                <p className="text-sm text-neutral-400 mt-1">12 songs</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;