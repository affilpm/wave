import React, { useState } from 'react';
import { Search, Plus, Library, Heart } from 'lucide-react';

const Sidebar = ({ isSidebarExpanded, toggleSidebar }) => {
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

  const playlists = [
    { 
      name: 'Liked Songs', 
      icon: <Heart className="h-6 w-6" />, 
      image: null,
      gradient: 'bg-gradient-to-br from-indigo-600 to-indigo-900'
    },
    { 
      name: 'My Playlist #1', 
      icon: null, 
      image: "/api/placeholder/40/40"
    },
    { 
      name: 'Driving Mix', 
      icon: null, 
      image: "/api/placeholder/40/40"
    },
    { 
      name: 'Chill Vibes', 
      icon: null, 
      image: "/api/placeholder/40/40"
    }
  ];

  const LibraryIcon = () => (
    <svg 
      viewBox="0 0 24 24" 
      className={`h-6 w-6 ${isSidebarExpanded ? 'mr-2' : ''}`}
      fill="currentColor"
    >
      <path d="M3 22V4c0-.55.45-1 1-1h16c.55 0 1 .45 1 1v18l-9-4.55L3 22Z"/>
    </svg>
  );

  const MinimizedLibraryIcon = () => (
    <svg 
      viewBox="0 0 24 24" 
      className="h-6 w-6"
      fill="currentColor"
    >
      <path d="M3 22V4c0-.55.45-1 1-1h16c.55 0 1 .45 1 1v18l-9-4.55L3 22Zm8-12h6v-2h-6v2Zm0 4h6v-2h-6v2Zm0-8h6V4h-6v2Z"/>
    </svg>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6">
        {/* Library header with dynamic icons */}
        <div className="flex items-center justify-between">
          <button 
            onClick={toggleSidebar} 
            className="flex items-center p-2 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors"
          >
            {isSidebarExpanded ? <LibraryIcon /> : <MinimizedLibraryIcon />}
            {isSidebarExpanded && (
              <span className="text-sm font-semibold">Your Library</span>
            )}
          </button>

          {isSidebarExpanded && (
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                <Plus className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Search bar - only shown when expanded */}
        {isSidebarExpanded && (
          <div className="relative mt-4">
            <div className="absolute inset-y-0 left-2 flex items-center">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={librarySearchQuery}
              onChange={(e) => setLibrarySearchQuery(e.target.value)}
              placeholder="Search in Your Library"
              className="w-full bg-gray-800 text-sm text-white pl-8 pr-4 py-1.5 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white"
            />
          </div>
        )}
      </div>

      {/* Scrollable playlist area */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-2">
          {playlists.map((playlist, index) => (
            <div
              key={index}
              className="flex items-center gap-3 text-gray-400 hover:text-white cursor-pointer group"
            >
              {playlist.icon ? (
                <div className={`w-12 h-12 flex items-center justify-center rounded ${playlist.gradient}`}>
                  {playlist.icon}
                </div>
              ) : (
                <img 
                  src={playlist.image} 
                  alt={playlist.name}
                  className="w-12 h-12 rounded object-cover"
                />
              )}
              {isSidebarExpanded && (
                <span className="text-sm truncate">{playlist.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;