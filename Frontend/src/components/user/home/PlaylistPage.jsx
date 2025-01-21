import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, MoreHorizontal, Heart, Share2 } from 'lucide-react';
import { formatDuration } from '../../../utils/formatters';
import api from '../../../api';
import PlaylistMenuModal from './PlaylistMenuModal';
import { useNavigate } from 'react-router-dom';

import { useParams } from 'react-router-dom';
const PlaylistPage = () => {
  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { playlistId } = useParams();
  const handleEdit = () => {
    // Implement edit functionality
    console.log('Edit playlist:', playlist.id);
  };
  
  const navigate = useNavigate();
  const handleTogglePrivacy = async () => {
    try {
      await api.patch(`/api/playlist/playlists/${playlistId}/`, {
        is_public: !playlist.is_public
      });
      setPlaylist(prev => ({ ...prev, is_public: !prev.is_public }));
    } catch (err) {
      console.error('Error toggling privacy:', err);
    }
  };
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      try {
        await api.delete(`/api/playlist/playlists/${playlistId}/`);
        // Navigate to playlists page after deletion
        navigate('/home');
      } catch (err) {
        console.error('Error deleting playlist:', err);
      }
    }
  };
  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const response = await api.get(`/api/playlist/playlists/${playlistId}/`);
        setPlaylist(response.data);
      } catch (err) {
        setError('Failed to load playlist');
        console.error('Error fetching playlist:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistId]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-black">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen bg-black text-red-500">{error}</div>;
  }

  const togglePlayback = () => setIsPlaying(!isPlaying);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      {/* Playlist Header */}
      <div className="flex flex-col md:flex-row items-end gap-6 p-6">
        <div className="w-48 h-48 flex-shrink-0">
          <img
            src={playlist.cover_photo || "/api/placeholder/192/192"}
            alt={playlist.name}
            className="w-full h-full object-cover shadow-2xl"
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">PLAYLIST</span>
          <h1 className="text-4xl md:text-6xl font-bold mb-2">{playlist.name}</h1>
          <div className="text-sm text-gray-300 flex items-center gap-1">
            <img 
              src={playlist.created_by_details?.avatar || "/api/placeholder/24/24"} 
              alt="Creator"
              className="w-6 h-6 rounded-full"
            />
            <span className="font-medium">{playlist.created_by_details?.username}</span>
            <span>• {playlist.tracks?.length || 0} songs</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 p-6">
        <button
          onClick={togglePlayback}
          className="w-14 h-14 flex items-center justify-center bg-green-500 rounded-full hover:bg-green-400 transition-colors"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6 text-black" />
          ) : (
            <Play className="h-6 w-6 text-black ml-1" />
          )}
        </button>
        <button className="text-gray-400 hover:text-white transition-colors">
          <Heart className="h-8 w-8" />
        </button>
        <button className="text-gray-400 hover:text-white transition-colors">
          <Share2 className="h-6 w-6" />
        </button>
        <button className="text-gray-400 hover:text-white transition-colors">
        <PlaylistMenuModal 
  playlist={playlist}
  onEdit={handleEdit}
  onTogglePrivacy={handleTogglePrivacy}
  onDelete={handleDelete}
/>
        </button>
      </div>

      {/* Track List */}
      <div className="flex-1 p-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-gray-400 text-sm border-b border-gray-800">
              <th className="font-normal text-left py-2 w-12">#</th>
              <th className="font-normal text-left py-2">Title</th>
              <th className="font-normal text-left py-2 hidden md:table-cell">Album</th>
              <th className="font-normal text-left py-2 hidden md:table-cell">Date added</th>
              <th className="font-normal text-right py-2 pr-8">
                <Clock className="h-4 w-4" />
              </th>
            </tr>
          </thead>
          <tbody>
            {playlist.tracks?.map((track, index) => (
              <tr 
                key={track.id} 
                className="group hover:bg-white/10 text-gray-400 text-sm"
              >
                <td className="py-3 w-12">
                  <div className="flex items-center justify-center w-6">
                    <span className="group-hover:hidden">{index + 1}</span>
                    <Play className="hidden group-hover:block h-4 w-4 text-white" />
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={track.music_details?.album?.cover_photo || "/api/placeholder/40/40"}
                      alt={track.music_details?.title}
                      className="w-10 h-10"
                    />
                    <div className="flex flex-col">
                      <span className="text-white font-medium">
                        {track.music_details?.title}
                      </span>
                      <span>{track.music_details?.artist?.name}</span>
                    </div>
                  </div>
                </td>
                <td className="py-3 hidden md:table-cell">
                  {track.music_details?.album?.name}
                </td>
                <td className="py-3 hidden md:table-cell">
                  {new Date(track.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 text-right pr-8">
                  {formatDuration(track.music_details?.duration)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlaylistPage;