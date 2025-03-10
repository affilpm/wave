import React, { useState, useEffect } from "react";
import { Play, Pause, Clock, Share2, Shuffle, Plus } from "lucide-react";
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

  const handlePlayTrack = (track) => {
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
        console.log(response.data, 'sdfas')
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
        <td className="py-3 pl-3">
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
        <td className="py-3 pl-3 hidden md:table-cell text-gray-400">
          {track.music_details.artist_full_name}
        </td>
        <td className="py-3 pl-3 hidden md:table-cell text-gray-400">
          {new Date(track.music_details.release_date).toLocaleDateString()}
        </td>
        <td className="py-3 text-center text-gray-400 w-20">
          {formatDuration(track.music_details.duration)}
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-end gap-6 p-6">
        <div className="w-48 h-48 flex-shrink-0">
          <img
            src={playlist.cover_photo || "/api/placeholder/192/192"}
            alt={playlist.name}
            className="w-full h-full object-cover rounded-lg shadow-2xl"
          />
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
              • {playlist.tracks?.length || 0} songs • {`${totalDuration}`}
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

        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <Share2 className="h-6 w-6" />
        </button>
        <button className="group p-1 border-2 border-gray-400 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200 transform group-hover:scale-90 hover:border-gray-100 hover:bg-transparent">
          <Plus className="h-6 w-6 text-gray-400 group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* Track List */}
      <div className="flex-1 p-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800">
              <th className="font-normal py-3 w-12 pl-4">#</th>
              <th className="font-normal text-left py-3 pl-3">Title</th>
              <th className="font-normal text-left py-3 hidden md:table-cell pl-3">
                Artist
              </th>
              <th className="font-normal text-left py-3 hidden md:table-cell pl-3">
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
    </div>
  );
};

export default SavedPlaylistPage;