import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Library, Heart, Music, ChevronLeft, MoreVertical, Share2, Delete, Edit } from 'lucide-react';
import CreatePlaylistModal from '../playlist/CreatePlaylistModal';
import api from '../../../../api';
import YourPlaylistSection from './YourPlaylistSection';
import SavedPlaylistSection from './SavedPlaylistSection';
import FollowedArtistsSection from './FollowedArtistsSection';

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
  
  // State for managing followed artists
  const [followedArtists, setFollowedArtists] = useState([]);

  // State for modal visibility (create playlist)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Loading and error state for playlist fetching
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user's own playlists
        const ownPlaylistsResponse = await api.get('/api/playlist/playlist_data/');
        // First, remove "Liked Songs" from the response data if it exists
        const regularPlaylists = ownPlaylistsResponse.data.filter(
          playlist => playlist.name !== 'Liked Songs'
        );

        // Format regular playlists
        const formattedOwnPlaylists = regularPlaylists.map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          icon: null,
          image: playlist.cover_photo || "/api/placeholder/40/40",
          songCount: playlist.tracks?.length || 0,
          type: 'Playlist',
          description: playlist.description,
          is_public: playlist.is_public
        }));
  
        // Find and format Liked Songs playlist if it exists
        const likedSongsPlaylist = ownPlaylistsResponse.data.find(
          playlist => playlist.name === 'Liked Songs'
        );
  
        if (likedSongsPlaylist) {
          const likedSongs = {
            id: likedSongsPlaylist.id,
            name: 'Liked Songs',
            icon: <Heart className="h-6 w-6" />,
            image: likedSongsPlaylist.cover_photo || "/api/placeholder/40/40",
            songCount: likedSongsPlaylist.tracks?.length || 0,
            type: 'Playlist',
            description: likedSongsPlaylist.description,
            is_public: likedSongsPlaylist.is_public,
          };
          
          setOwnPlaylists([likedSongs, ...formattedOwnPlaylists]);
        } else {
          setOwnPlaylists(formattedOwnPlaylists);
        }

        // Fetch library playlists
        const libraryPlaylistsResponse = await api.get('/api/library/playlists/');
        
        const formattedLibraryPlaylists = libraryPlaylistsResponse.data.map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          icon: null,
          image: playlist.cover_photo || "/api/placeholder/40/40",
          songCount: playlist.tracks?.length || 0,
          type: 'Added Playlist',
          description: playlist.description,
          is_public: playlist.is_public
        }));
  
        setLibraryPlaylists(formattedLibraryPlaylists);
        
        // Fetch followed artists
        const followingResponse = await api.get('/api/artists/me/following/');
        console.log(followingResponse.data)
        if (followingResponse.data && Array.isArray(followingResponse.data)) {
          // Extract artist data from the follow relationships
          const artistsData = followingResponse.data.map(follow => follow.artist);
          setFollowedArtists(artistsData);
        }
  
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load library data');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchData();
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

  // Filter playlists and artists based on the search query
  const filteredOwnPlaylists = ownPlaylists.filter(playlist =>
    playlist.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );
  
  const filteredLibraryPlaylists = libraryPlaylists.filter(playlist =>
    playlist.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );
  
  const filteredFollowedArtists = followedArtists.filter(artist =>
    artist && artist.username && artist.username.toLowerCase().includes(librarySearchQuery.toLowerCase())
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

      {/* Library Content */}
      <div className="flex-1 overflow-y-auto px-2 scrollbar-hidden">
        {isLoading ? (
          <div className="text-gray-400 text-center py-4">Loading library...</div>
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
            
            {/* Section for followed artists */}
            {filteredFollowedArtists.length > 0 && (
              <FollowedArtistsSection 
                artists={filteredFollowedArtists}
                isSidebarExpanded={isSidebarExpanded}
              />
            )}
            
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