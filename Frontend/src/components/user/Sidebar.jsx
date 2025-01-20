import React, { useState } from 'react';
import { Search, Plus, Library, Heart, Music, ChevronLeft, ChevronRight } from 'lucide-react';
import CreatePlaylistModal from './CreatePlaylistModal';

const Sidebar = ({ isSidebarExpanded, toggleSidebar }) => {
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [playlists, setPlaylists] = useState([
    { 
      name: 'Liked Songs', 
      icon: <Heart className="h-6 w-6" />, 
      image: null,
      gradient: 'bg-gradient-to-br from-purple-600 to-purple-900',
      songCount: 123,
      type: 'Playlist'
    },
    { 
      name: 'My Playlist #1', 
      icon: null, 
      image: "/api/placeholder/40/40",
      songCount: 45,
      type: 'Playlist'
    },
    { 
      name: 'Driving Mix', 
      icon: null, 
      image: "/api/placeholder/40/40",
      songCount: 67,
      type: 'Mix'
    },
    { 
      name: 'Chill Vibes', 
      icon: null, 
      image: "/api/placeholder/40/40",
      songCount: 89,
      type: 'Mix'
    }
  ]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreatePlaylist = (playlistName) => {
    setPlaylists([
      ...playlists,
      {
        name: playlistName,
        icon: null,
        image: "/api/placeholder/40/40",
        songCount: 0,
        type: 'Playlist'
      }
    ]);
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header Section */}
      <div className="flex-shrink-0 p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={toggleSidebar}
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors group w-full"
          >
            <div className="flex items-center">
              <Library className="h-6 w-6 flex-shrink-0" />
              {isSidebarExpanded && (
                <span className="ml-2 font-semibold">Your Library</span>
              )}
            </div>
            {isSidebarExpanded && (
              <ChevronLeft className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>

          {isSidebarExpanded && (
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>

        {isSidebarExpanded && (
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={librarySearchQuery}
              onChange={(e) => setLibrarySearchQuery(e.target.value)}
              placeholder="Search in Your Library"
              className="w-full bg-gray-900 text-sm text-white pl-10 pr-4 py-2 rounded-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
        )}
      </div>

      {/* Playlist List */}
      <div className="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 custom-scrollbar">
        <div className={`space-y-1 ${isSidebarExpanded ? 'text-base' : 'text-xs'}`}>
          {playlists.map((playlist, index) => (
            <div
              key={index}
              className="group"
            >
              <div className={`
                flex items-center gap-3 p-2 cursor-pointer rounded-md 
                hover:bg-white/10 transition-colors
                ${isSidebarExpanded ? 'text-gray-400 hover:text-white' : 'text-gray-500 justify-center'}
              `}>
                {playlist.icon ? (
                  <div
                    className={`flex items-center justify-center rounded-md ${
                      isSidebarExpanded
                        ? `w-12 h-12 ${playlist.gradient}`
                        : 'w-10 h-10 bg-gray-700'
                    }`}
                  >
                    {playlist.icon}
                  </div>
                ) : (
                  <img
                    src={playlist.image}
                    alt={playlist.name}
                    className={`rounded-md object-cover ${
                      isSidebarExpanded ? 'w-12 h-12' : 'w-10 h-10'
                    }`}
                  />
                )}
                {isSidebarExpanded && (
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate font-medium text-white">{playlist.name}</span>
                    <span className="text-sm text-gray-400 truncate">
                      {playlist.type} • {playlist.songCount} songs
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreatePlaylist={handleCreatePlaylist}
      />
    </div>
  );
};

export default Sidebar;