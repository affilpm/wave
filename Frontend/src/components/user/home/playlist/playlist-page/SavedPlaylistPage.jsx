import React, { useState, useEffect } from "react";
import { Play, Pause, Clock, Share2, Shuffle, Plus, Check, ChevronLeft, MoreVertical, Heart } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import api from "../../../../../api";
import {
  formatDuration,
  convertToSeconds,
  convertToHrMinFormat,
} from "../../../../../utils/formatters";
import {   
  setMusicId,
  setIsPlaying,
  setQueue,
  clearQueue,
  toggleShuffle
} from "../../../../../slices/user/musicPlayerSlice";

const SavedPlaylistPage = () => {
  const dispatch = useDispatch();
  const { musicId, isPlaying, queue, shuffle, currentPlaylistId } = useSelector((state) => state.musicPlayer);
  
  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalDuration, setTotalDuration] = useState("");
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const { playlistId } = useParams();
  const navigate = useNavigate();

  // Transform track data for player
  const prepareTrackForPlayer = (track) => ({
    id: Number(track.music_details.id), // Ensure ID is a number
    name: track.music_details.name,
    artist: track.music_details.artist_username,
    artist_full: track.music_details.artist_full_name,
    cover_photo: track.music_details.cover_photo,
    duration: track.music_details.duration,
    release_date: track.music_details.release_date
  });

  const isCurrentTrackFromPlaylist = () => {
    if (!playlist?.tracks || !musicId) return false;
    
    // Check if current playlist ID matches
    if (Number(currentPlaylistId) !== Number(playlist.id)) return false;
    
    // Check if current track exists in playlist
    return playlist.tracks.some(track => Number(track.music_details.id) === Number(musicId));
  };

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
      playlistId: Number(playlist.id) // Ensure playlistId is a number
    }));
    
    // Set the first track and start playing
    if (formattedTracks.length > 0) {
      dispatch(setMusicId(formattedTracks[0].id));
      dispatch(setIsPlaying(true));
    }
  };

  const handlePlayTrack = (track, index) => {
    // First, prepare all tracks to ensure consistent data format
    const formattedTracks = playlist.tracks.map(prepareTrackForPlayer);
    const currentTrackId = Number(track.music_details.id);
    
    // Check if this is the currently playing track
    const isCurrentTrack = Number(musicId) === currentTrackId && 
                          Number(currentPlaylistId) === Number(playlist.id);

    if (isCurrentTrack) {
      // Just toggle playback if it's the same track
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    // If we're playing a different playlist or no playlist is currently set
    if (Number(currentPlaylistId) !== Number(playlist.id)) {
      dispatch(clearQueue());
      dispatch(setQueue({ 
        tracks: formattedTracks,
        playlistId: Number(playlist.id)
      }));
    }

    // Find the index of the clicked track in the formatted tracks
    const trackIndex = formattedTracks.findIndex(t => Number(t.id) === currentTrackId);
    
    if (trackIndex !== -1) {
      // Set the track ID and start playing
      dispatch(setMusicId(currentTrackId));
      dispatch(setIsPlaying(true));
    }
  };

  // Handle shuffle
  const handleShuffle = () => {
    dispatch(toggleShuffle());
    if (!isPlaying && playlist?.tracks?.length) {
      dispatch(setIsPlaying(true));
    }
  };

  // Check if playlist is in library
  const checkLibraryStatus = async () => {
    try {
      const response = await api.get(`/api/library/library/check-playlist/${playlistId}/`);
      setIsInLibrary(response.data.is_in_library);
    } catch (error) {
      console.error("Failed to check library status:", error);
    }
  };

  // Toggle playlist in library
  const handleToggleLibrary = async () => {
    if (playlist?.created_by === "current_user") {
      // Don't allow adding your own playlists to library
      return;
    }

    try {
      setIsLibraryLoading(true);
      
      if (isInLibrary) {
        // Remove from library
        await api.post('/api/library/remove_playlist/', { playlist_id: playlistId });
        setIsInLibrary(false);
      } else {
        // Add to library
        await api.post('/api/library/library/add-playlist/', { playlist_id: playlistId });
        setIsInLibrary(true);
      }
    } catch (error) {
      console.error("Failed to update library:", error);
    } finally {
      setIsLibraryLoading(false);
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

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const response = await api.get(`/api/playlist/playlists/${playlistId}/`);
        setPlaylist(response.data);
        
        // Check if this playlist is in the user's library
        checkLibraryStatus();
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
      <div className="p-4 space-y-4">
        <div className="h-36 w-36 sm:h-48 sm:w-48 bg-gray-700 animate-pulse rounded-lg mx-auto sm:mx-0"></div>
        <div className="h-10 w-56 bg-gray-700 animate-pulse rounded mx-auto sm:mx-0"></div>
        <div className="h-6 w-28 bg-gray-700 animate-pulse rounded mx-auto sm:mx-0"></div>
      </div>
    );
  }

  // Don't show library toggle for own playlists
  const isOwnPlaylist = playlist?.created_by_username === "YOUR_USERNAME"; // Replace with actual check

  // Mobile-optimized track component
  const TrackItem = ({ track, index }) => {
    const isThisTrackPlaying = Number(musicId) === Number(track.music_details.id) && 
                              isCurrentTrackFromPlaylist();

    return (
      <div 
        className={`flex items-center p-3 border-b border-gray-800 ${
          isThisTrackPlaying ? "bg-white/20" : ""
        } hover:bg-white/10 transition-colors group`}
      >
        <div className="flex items-center justify-center w-6 text-sm text-gray-400 mr-1">
          <span className="group-hover:hidden">{index + 1}</span>
          <button
            className="hidden group-hover:block"
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
        
        <div className="flex-1 min-w-0 ml-3">
          <div className="font-medium text-sm truncate">
            {track.music_details.name}
          </div>
          <div className="text-xs text-gray-400 truncate">
            {track.music_details.artist_full_name}
          </div>
        </div>
        
        <span className="text-xs text-gray-400 ml-2 w-12 text-right">
          {formatDuration(track.music_details.duration)}
        </span>
      </div>
    );
  };

  // Desktop track row component
  const TrackRow = ({ track, index }) => {
    const isThisTrackPlaying = Number(musicId) === Number(track.music_details.id) && 
                              isCurrentTrackFromPlaylist();

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
        <td className="py-3 pl-6 hidden md:table-cell text-gray-400">
          {track.music_details.artist_full_name}
        </td>
        <td className="py-3 pl-6 hidden md:table-cell text-gray-400">
          {new Date(track.music_details.release_date).toLocaleDateString()}
        </td>
        <td className="py-3 text-center text-gray-400 w-20">
          {formatDuration(track.music_details.duration)}
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white pb-24 sm:pb-28">
      {/* Header Section - Mobile friendly */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-4 sm:p-6 pt-6">
        <div className="w-36 h-36 sm:w-48 sm:h-48 flex-shrink-0 shadow-xl">
          <img
            src={playlist.cover_photo || "/api/placeholder/192/192"}
            alt={playlist.name}
            className="w-full h-full object-cover rounded-lg shadow-2xl"
          />
        </div>

        <div className="flex flex-col gap-2 sm:gap-4 text-center sm:text-left">
          <span className="text-xs sm:text-sm font-medium uppercase tracking-wider text-gray-400">
            {playlist.is_public ? "Public Playlist" : "Private Playlist"}
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight">
            {playlist.name}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-gray-300 text-xs sm:text-sm">
            <span>
              Created by <span className="text-white">{playlist.created_by_username}</span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span>{playlist.tracks?.length || 0} songs</span>
            <span className="hidden sm:inline">•</span>
            <span>{totalDuration}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons - Better touch target sizing */}
      <div className="flex items-center justify-center sm:justify-start gap-4 p-4 sm:p-6">
        <button
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors shadow-lg"
          onClick={handlePlayPlaylist}
        >
          {isPlaying && isCurrentTrackFromPlaylist() ? (
            <Pause className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
          ) : (
            <Play className="h-5 w-5 sm:h-6 sm:w-6 text-black ml-0.5 sm:ml-1" />
          )}
        </button>

        {/* Desktop-only buttons */}
        <div className="flex items-center gap-4">
          <button 
            className="p-2 text-gray-400 hover:text-white transition-colors"
            onClick={handleShuffle}
          >
            <Shuffle className={`h-5 w-5 sm:h-6 sm:w-6 ${shuffle ? "text-green-500" : ""}`} />
          </button>

          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Library Toggle Button - Only show for other people's playlists */}
          {!isOwnPlaylist && (
            <button 
              className={`group p-1 border-2 rounded-full w-8 h-8 flex items-center justify-center 
                transition-all duration-200 transform hover:scale-105
                ${isInLibrary 
                  ? "border-green-500 bg-green-500/20 hover:bg-green-500/30" 
                  : "border-gray-400 hover:border-gray-100 hover:bg-transparent"}`}
              onClick={handleToggleLibrary}
              disabled={isLibraryLoading}
            >
              {isLibraryLoading ? (
                <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : isInLibrary ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <Plus className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Track List - Responsive display */}
      <div className="flex-1 p-4 sm:p-6 pb-20 sm:pb-12">
        {/* Desktop view - table */}
        <div className="hidden sm:block w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="font-normal py-3 w-12 pl-4">#</th>
                <th className="font-normal text-left py-3 pl-6">Title</th>
                <th className="font-normal text-left py-3 pl-6 hidden md:table-cell">
                  Artist
                </th>
                <th className="font-normal text-left py-3 pl-6 hidden md:table-cell">
                  Release Date
                </th>
                <th className="font-normal text-center py-3 w-20">
                  <Clock className="h-4 w-4 inline" />
                </th>
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
        <div className="sm:hidden">
          <div className="flex justify-between items-center mb-2 px-2 text-gray-400 text-sm font-medium">
            <div>#</div>
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
            </div>
          </div>
          <div className="rounded-lg overflow-hidden">
            {playlist.tracks?.map((track, index) => (
              <TrackItem key={track.id} track={track} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedPlaylistPage;