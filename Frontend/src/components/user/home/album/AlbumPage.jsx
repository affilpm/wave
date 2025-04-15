import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Clock, Share2, Shuffle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { 
  setMusicId,
  setIsPlaying,
  setQueue,
  clearQueue,
  toggleShuffle
} from "../../../../slices/user/musicPlayerSlice";
import api from "../../../../api";
import {
  formatDuration,
  convertToSeconds,
  convertToHrMinFormat,
} from "../../../../utils/formatters";

const AlbumPage = () => {
  const dispatch = useDispatch();
  const { musicId, isPlaying, queue, shuffle, currentPlaylistId } = useSelector((state) => state.musicPlayer);
  
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalDuration, setTotalDuration] = useState("");
  const { albumId } = useParams();
  const navigate = useNavigate();

  // Transform track data for player
  const prepareTrackForPlayer = (track) => ({
    id: Number(track.music_details.id),
    name: track.music_details.name,
    artist: track.music_details.artist_username,
    artist_full: track.music_details.artist_full_name,
    cover_photo: track.music_details.cover_photo,
    duration: track.music_details.duration,
    release_date: track.music_details.release_date
  });

  const isCurrentTrackFromAlbum = () => {
    if (!album?.tracks || !musicId) return false;
    
    // Check if current album ID matches
    if (Number(currentPlaylistId) !== Number(album.id)) return false;
    
    // Check if current track exists in album
    return album.tracks.some(track => Number(track.music_details.id) === Number(musicId));
  };

  const handlePlayAlbum = () => {
    if (!album?.tracks?.length) return;

    // Check if we're already playing this album
    if (isCurrentTrackFromAlbum()) {
      // Just toggle play state if it's the same album
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    // This is a new album - load it
    const formattedTracks = album.tracks.map(prepareTrackForPlayer);
    
    // Clear existing queue and set new one
    dispatch(clearQueue());
    dispatch(setQueue({ 
      tracks: formattedTracks,
      playlistId: Number(album.id) // Use album ID as playlistId
    }));
    
    // Set the first track and start playing
    if (formattedTracks.length > 0) {
      dispatch(setMusicId(formattedTracks[0].id));
      dispatch(setIsPlaying(true));
    }
  };

  const handlePlayTrack = (track) => {
    // First, prepare all tracks to ensure consistent data format
    const formattedTracks = album.tracks.map(prepareTrackForPlayer);
    const currentTrackId = Number(track.music_details.id);
    
    // Check if this is the currently playing track
    const isCurrentTrack = Number(musicId) === currentTrackId && 
                          Number(currentPlaylistId) === Number(album.id);

    if (isCurrentTrack) {
      // Just toggle playback if it's the same track
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    // If we're playing a different album or no album is currently set
    if (Number(currentPlaylistId) !== Number(album.id)) {
      dispatch(clearQueue());
      dispatch(setQueue({ 
        tracks: formattedTracks,
        playlistId: Number(album.id)
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
    if (!isPlaying && album?.tracks?.length) {
      dispatch(setIsPlaying(true));
    }
  };

  useEffect(() => {
    const calculateTotalDuration = () => {
      if (album?.tracks?.length) {
        const totalSeconds = album.tracks.reduce((acc, track) => {
          const trackDuration = track.music_details?.duration || "00:00:00";
          return acc + convertToSeconds(trackDuration);
        }, 0);
        const combinedDuration = convertToHrMinFormat(totalSeconds);
        setTotalDuration(combinedDuration);
      }
    };

    calculateTotalDuration();
  }, [album]);

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const response = await api.get(`/api/album/album_data/${albumId}/`);
        setAlbum(response.data);
      } catch (err) {
        setError("Failed to load album");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbum();
  }, [albumId]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 mb-24">
        <div className="h-32 w-32 md:h-48 md:w-48 bg-gray-700 animate-pulse rounded-lg mx-auto md:mx-0"></div>
        <div className="h-8 w-full md:w-64 bg-gray-700 animate-pulse rounded mx-auto md:mx-0"></div>
        <div className="h-6 w-3/4 bg-gray-700 animate-pulse rounded mx-auto md:mx-0"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center mb-24">
        <div className="text-red-500 text-lg">{error}</div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-gray-800 rounded-md hover:bg-gray-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const TrackRow = ({ track, index }) => {
    const isThisTrackPlaying = Number(musicId) === Number(track.music_details.id) && 
                              isCurrentTrackFromAlbum();

    return (
      <div 
        className={`flex items-center p-3 group hover:bg-white/10 transition-colors rounded-md mb-1 ${
          isThisTrackPlaying ? "bg-white/20" : ""
        }`}
        onClick={() => handlePlayTrack(track)}
      >
        {/* Track Number/Play Button */}
        <div className="flex items-center justify-center w-8 mr-2">
          <span className="group-hover:hidden">{index + 1}</span>
          <button
            className="hidden group-hover:flex p-1 hover:text-white text-gray-400"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayTrack(track);
            }}
          >
            {isThisTrackPlaying && isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
        </div>
        
        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <img
              src={track.music_details.cover_photo || "/api/placeholder/40/40"}
              alt={track.music_details.name}
              className="w-10 h-10 rounded-md flex-shrink-0"
            />
            <div className="flex flex-col overflow-hidden">
              <span className="font-medium truncate">
                {track.music_details.name}
              </span>
              <span className="text-sm text-gray-400 truncate">
                {track.music_details.artist_full_name}
              </span>
            </div>
          </div>
        </div>
        
        {/* Duration */}
        <div className="text-gray-400 w-16 text-right">
          {formatDuration(track.music_details.duration)}
        </div>
      </div>
    );
  };

  // Mobile-friendly track list for small screens
  const MobileTrackList = () => (
    <div className="space-y-1">
      {album.tracks?.map((track, index) => (
        <TrackRow key={track.id} track={track} index={index} />
      ))}
    </div>
  );

  // Desktop track table for larger screens
  const DesktopTrackTable = () => (
    <table className="w-full border-collapse hidden md:table">
      <thead>
        <tr className="text-gray-400 border-b border-gray-800">
          <th className="font-normal py-3 w-12 pl-4">#</th>
          <th className="font-normal text-left py-3 pl-3">Title</th>
          <th className="font-normal text-left py-3 pl-3">Artist</th>
          <th className="font-normal text-left py-3 pl-3">Release Date</th>
          <th className="font-normal text-center py-3 w-20">
            <Clock className="h-4 w-4 inline" />
          </th>
        </tr>
      </thead>
      <tbody>
        {album.tracks?.map((track, index) => (
          <tr
            key={track.id}
            className={`group hover:bg-white/10 transition-colors ${
              Number(musicId) === Number(track.music_details.id) && isCurrentTrackFromAlbum() ? "bg-white/20" : ""
            }`}
            onClick={() => handlePlayTrack(track)}
          >
            <td className="py-3 pl-4">
              <div className="flex items-center justify-center w-8 group">
                <span className="group-hover:hidden">{index + 1}</span>
                <button
                  className="hidden group-hover:flex p-1 hover:text-white text-gray-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayTrack(track);
                  }}
                >
                  {Number(musicId) === Number(track.music_details.id) && isCurrentTrackFromAlbum() && isPlaying ? (
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
            <td className="py-3 pl-3 text-gray-400">
              {track.music_details.artist_full_name}
            </td>
            <td className="py-3 pl-3 text-gray-400">
              {new Date(track.music_details.release_date).toLocaleDateString()}
            </td>
            <td className="py-3 text-center text-gray-400 w-20">
              {formatDuration(track.music_details.duration)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="flex flex-col bg-gradient-to-b from-gray-900 via-black to-black text-white">
      {/* Container with padding bottom for music player */}
      <div className="pb-24 md:pb-32"> {/* Increased padding on larger screens */}
        {/* Header Section */}
        <div className="flex flex-col items-center md:items-start md:flex-row md:items-end gap-6 p-4 md:p-6">
          <div className="w-40 h-40 md:w-48 md:h-48 flex-shrink-0">
            <img
              src={album.cover_photo || "/api/placeholder/192/192"}
              alt={album.name}
              className="w-full h-full object-cover rounded-lg shadow-2xl"
            />
          </div>

          <div className="flex flex-col gap-2 md:gap-4 text-center md:text-left">
            <span className="text-xs md:text-sm font-medium uppercase tracking-wider text-gray-400">
              Album
            </span>
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold tracking-tight truncate max-w-full">
              {album.name}
            </h1>
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-gray-300 text-sm">
              <span>
                By <span className="text-white">{album.artist_username}</span>
              </span>
              <span className="hidden md:inline">•</span>
              <span>{album.tracks?.length || 0} songs</span>
              <span className="hidden md:inline">•</span>
              <span>{totalDuration}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center md:justify-start gap-4 p-4 md:p-6">
          <button
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors"
            onClick={handlePlayAlbum}
          >
            {isPlaying && isCurrentTrackFromAlbum() ? (
              <Pause className="h-5 w-5 md:h-6 md:w-6 text-black" />
            ) : (
              <Play className="h-5 w-5 md:h-6 md:w-6 text-black ml-1" />
            )}
          </button>

          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Share2 className="h-5 w-5 md:h-6 md:w-6" />
          </button>

          <button
            className={`p-2 transition-colors ${shuffle ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
            onClick={handleShuffle}
          >
            <Shuffle className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>

        {/* Track List - Responsive Layout */}
        <div className="p-4 md:p-6">
          {/* Mobile View */}
          <div className="md:hidden">
            <MobileTrackList />
          </div>
          
          {/* Desktop View */}
          <DesktopTrackTable />
        </div>
      </div>
      
      {/* Empty spacer to ensure content doesn't get hidden */}
      <div className="h-20 md:h-24" aria-hidden="true"></div>
    </div>
  );
};

export default AlbumPage;