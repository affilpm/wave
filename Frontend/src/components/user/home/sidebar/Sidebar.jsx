import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Library, Heart, Music, ChevronLeft, MoreVertical, Share2, Delete, Edit } from 'lucide-react';
import CreatePlaylistModal from '../playlist/CreatePlaylistModal';
import api from '../../../../api';
import YourPlaylistSection from './YourPlaylistSection';
import SavedPlaylistSection from './SavedPlaylistSection';

const Sidebar = ({ isSidebarExpanded, toggleSidebar }) => {
  // State for managing the search query in the library
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

  // State for managing user's own playlists (including "Liked Songs")
  const [ownPlaylists, setOwnPlaylists] = useState([
    { 
      name: 'Liked Songs', 
      icon: <Heart className="h-6 w-6" />, 
      image: null,
      gradient: 'bg-gradient-to-br from-purple-600 to-purple-900',
      songCount: 123,
      type: 'Playlist'
    }
  ]);

  // State for managing playlists added to the library
  const [libraryPlaylists, setLibraryPlaylists] = useState([]);

  // State for modal visibility (create playlist)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Loading and error state for playlist fetching
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // Fetch playlists (user's own and library playlists) on component mount
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        // Fetch user's own playlists
        const ownPlaylistsResponse = await api.get('/api/playlist/playlists/');
        const formattedOwnPlaylists = ownPlaylistsResponse.data.map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          icon: null,
          image: playlist.cover_photo || "/api/placeholder/40/40", // Use a placeholder if no cover photo
          songCount: playlist.tracks?.length || 0, // Number of tracks in the playlist
          type: 'Playlist', // Type of playlist
          description: playlist.description, // Playlist description
          is_public: playlist.is_public // Public or private status
        }));
        console.log('dsfds', ownPlaylistsResponse.data)
        // Fetch playlists added to the library
        const libraryPlaylistsResponse = await api.get('/api/library/playlists/');
        const formattedLibraryPlaylists = libraryPlaylistsResponse.data.map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          icon: null,
          image: playlist.cover_photo || "/api/placeholder/40/40",
          songCount: playlist.tracks?.length || 0,
          type: 'Added Playlist', // Differentiates library playlists
          description: playlist.description,
          is_public: playlist.is_public
        }));

        // Update state with fetched playlists
        setOwnPlaylists(prevPlaylists => [
          prevPlaylists[0], // Keep the "Liked Songs" playlist
          ...formattedOwnPlaylists
        ]);
        setLibraryPlaylists(formattedLibraryPlaylists);
      } catch (err) {
        console.error('Error fetching playlists:', err);
        setError('Failed to load playlists'); // Handle fetch errors
      } finally {
        setIsLoading(false); // Stop the loading spinner
      }
    };

    fetchPlaylists();
  }, []);

  // Handle the creation of a new playlist
  const handleCreatePlaylist = (newPlaylist) => {
    setOwnPlaylists(prevPlaylists => [...prevPlaylists, {
      id: newPlaylist.id,
      name: newPlaylist.name,
      icon: null,
      image: newPlaylist.cover_photo || "/api/placeholder/40/40",
      songCount: 0,
      type: 'Playlist',
      description: newPlaylist.description,
      is_public: newPlaylist.is_public
    }]);
  };

  // Filter playlists based on the search query
  const filteredOwnPlaylists = ownPlaylists.filter(playlist =>
    playlist.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );
  const filteredLibraryPlaylists = libraryPlaylists.filter(playlist =>
    playlist.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );

  // Handle navigation to a specific playlist
  const handlePlaylistClick = (playlistId) => {
    navigate(`/playlist/${playlistId}`);
  };

  // Handle updates to a playlist
  const handlePlaylistUpdate = (updatedPlaylist) => {
    setOwnPlaylists(prevPlaylists => 
      prevPlaylists.map(playlist => 
        playlist.id === updatedPlaylist.id ? {
          ...playlist,
          name: updatedPlaylist.name,
          description: updatedPlaylist.description,
          image: updatedPlaylist.cover_photo || playlist.image,
          is_public: updatedPlaylist.is_public
        } : playlist
      )
    );
  };

  // Handle deletion of a playlist
  const handlePlaylistDelete = (playlistId) => {
    setOwnPlaylists(prevPlaylists => 
      prevPlaylists.filter(playlist => playlist.id !== playlistId)
    );
    navigate('/home'); // Redirect after deletion
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

      {/* Playlist Lists */}
      <div className="flex-1 overflow-y-auto px-2 scrollbar-hidden">
        {isLoading ? (
          <div className="text-gray-400 text-center py-4">Loading playlists...</div>
        ) : error ? (
          <div className="text-red-400 text-center py-4">{error}</div>
        ) : (
          <>
            {/* Section for user-created playlists */}
            <YourPlaylistSection 
              title="Your Playlists" 
              playlists={filteredOwnPlaylists}
              isSidebarExpanded={isSidebarExpanded}
              onPlaylistClick={handlePlaylistClick}
              onPlaylistUpdate={handlePlaylistUpdate}
              onPlaylistDelete={handlePlaylistDelete}
            />
            {/* Section for library playlists */}
            {filteredLibraryPlaylists.length > 0 && (
              <SavedPlaylistSection
                playlists={filteredLibraryPlaylists}
                isSidebarExpanded={isSidebarExpanded}
                setLibraryPlaylists={setLibraryPlaylists}
              />
            )}
          </>
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