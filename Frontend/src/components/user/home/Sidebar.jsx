import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { Search, Plus, Library, Heart, Music, ChevronLeft } from 'lucide-react';
import CreatePlaylistModal from './CreatePlaylistModal';
import api from '../../../api';

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
    }
  ]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate(); // Initialize useNavigate

  // Fetch user's playlists
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await api.get('/api/playlist/playlists/');
        
        // Transform API response to match our playlist format
        const formattedPlaylists = response.data.map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          icon: null,
          image: playlist.cover_photo || "/api/placeholder/40/40",
          songCount: playlist.tracks?.length || 0,
          type: 'Playlist',
          description: playlist.description,
          isPublic: playlist.is_public
        }));

        // Combine with Liked Songs and update state
        setPlaylists(prevPlaylists => [
          prevPlaylists[0], // Keep Liked Songs
          ...formattedPlaylists
        ]);
      } catch (err) {
        console.error('Error fetching playlists:', err);
        setError('Failed to load playlists');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  const handleCreatePlaylist = (newPlaylist) => {
    setPlaylists(prevPlaylists => [...prevPlaylists, {
      id: newPlaylist.id,
      name: newPlaylist.name,
      icon: null,
      image: newPlaylist.cover_photo || "/api/placeholder/40/40",
      songCount: 0,
      type: 'Playlist',
      description: newPlaylist.description,
      isPublic: newPlaylist.is_public
    }]);
  };

  // Filter playlists based on search query
  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );

  const handlePlaylistClick = (playlistId) => {
    navigate(`/playlist/${playlistId}`); // Navigate to the playlist page with the ID
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
        {isLoading ? (
          <div className="text-gray-400 text-center py-4">Loading playlists...</div>
        ) : error ? (
          <div className="text-red-400 text-center py-4">{error}</div>
        ) : (
          <div className={`space-y-1 ${isSidebarExpanded ? 'text-base' : 'text-xs'}`}>
            {filteredPlaylists.map((playlist) => (
              <div
                key={playlist.id || playlist.name}
                onClick={() => handlePlaylistClick(playlist.id)} // Pass the playlist ID on click
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
        )}
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