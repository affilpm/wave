import React, { useState, useEffect } from "react";
import { Play, Pause, Clock, Plus, Share2, X, Shuffle, Heart } from "lucide-react";
import LikedSongsPlaceholder from "./LikedSongsPlaceholder"; 
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { 
  // setQueue, 
  setCurrentTrack, 
 
  reorderQueue 
} from "../../../../../slices/user/playerSlice";
import api from "../../../../../api";
import PlaylistMenuModal from "./YourPlaylistMenuModal";
import EditPlaylistModal from "./EditPlaylistModal";
import TrackSearch from "./TrackSearch";
import {
  formatDuration,
  convertToSeconds,
  convertToHrMinFormat,
} from "../../../../../utils/formatters";
import {   
  setMusicId,
  setIsPlaying,
  setChangeComplete,
  setQueue,
  addToQueue,
  removeFromQueue,
  clearQueue,
  playNext,
  playPrevious,
  toggleShuffle,
  setRepeat,
  moveTrack,
  markAsPlayed,
  setCurrentPlaylistId
 } from "../../../../../slices/user/musicPlayerSlice";




const YourPlaylistPage = () => {
  const dispatch = useDispatch();
  
  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const [totalDuration, setTotalDuration] = useState("");
  const { musicId, isPlaying, isChanging, queue, currentIndex, repeat, shuffle, playedTracks, currentPlaylistId, } = useSelector((state) => state.musicPlayer);
  console.log(currentPlaylistId)

  const isCurrentTrackFromPlaylist = () => {
    if (!playlist?.tracks || !musicId) return false;
    
    // Make sure we're playing from this specific playlist
    if (currentPlaylistId !== playlist.id) return false;
    
    // Check if current track exists in this playlist
    return playlist.tracks.some(track => track.music_details.id === musicId);
  };

  // Transform track data for player
  const prepareTrackForPlayer = (track) => ({
    id: track.music_details.id,
    name: track.music_details.name,
    artist: track.music_details.artist_username,
    artist_full: track.music_details.artist_full_name,
    cover_photo: track.music_details.cover_photo,
    audio_file: track.music_details.audio_file,
    duration: track.music_details.duration
  });
  

const handlePlayPlaylist = () => {
  if (!playlist?.tracks?.length) return;

  // Check if we're already playing this playlist
  if (isCurrentTrackFromPlaylist()) {
    // Just toggle play state if it's the same playlist
    dispatch(setIsPlaying(!isPlaying));
    return;
  }

  // This is a new playlist or a reset - load it
  const formattedTracks = playlist.tracks.map(prepareTrackForPlayer);
  
  // Clear existing queue and set new one
  dispatch(clearQueue());
  dispatch(setQueue({ 
    tracks: formattedTracks,
    playlistId: playlist.id 
  }));
  
  // Set the first track and start playing
  if (formattedTracks.length > 0) {
    dispatch(setMusicId(formattedTracks[0].id));
    dispatch(setIsPlaying(true));
  }
};

const handlePlayTrack = (track, index) => {
  const formattedTracks = playlist.tracks.map(prepareTrackForPlayer);
  const formattedTrack = formattedTracks[index];
  console.log(playlist.id,'dfs')
  // Check if this is the currently playing track
  if (musicId === formattedTrack.id && currentPlaylistId === playlist.id) {
    // Just toggle playback
    dispatch(setIsPlaying(!isPlaying));
    return;
  }

  // If we're playing a different playlist, update the queue
  if (currentPlaylistId !== playlist.id) {
    dispatch(clearQueue());
    dispatch(setQueue({ 
      tracks: formattedTracks,
      playlistId: playlist.id 
    }));
  }

  // Set the track ID and start playing
  
  dispatch(setCurrentPlaylistId(playlist.id))
  dispatch(setMusicId(formattedTrack.id));
  dispatch(setIsPlaying(true));
};

  // Handle shuffle
  const handleShuffle = () => {
    dispatch(toggleShuffle());
    if (!isPlaying) {
      dispatch(setIsPlaying(true));
    }
  };

  useEffect(() => {
    const calculateTotalDuration = () => {
      if (playlist?.tracks?.length) {
        const totalSeconds = playlist.tracks.reduce((acc, track) => {

          const trackDuration = track.music_details?.duration || "00:00:00";
          return acc + convertToSeconds(trackDuration);
        }, 0);
        const combinedDuration = convertToHrMinFormat(totalSeconds);
        setTotalDuration(combinedDuration);
      }
    };

    calculateTotalDuration();
  }, [playlist]);

  const handleEdit = () => setIsEditModalOpen(true);

  const handleEditPlaylist = (updatedPlaylist) => setPlaylist(updatedPlaylist);

  const handleTogglePrivacy = async () => {
    try {
      await api.patch(`/api/playlist/playlists/${playlistId}/`, {
        is_public: !playlist.is_public,
      });
      setPlaylist((prev) => ({ ...prev, is_public: !prev.is_public }));
    } catch (err) {
      setError("Failed to update playlist privacy");
    }
  };
  console.log(playlist, 'dfd')

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this playlist?")) {
      try {
        await api.delete(`/api/playlist/playlists/${playlistId}/`);
        navigate("/home");
      } catch (err) {
        setError("Failed to delete playlist");
      }
    }
  };

  const handleRemoveTrack = async (trackId) => {
    try {
      await api.post(`/api/playlist/playlists/${playlistId}/remove_tracks/`, {
        track_ids: [trackId],
      });
      handleTracksUpdate();
    } catch (err) {
      setError("Failed to remove track");
    }
  };

  const handleTracksUpdate = async () => {
    try {
      const response = await api.get(`/api/playlist/playlists/${playlistId}/`);
      setPlaylist(response.data);
    } catch (err) {
      setError("Failed to refresh playlist");
    }
  };

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const response = await api.get(
          `/api/playlist/playlists/${playlistId}/`
        );
        setPlaylist(response.data);
      } catch (err) {
        setError("Failed to load playlist");
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

  const TrackRow = ({ track, index }) => {
    const isThisTrackPlaying = musicId === track.music_details.id && isCurrentTrackFromPlaylist();

    return (
      <tr
        className={`group hover:bg-white/10 transition-colors ${
          isThisTrackPlaying ? "bg-white/20" : ""
        }`}
      >
        <td className="py-3 pl-4">
          <div className="flex items-center justify-center w-8 group">
            <span className="group-hover:hidden">{index + 1}</span>
            <button
              className="hidden group-hover:flex p-1 hover:text-white text-gray-400"
              onClick={() => handlePlayTrack(track, index)}
            >
              {isThisTrackPlaying && isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
          </div>
        </td>
        <td className="py-3 pl-6">
          <div className="flex items-center gap-3">
            <img
              src={track.music_details.cover_photo || "/api/placeholder/40/40"}
              alt={track.music_details.name}
              className="w-10 h-10 rounded-md"
            />
            <span className="font-medium">
              {track.music_details.name}
            </span>
          </div>
        </td>
        <td className="py-3 pl-6 pr-4 hidden md:table-cell text-gray-400">
          {track.music_details.artist_username}
        </td>
        <td className="py-3 pl-6 pr-4 hidden md:table-cell text-gray-400">
          {track.music_details.release_date}
        </td>
        <td className="py-3 text-center text-gray-400 w-20">
          {formatDuration(track.music_details.duration)}
        </td>
        <td className="py-3 pr-6 text-right">
  {playlist.name === 'Liked Songs' ? (
    <button
      className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-400 transition-all"
      onClick={() => handleRemoveTrack(track.music_details.id)}
    >
      <Heart className="h-4 w-4" fill="currentColor" />
    </button>
  ) : (
    <button
      className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-400 transition-all"
      onClick={() => handleRemoveTrack(track.music_details.id)}
    >
      <X className="h-4 w-4" />
    </button>
  )}
</td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-end gap-6 p-6">

        <div className="relative group w-48 h-48 flex-shrink-0">
          {playlist.name === 'Liked Songs' ? (
            <LikedSongsPlaceholder size={192} />
          ) : (
            <img
              src={playlist.cover_photo || "/api/placeholder/192/192"}
              alt={playlist.name}
              className="w-full h-full object-cover rounded-lg shadow-2xl transition-opacity group-hover:opacity-75"
            />
          )}
          {playlist.name !== 'Liked Songs' && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md backdrop-blur-sm text-sm font-medium transition-colors"
              >
                Change Photo
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-sm font-medium uppercase tracking-wider text-gray-400">
            {playlist.is_public ? "Public Playlist" : "Private Playlist"}
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            {playlist.name}
          </h1>
          <div className="flex items-center gap-4 text-gray-300">
            <span className="text-sm">
              Created by{" "}
              <span className="text-white">
                {playlist.created_by_username}
              </span>{" "}
              • {playlist.tracks?.length || 0} songs • {totalDuration}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 p-6">
        <button
          className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors"
          onClick={handlePlayPlaylist}
        >
          {isPlaying && isCurrentTrackFromPlaylist() ? (
            <Pause className="h-6 w-6 text-black" />
          ) : (
            <Play className="h-6 w-6 text-black ml-1" />
          )}
        </button>

        <button
          className={`p-2 text-gray-400 hover:text-white transition-colors ${
            isShuffling ? "text-green-500" : ""
          }`}
          onClick={handleShuffle}
        >
          <Shuffle className="h-6 w-6" />
        </button>

        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <Share2 className="h-6 w-6" />
        </button>

        {playlist.name !== 'Liked Songs' && (
          <PlaylistMenuModal
            playlist={playlist}
            onEdit={handleEdit}
            onTogglePrivacy={handleTogglePrivacy}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Track List */}
      <div className="flex-1 p-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800">
              <th className="font-normal py-3 w-12 pl-4">#</th>
              <th className="font-normal text-left py-3 pl-6">Title</th>
              <th className="font-normal text-left py-3 hidden md:table-cell pl-6 pr-4">
                Artist
              </th>
              <th className="font-normal text-left py-3 hidden md:table-cell pl-6 pr-4">
                Added
              </th>
              <th className="font-normal text-center py-3 w-20">
                <Clock className="h-4 w-4 inline" />
              </th>
              <th className="w-8 pr-6"></th>
            </tr>
          </thead>
          <tbody>
            {playlist.tracks?.map((track, index) => (
              <TrackRow key={track.id} track={track} index={index} />
            ))}
          </tbody>
        </table>

        {playlist.name !== 'Liked Songs' && (
          <TrackSearch
            playlistId={playlistId}
            onTracksUpdate={handleTracksUpdate}
          />
        )}
      </div>

      {playlist.name !== 'Liked Songs' && (
        <EditPlaylistModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onEditPlaylist={handleEditPlaylist}
          playlist={playlist}
        />
      )}
    </div>
  );
};

export default YourPlaylistPage;