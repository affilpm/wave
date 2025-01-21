import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, Heart, Share2, X } from 'lucide-react';
import { formatDuration } from '../../../../utils/formatters';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../../api';
import PlaylistMenuModal from './PlaylistMenuModal';
import EditPlaylistModal from './EditPlaylistModal';
import TrackSearch from './TrackSearch';

const PlaylistPage = () => {
  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { playlistId } = useParams();
  const navigate = useNavigate();

  const totalDuration = playlist?.tracks?.reduce(
    (acc, track) => acc + (track.music_details?.duration || 0),
    0
  );

  const handleEdit = () => setIsEditModalOpen(true);
  
  const handleEditPlaylist = (updatedPlaylist) => setPlaylist(updatedPlaylist);

  const handleTogglePrivacy = async () => {
    try {
      await api.patch(`/api/playlist/playlists/${playlistId}/`, {
        is_public: !playlist.is_public
      });
      setPlaylist(prev => ({ ...prev, is_public: !prev.is_public }));
    } catch (err) {
      setError('Failed to update playlist privacy');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      try {
        await api.delete(`/api/playlist/playlists/${playlistId}/`);
        navigate('/home');
      } catch (err) {
        setError('Failed to delete playlist');
      }
    }
  };

  const handleRemoveTrack = async (trackId) => {
    try {
      await api.post(`/api/playlist/playlists/${playlistId}/remove_tracks/`, {
        track_ids: [trackId]
      });
      handleTracksUpdate();
    } catch (err) {
      setError('Failed to remove track');
    }
  };

  const handlePlayTrack = (trackId) => {
    setCurrentTrackId(trackId);
    setIsPlaying(true);
  };

  const handleTracksUpdate = async () => {
    try {
      const response = await api.get(`/api/playlist/playlists/${playlistId}/`);
      setPlaylist(response.data);
    } catch (err) {
      setError('Failed to refresh playlist');
    }
  };

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const response = await api.get(`/api/playlist/playlists/${playlistId}/`);
        setPlaylist(response.data);
      } catch (err) {
        setError('Failed to load playlist');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistId]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-48 w-48 bg-gray-700 animate-pulse rounded-lg"></div>
        <div className="h-12 w-64 bg-gray-700 animate-pulse rounded"></div>
        <div className="h-8 w-32 bg-gray-700 animate-pulse rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 p-4 bg-red-900/20 border border-red-500 text-red-500 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-end gap-6 p-6">
        <div className="relative group w-48 h-48 flex-shrink-0">
          <img
            src={playlist.cover_photo || "/api/placeholder/192/192"}
            alt={playlist.name}
            className="w-full h-full object-cover rounded-lg shadow-2xl transition-opacity group-hover:opacity-75"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md backdrop-blur-sm text-sm font-medium transition-colors"
            >
              Change Photo
            </button>
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          <span className="text-sm font-medium uppercase tracking-wider text-gray-400">
            {playlist.is_public ? 'Public Playlist' : 'Private Playlist'}
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">{playlist.name}</h1>
          <div className="flex items-center gap-4 text-gray-300">
            <img 
              src={playlist.created_by_details?.avatar || "/api/placeholder/24/24"}
              alt="Creator"
              className="w-8 h-8 rounded-full"
            />
            <div className="flex flex-col">
              <span className="font-medium">{playlist.created_by_details?.username}</span>
              <div className="text-sm">
                {playlist.tracks?.length || 0} songs • {formatDuration(totalDuration)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 p-6">
        <button
          className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6 text-black" />
          ) : (
            <Play className="h-6 w-6 text-black ml-1" />
          )}
        </button>
        
        <button
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <Heart className="h-6 w-6" />
        </button>
        
        <button
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <Share2 className="h-6 w-6" />
        </button>
        
        <PlaylistMenuModal 
          playlist={playlist}
          onEdit={handleEdit}
          onTogglePrivacy={handleTogglePrivacy}
          onDelete={handleDelete}
        />
      </div>

      {/* Track List */}
      <div className="flex-1 p-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800">
              <th className="font-normal text-left py-3 w-12">#</th>
              <th className="font-normal text-left py-3">Title</th>
              <th className="font-normal text-left py-3 hidden md:table-cell">Album</th>
              <th className="font-normal text-left py-3 hidden md:table-cell">Added</th>
              <th className="font-normal text-right py-3 pr-8">
                <Clock className="h-4 w-4 inline" />
              </th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {playlist.tracks?.map((track, index) => (
              <tr
                key={track.id}
                className={`group hover:bg-white/10 transition-colors ${
                  currentTrackId === track.id ? 'bg-white/20' : ''
                }`}
              >
                <td className="py-3 pl-4">
                  <div className="flex items-center justify-center w-6">
                    <span className="group-hover:hidden">
                      {currentTrackId === track.id ? '▶️' : index + 1}
                    </span>
                    <button
                      className="hidden group-hover:flex p-1 hover:text-white text-gray-400"
                      onClick={() => handlePlayTrack(track.id)}
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={track.music_details?.album?.cover_photo || "/api/placeholder/40/40"}
                      alt={track.music_details?.title}
                      className="w-10 h-10 rounded-md"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {track.music_details?.title}
                      </span>
                      <span className="text-sm text-gray-400">
                        {track.music_details?.artist?.name}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-3 hidden md:table-cell text-gray-400">
                  {track.music_details?.album?.name}
                </td>
                <td className="py-3 hidden md:table-cell text-gray-400">
                  {new Date(track.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 text-right text-gray-400">
                  {formatDuration(track.music_details?.duration)}
                </td>
                <td className="py-3 pr-4">
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-400 transition-all"
                    onClick={() => handleRemoveTrack(track.id)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <TrackSearch 
          playlistId={playlistId}
          onTracksUpdate={handleTracksUpdate}
        />
      </div>

      <EditPlaylistModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onEditPlaylist={handleEditPlaylist}
        playlist={playlist}
      />
    </div>
  );
};

export default PlaylistPage;