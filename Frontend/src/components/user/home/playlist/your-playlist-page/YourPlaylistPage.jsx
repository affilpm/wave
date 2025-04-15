import React, { useState, useEffect } from "react";
import { Play, Pause, Clock, Plus, Share2, X, Shuffle, Heart } from "lucide-react";
import LikedSongsPlaceholder from "./LikedSongsPlaceholder"; 
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
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
  const [trackToRemove, setTrackToRemove] = useState(null);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const [totalDuration, setTotalDuration] = useState("");
  const { musicId, isPlaying, isChanging, queue, currentIndex, repeat, shuffle, playedTracks, currentPlaylistId } = useSelector((state) => state.musicPlayer);

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
    dispatch(setCurrentPlaylistId(playlist.id));
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

  // Show confirmation dialog for track removal
  const confirmRemoveTrack = (trackId, trackName) => {
    setTrackToRemove({ id: trackId, name: trackName });
    setShowRemoveConfirmation(true);
  };

  // Handle actual track removal after confirmation
  const handleRemoveTrack = async () => {
    if (!trackToRemove) return;
    
    try {
      await api.post(`/api/playlist/playlists/${playlistId}/remove_tracks/`, {
        track_ids: [trackToRemove.id],
      });
      handleTracksUpdate();
      setShowRemoveConfirmation(false);
      setTrackToRemove(null);
    } catch (err) {
      setError("Failed to remove track");
      setShowRemoveConfirmation(false);
    }
  };

  // Cancel track removal
  const cancelRemoveTrack = () => {
    setShowRemoveConfirmation(false);
    setTrackToRemove(null);
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
      <div className="p-4 md:p-6 space-y-4">
        <div className="h-36 w-36 md:h-48 md:w-48 bg-gray-700 animate-pulse rounded-lg mx-auto md:mx-0"></div>
        <div className="h-10 w-48 md:h-12 md:w-64 bg-gray-700 animate-pulse rounded mx-auto md:mx-0"></div>
        <div className="h-6 w-24 md:h-8 md:w-32 bg-gray-700 animate-pulse rounded mx-auto md:mx-0"></div>
      </div>
    );
  }

  // Mobile track card component
  const TrackCard = ({ track, index }) => {
    const isThisTrackPlaying = musicId === track.music_details.id && isCurrentTrackFromPlaylist();
    
    return (
      <div className={`flex items-center p-3 border-b border-gray-800 gap-3 ${
        isThisTrackPlaying ? "bg-white/20" : ""
      } hover:bg-white/10`}>
        <div className="w-6 text-center text-sm text-gray-400">
          <span className="hidden group-hover:inline">{index + 1}</span>
          <button
            className="group-hover:block md:block"
            onClick={() => handlePlayTrack(track, index)}
          >
            {isThisTrackPlaying && isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
        </div>
        
        <img
          src={track.music_details.cover_photo || "/api/placeholder/40/40"}
          alt={track.music_details.name}
          className="w-10 h-10 rounded-md"
        />
        
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{track.music_details.name}</div>
          <div className="text-sm text-gray-400 truncate">{track.music_details.artist_username}</div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {formatDuration(track.music_details.duration)}
          </span>
          
          <button
            className="p-1 text-red-500 hover:text-red-400"
            onClick={() => confirmRemoveTrack(track.music_details.id, track.music_details.name)}
          >
            {playlist.name === 'Liked Songs' ? (
              <Heart className="h-4 w-4" fill="currentColor" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    );
  };

  // Desktop track row component
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
        <td className="py-3 pl-6 pr-4 text-gray-400">
          {track.music_details.artist_username}
        </td>
        <td className="py-3 pl-6 pr-4 text-gray-400">
          {track.music_details.release_date}
        </td>
        <td className="py-3 text-center text-gray-400 w-20">
          {formatDuration(track.music_details.duration)}
        </td>
        <td className="py-3 pr-6 text-right">
          {playlist.name === 'Liked Songs' ? (
            <button
              className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-400 transition-all"
              onClick={() => confirmRemoveTrack(track.music_details.id, track.music_details.name)}
            >
              <Heart className="h-4 w-4" fill="currentColor" />
            </button>
          ) : (
            <button
              className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-400 transition-all"
              onClick={() => confirmRemoveTrack(track.music_details.id, track.music_details.name)}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white pb-24 md:pb-28">
    {/* Header Section - Mobile friendly */}
    <div className="flex flex-col items-center md:items-start md:flex-row md:items-end gap-4 md:gap-6 p-4 md:p-6">
      <div className="relative group w-36 h-36 md:w-48 md:h-48 flex-shrink-0">
      {playlist.name === 'Liked Songs' ? (
        // Use absolute positioning for perfect centering
        <div className="w-full h-full relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <LikedSongsPlaceholder size={playlist.name === 'Liked Songs' ? (window.innerWidth < 768 ? 144 : 192) : 192} />
          </div>
        </div>
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
            className="px-3 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-md backdrop-blur-sm text-xs md:text-sm font-medium transition-colors"
          >
            Change Photo
          </button>
        </div>
      )}
    </div>

        <div className="flex flex-col gap-2 md:gap-4 text-center md:text-left">
          <span className="text-xs md:text-sm font-medium uppercase tracking-wider text-gray-400">
            {playlist.is_public ? "Public Playlist" : "Private Playlist"}
          </span>
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold tracking-tight">
            {playlist.name}
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-gray-300 flex-wrap">
            <span className="text-xs md:text-sm">
              Created by{" "}
              <span className="text-white">
                {playlist.created_by_username}
              </span>
            </span>
            <span className="hidden md:inline text-gray-500">•</span>
            <span className="text-xs md:text-sm">
              {playlist.tracks?.length || 0} songs
            </span>
            <span className="hidden md:inline text-gray-500">•</span>
            <span className="text-xs md:text-sm">{totalDuration}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons - Better touch target sizing */}
      <div className="flex items-center justify-center md:justify-start gap-4 p-4 md:p-6">
        <button
          className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors shadow-lg"
          onClick={handlePlayPlaylist}
        >
          {isPlaying && isCurrentTrackFromPlaylist() ? (
            <Pause className="h-5 w-5 md:h-6 md:w-6 text-black" />
          ) : (
            <Play className="h-5 w-5 md:h-6 md:w-6 text-black ml-0.5 md:ml-1" />
          )}
        </button>

        <button 
          className="p-2 text-gray-400 hover:text-white transition-colors"
          onClick={handleShuffle}
        >
          <Shuffle className="h-5 w-5 md:h-6 md:w-6" />
        </button>

        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <Share2 className="h-5 w-5 md:h-6 md:w-6" />
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

      {/* Track List - Responsive display */}
      <div className="flex-1 p-4 md:p-6 pb-20 md:pb-12">
        {/* Desktop view - table */}
        <div className="hidden md:block w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="font-normal py-3 w-12 pl-4">#</th>
                <th className="font-normal text-left py-3 pl-6">Title</th>
                <th className="font-normal text-left py-3 pl-6 pr-4">
                  Artist
                </th>
                <th className="font-normal text-left py-3 pl-6 pr-4">
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
        </div>

        {/* Mobile view - card list */}
        <div className="md:hidden">
          <div className="flex justify-between items-center mb-2 px-2 text-gray-400 text-sm font-medium">
            <div>#</div>
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
            </div>
          </div>
          <div className="rounded-lg overflow-hidden">
            {playlist.tracks?.map((track, index) => (
              <TrackCard key={track.id} track={track} index={index} />
            ))}
          </div>
        </div>

        {playlist.name !== 'Liked Songs' && (
          <div className="mt-6">
            <TrackSearch
              playlistId={playlistId}
              onTracksUpdate={handleTracksUpdate}
            />
          </div>
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
      
      {/* Remove Track Confirmation Modal */}
      {showRemoveConfirmation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-4 md:p-6 max-w-md w-full">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Remove from playlist?</h3>
            <p className="text-gray-300 text-sm md:text-base mb-4 md:mb-6">
              Are you sure you want to remove "{trackToRemove?.name}" from this playlist?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelRemoveTrack}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-transparent hover:bg-white/10 rounded-md text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveTrack}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-red-600 hover:bg-red-700 rounded-md text-white text-sm transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YourPlaylistPage;