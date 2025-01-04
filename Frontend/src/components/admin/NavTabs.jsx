// components/NavTabs.js
import React from 'react';
import { Users, CheckCircle, Music } from 'lucide-react';

const NavTabs = ({ activeTab, setActiveTab }) => {
  return (
    <div className="border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-2 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'users' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="h-5 w-5" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('artist-verification')}
            className={`py-4 px-2 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'artist-verification' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CheckCircle className="h-5 w-5" />
            Artist Verification
          </button>
          <button
            onClick={() => setActiveTab('music-verification')}
            className={`py-4 px-2 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'music-verification' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Music className="h-5 w-5" />
            Music Verification
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavTabs;