import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Search, Plus, ChevronDown, LayoutList } from 'lucide-react';

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

  return (
    <div className={`bg-black transition-all ${isSidebarExpanded ? "w-64" : "w-20"} p-6`}>

      {/* Main minimize button and Plus button horizontally placed */}
      <div className="flex items-center justify-between">
        <button onClick={toggleSidebar} className="p-2 hover:bg-gray-800 rounded-lg flex items-center">
          {isSidebarExpanded ? (
            <LayoutList className="h-5 w-5" />
          ) : (
            <LayoutList className="h-5 w-5" />
          )}
          {isSidebarExpanded && (
            <span className="text-sm font-semibold ml-2">Your Library</span>
          )}
        </button>

        {/* Plus button placed next to the minimize button */}
        {isSidebarExpanded && (
          <button className="p-1 hover:bg-gray-800 rounded-full">
            <Plus className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      <div className="mt-6">
        {/* Search bar - only shown when expanded */}
        {isSidebarExpanded && (
          <div className="relative mb-4">
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

        {/* Combined Playlists - only shown when library is expanded */}
        <div className="mt-4 space-y-2">
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