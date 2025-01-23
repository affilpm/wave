import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Library, Heart, Music, ChevronLeft, MoreVertical, Share2, Delete, Edit } from 'lucide-react';
import CreatePlaylistModal from '../playlist/CreatePlaylistModal';
import api from '../../../../api';
import PlaylistManager from './PlaylistManager';

const Sidebar = ({ isSidebarExpanded, toggleSidebar }) => {
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
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
  const [libraryPlaylists, setLibraryPlaylists] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const ownPlaylistsResponse = await api.get('/api/playlist/playlists/');
        const formattedOwnPlaylists = ownPlaylistsResponse.data.map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          icon: null,
          image: playlist.cover_photo || "/api/placeholder/40/40",
          songCount: playlist.tracks?.length || 0,
          type: 'Playlist',
          description: playlist.description,
          isPublic: playlist.is_public
        }));

        const libraryPlaylistsResponse = await api.get('/api/library/playlists/');
        const formattedLibraryPlaylists = libraryPlaylistsResponse.data.map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          icon: null,
          image: playlist.cover_photo || "/api/placeholder/40/40",
          songCount: playlist.tracks?.length || 0,
          type: 'Added Playlist',
          description: playlist.description,
          isPublic: playlist.is_public
        }));

        setOwnPlaylists(prevPlaylists => [
          prevPlaylists[0], // Keep Liked Songs
          ...formattedOwnPlaylists
        ]);
        setLibraryPlaylists(formattedLibraryPlaylists);
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
    setOwnPlaylists(prevPlaylists => [...prevPlaylists, {
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

  const filteredOwnPlaylists = ownPlaylists.filter(playlist =>
    playlist.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );
  const filteredLibraryPlaylists = libraryPlaylists.filter(playlist =>
    playlist.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );

  const handlePlaylistClick = (playlistId) => {
    navigate(`/playlist/${playlistId}`);
  };

  const handlesPlaylistClick = (playlistId) => {
    navigate(`./`);
  };

  const handlePlaylistUpdate = (updatedPlaylist) => {
    setOwnPlaylists(prevPlaylists => 
      prevPlaylists.map(playlist => 
        playlist.id === updatedPlaylist.id ? {
          ...playlist,
          name: updatedPlaylist.name,
          description: updatedPlaylist.description,
          image: updatedPlaylist.cover_photo || playlist.image,
          isPublic: updatedPlaylist.is_public
        } : playlist
      )
    );
  };
  
  const handlePlaylistDelete = (playlistId) => {
    setOwnPlaylists(prevPlaylists => 
      prevPlaylists.filter(playlist => playlist.id !== playlistId)
    );
    navigate('/home');
  };

  const PlaylistSection = ({ 
    title, 
    playlists, 
    isSidebarExpanded, 
    onPlaylistUpdate, 
    onPlaylistDelete, 
    onPlaylistClick 
  }) => (
    <>
      {isSidebarExpanded && (
        <h3 className="px-2 py-3 text-sm font-semibold text-gray-400">{title}</h3>
      )}
      <div className={`space-y-1 ${isSidebarExpanded ? 'text-base' : 'text-xs'}`}>
        {playlists.map((playlist) => (
          <div
            key={playlist.id || playlist.name}
            className="group relative"
          >
            <div 
              onClick={(e) => {
                // Prevent playlist click if PlaylistManager elements are clicked
                if (e.target.closest('.playlist-manager-button, .playlist-manager-menu')) {
                  e.stopPropagation();
                  return;
                }
                onPlaylistClick(playlist.id);
              }}
              className={`
                flex items-center gap-3 p-2 cursor-pointer rounded-md 
                hover:bg-white/10 transition-colors
                ${isSidebarExpanded ? 'text-gray-400 hover:text-white' : 'text-gray-500 justify-center'}
              `}
            >
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
              
              {isSidebarExpanded && (
                <div className="playlist-manager-button">
                  <PlaylistManager 
                    playlist={playlist}
                    onPlaylistUpdate={onPlaylistUpdate}
                    onPlaylistDelete={onPlaylistDelete}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // LibrarySection component
  const LibrarySection = ({ playlists, isSidebarExpanded }) => {
    const [activeMenu, setActiveMenu] = useState(null);
    const handleMenuAction = async (e, action, playlist) => {
      e.stopPropagation();
      setActiveMenu(null);
  
      if (action === 'delete') {
        try {
          await api.post('/api/library/remove_playlist/', {
            playlist_id: playlist.id
          });
          setLibraryPlaylists(prev => prev.filter(p => p.id !== playlist.id));
        } catch (error) {
          console.error('Error removing playlist:', error);
        }
      }
    };
    const handleMenuClick = (e, playlistId) => {
      e.stopPropagation();
      setActiveMenu(activeMenu === playlistId ? null : playlistId);
    };
  
    return (
      <>
        {isSidebarExpanded && (
          <h3 className="px-2 py-3 text-sm font-semibold text-gray-400">Library</h3>
        )}
        <div className={`space-y-1 ${isSidebarExpanded ? 'text-base' : 'text-xs'}`}>
          {playlists.map((playlist) => (
            <div
              key={playlist.id || playlist.name}
              onClick={() => handlesPlaylistClick(playlist.id)}
              className="group relative"
            >
              <div className={`
                flex items-center gap-3 p-2 cursor-pointer rounded-md 
                hover:bg-white/10 transition-colors
                ${isSidebarExpanded ? 'text-gray-400 hover:text-white' : 'text-gray-500 justify-center'}
              `}>
                {playlist.icon ? (
                  <div className={`flex items-center justify-center rounded-md ${
                    isSidebarExpanded ? `w-12 h-12 ${playlist.gradient}` : 'w-10 h-10 bg-gray-700'
                  }`}>
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
                  <>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate font-medium text-white">{playlist.name}</span>
                      <span className="text-sm text-gray-400 truncate">
                        Playlist • {playlist.songCount} songs
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleMenuClick(e, playlist.id)}
                      className="p-1 rounded-full hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-400" />
                    </button>
                    {activeMenu === playlist.id && (
                      <div className="absolute right-0 top-12 w-48 bg-gray-800 rounded-md shadow-lg z-50">
                        <div className="py-1">
                          {/* <button
                            onClick={(e) => handleMenuAction(e, 'like', playlist)}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                          >
                            <Heart className="h-4 w-4 mr-3" />
                            Like
                          </button> */}
                          {/* <button
                            onClick={(e) => handleMenuAction(e, 'share', playlist)}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                          >
                            <Share2 className="h-4 w-4 mr-3" />
                            Share
                          </button> */}
                          {/* <button
                            onClick={(e) => handleMenuAction(e, 'edit', playlist)}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                          >
                            <Edit className="h-4 w-4 mr-3" />
                            Edit
                          </button> */}
                          <button
                            onClick={(e) => handleMenuAction(e, 'delete', playlist)}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                          >
                            <Delete className="h-4 w-4 mr-3" />
                            Remove from library
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    );
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
      <div className="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 custom-scrollbar">
        {isLoading ? (
          <div className="text-gray-400 text-center py-4">Loading playlists...</div>
        ) : error ? (
          <div className="text-red-400 text-center py-4">{error}</div>
        ) : (
          <>
            <PlaylistSection 
              title="Your Playlists" 
              playlists={filteredOwnPlaylists}
              isSidebarExpanded={isSidebarExpanded}
              onPlaylistClick={handlePlaylistClick}
              onPlaylistUpdate={handlePlaylistUpdate}
              onPlaylistDelete={handlePlaylistDelete}
            />
            {filteredLibraryPlaylists.length > 0 && (
              <LibrarySection 
                playlists={filteredLibraryPlaylists}
                isSidebarExpanded={isSidebarExpanded}
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