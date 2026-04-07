import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Plus, Library, Heart, ChevronLeft, X } from 'lucide-react';
import api from '../../../../api';
import { LIBRARY } from '../../../../constants/apiEndpoints';
import CreatePlaylistModal from '../playlist/CreatePlaylistModal';
import YourPlaylistSection from './YourPlaylistSection';
import SavedPlaylistSection from './SavedPlaylistSection';
import SavedAlbumsSection from './SavedAlbumsSection';
import FollowedArtistsSection from './FollowedArtistsSection';
import { 
  fetchLibraryData, 
  selectOwnPlaylists, 
  selectSavedPlaylists, 
  selectSavedAlbums,
  selectFollowedArtists, 
  selectLikedSongs,
  addOwnPlaylist,
  removeOwnPlaylist,
  updateOwnPlaylist,
  toggleSavedPlaylistOptimistic,
  toggleSavedAlbumOptimistic
} from '../../../../slices/user/librarySlice';

const Sidebar = ({ isSidebarExpanded, toggleSidebar, isMobile = false }) => {
  // State for managing the search query in the library
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  
  // State for modal visibility (create playlist)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const globalOwnPlaylists = useSelector(selectOwnPlaylists);
  const libraryPlaylists = useSelector(selectSavedPlaylists);
  const savedAlbums = useSelector(selectSavedAlbums);
  const rawFollowedArtists = useSelector(selectFollowedArtists);
  const likedSongs = useSelector(selectLikedSongs);
  const { isLoading, error } = useSelector(state => state.library);

  useEffect(() => {
    dispatch(fetchLibraryData());
  }, [dispatch]);

  const ownPlaylists = useMemo(() => {
    return globalOwnPlaylists.filter(p => p.name !== 'Liked Songs').map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      icon: null,
      image: playlist.cover_photo || playlist.image || "/api/v1/placeholder/40/40",
      songCount: playlist.tracks?.length || playlist.songCount || 0,
      type: 'Playlist',
      description: playlist.description,
      is_public: playlist.is_public
    }));
  }, [globalOwnPlaylists]);

  const likedSongsPlaylist = useMemo(() => {
    const likedPlaylistObj = globalOwnPlaylists.find(p => p.name === 'Liked Songs');
    return {
      id: likedPlaylistObj?.id || 'liked-songs',
      name: 'Liked Songs',
      icon: <Heart className="h-6 w-6 text-pink-500" />,
      image: "/api/v1/placeholder/40/40",
      gradient: 'bg-gradient-to-br from-purple-600 to-purple-900',
      songCount: likedSongs.length,
      type: 'Playlist',
    };
  }, [globalOwnPlaylists, likedSongs.length]);

  const followedArtists = useMemo(() => {
    return rawFollowedArtists.map(f => f.artist || f);
  }, [rawFollowedArtists]);

  // Handle the creation of a new playlist
  const handleCreatePlaylist = (newPlaylist) => {
    dispatch(addOwnPlaylist(newPlaylist));
    setIsCreateModalOpen(false);
    if (isMobile) {
      toggleSidebar();
    }
  };

  // Filter playlists and artists based on the search query
  const filteredOwnPlaylists = ownPlaylists.filter(playlist =>
    playlist.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );
  
  const mappedLibraryPlaylists = useMemo(() => {
    return libraryPlaylists.map(playlist => ({
      ...playlist,
      image: playlist.cover_photo || playlist.image || "/api/v1/placeholder/40/40",
      songCount: playlist.tracks?.length || playlist.songCount || 0,
      type: 'Playlist'
    }));
  }, [libraryPlaylists]);

  const filteredLibraryPlaylists = mappedLibraryPlaylists.filter(playlist =>
    playlist.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );
  
  const filteredFollowedArtists = followedArtists.filter(artist =>
    artist && artist.username && artist.username.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );
  
  const filteredSavedAlbums = savedAlbums.filter(album =>
    album && album.name && album.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );

  // Handle navigation to a specific playlist
  const handlePlaylistClick = (playlistId) => {
    navigate(`/playlist/${playlistId}`);
    // On mobile, close the sidebar after navigation
    if (isMobile) {
      toggleSidebar();
    }
  };

  // Handle updates to a playlist
  const handlePlaylistUpdate = (updatedPlaylist) => {
    dispatch(updateOwnPlaylist(updatedPlaylist));
  };

  // Handle deletion of a playlist
  const handlePlaylistDelete = (playlistId) => {
    dispatch(removeOwnPlaylist(playlistId));
    navigate('/home'); // Redirect after deletion
    // On mobile, close the sidebar after deletion
    if (isMobile) {
      toggleSidebar();
    }
  };
  
  const handleSavedPlaylistDelete = (playlist) => {
    dispatch(toggleSavedPlaylistOptimistic(playlist));
  };

  const handleSavedAlbumRemove = async (album) => {
    // Optimistic update — remove from sidebar immediately
    dispatch(toggleSavedAlbumOptimistic(album));
    try {
      await api.post(LIBRARY.REMOVE_ALBUM, { album_id: album.id });
    } catch (error) {
      // Revert on failure
      dispatch(toggleSavedAlbumOptimistic(album));
      console.error('Error removing album from library:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header Section */}
      <div className="flex-shrink-0 p-4">
        <div className="flex items-center justify-between mb-4">
          {isMobile ? (
            // Mobile header with close button
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Library className="h-6 w-6 flex-shrink-0" />
                <span className="ml-2 font-semibold">Your Library</span>
              </div>
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            // Desktop header with toggle
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
          )}

          {/* Create playlist button - visible when sidebar is expanded or on mobile */}
          {(isSidebarExpanded || isMobile) && (
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search input - visible when sidebar is expanded or on mobile */}
        {(isSidebarExpanded || isMobile) && (
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

      {/* Library Content - Adding pb-6 to ensure content doesn't get cut off at the bottom */}
      <div className="flex-1 overflow-y-auto px-2 scrollbar-hidden pb-6">
        {isLoading ? (
          <div className="text-gray-400 text-center py-4">Loading library...</div>
        ) : error ? (
          <div className="text-red-400 text-center py-4">{error}</div>
        ) : (
          <>
            {/* Pinned Liked Songs */}
            {likedSongsPlaylist.name.toLowerCase().includes(librarySearchQuery.toLowerCase()) && (
              <div className="mb-2">
                <div 
                  onClick={() => handlePlaylistClick(likedSongsPlaylist.id)}
                  className={`
                    flex items-center gap-3 p-2 cursor-pointer rounded-md 
                    hover:bg-white/10 transition-colors
                    ${(isSidebarExpanded || isMobile) ? 'text-gray-400 hover:text-white' : 'text-gray-500 justify-center'}
                  `}
                >
                  <div className={`flex items-center justify-center rounded-md ${
                    (isSidebarExpanded || isMobile) ? `w-12 h-12 ${likedSongsPlaylist.gradient}` : 'w-10 h-10 bg-gray-700'
                  }`}>
                    {likedSongsPlaylist.icon}
                  </div>
                  {(isSidebarExpanded || isMobile) && (
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate font-medium text-white">{likedSongsPlaylist.name}</span>
                      <span className="text-sm text-gray-400 truncate">
                        Playlist • {likedSongsPlaylist.songCount} songs
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section for user-created playlists */}
            <YourPlaylistSection 
              title="Playlists" 
              playlists={filteredOwnPlaylists}
              isSidebarExpanded={isSidebarExpanded || isMobile}
              onPlaylistClick={handlePlaylistClick}
              onPlaylistUpdate={handlePlaylistUpdate}
              onPlaylistDelete={handlePlaylistDelete}
            />
            
            {/* Section for followed artists */}
            {filteredFollowedArtists.length > 0 && (
              <FollowedArtistsSection 
                artists={filteredFollowedArtists}
                isSidebarExpanded={isSidebarExpanded || isMobile}
              />
            )}

            {/* Section for saved albums */}
            {filteredSavedAlbums.length > 0 && (
              <SavedAlbumsSection
                albums={filteredSavedAlbums}
                isSidebarExpanded={isSidebarExpanded || isMobile}
                onSavedAlbumRemove={handleSavedAlbumRemove}
              />
            )}
            
            {/* Section for library playlists */}
            {filteredLibraryPlaylists.length > 0 && (
              <SavedPlaylistSection
                playlists={filteredLibraryPlaylists}
                isSidebarExpanded={isSidebarExpanded || isMobile}
                onSavedPlaylistDelete={handleSavedPlaylistDelete}
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