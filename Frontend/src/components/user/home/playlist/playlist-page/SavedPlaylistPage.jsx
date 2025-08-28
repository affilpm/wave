import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Play, Pause, Clock, Share2, Plus, Check, Heart } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import api from "../../../../../api";
import {
  formatDuration,
  convertToSeconds,
  convertToHrMinFormat,
} from "../../../../../utils/formatters";
import {
  setCurrentMusic,
  setIsPlaying,
  setQueue,
  clearQueue,
} from "../../../../../slices/user/playerSlice";

// Memoized selector for player state
const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentMusicId: player.currentMusicId,
    isPlaying: player.isPlaying,
    queue: player.queue,
    currentIndex: player.currentIndex,
  })
);

const SavedPlaylistPage = () => {
  const dispatch = useDispatch();
  const { playlistId } = useParams();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalDuration, setTotalDuration] = useState("");
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);

  const { currentMusicId, isPlaying, queue, currentIndex } = useSelector(
    selectPlayerState,
    shallowEqual
  );

  // Memoize tracks for stable props
  const stableTracks = useMemo(() => playlist?.tracks || [], [playlist]);

  // Memoize isCurrentTrackFromPlaylist with debug logging
  const isCurrentTrackFromPlaylist = useMemo(() => {
    if (!playlist?.tracks || !currentMusicId || currentPlaylistId !== playlist?.id) {
      console.log("isCurrentTrackFromPlaylist: Early return", {
        hasTracks: !!playlist?.tracks,
        currentMusicId,
        currentPlaylistId,
        playlistId: playlist?.id,
      });
      return false;
    }
    const currentTrack = queue[currentIndex];
    const isTrackInPlaylist = playlist.tracks.some(
      (track) => Number(track.music_details.id) === Number(currentMusicId)
    );
    console.log("isCurrentTrackFromPlaylist: Result", {
      currentTrack,
      isTrackInPlaylist,
      currentMusicId,
    });
    return (
      currentTrack &&
      Number(currentTrack.id) === Number(currentMusicId) &&
      isTrackInPlaylist
    );
  }, [playlist, currentMusicId, currentPlaylistId, queue, currentIndex]);

  // Memoize track preparation
  const prepareTrackForPlayer = useCallback(
    (track) => ({
      id: Number(track.music_details.id), // Ensure ID is a number
      name: track.music_details.name,
      title: track.music_details.name,
      artist: track.music_details.artist_username,
      artist_full: track.music_details.artist_full_name,
      album: track.music_details.album_name || playlist?.name || "Unknown Album",
      cover_photo: track.music_details.cover_photo,
      duration: convertToSeconds(track.music_details.duration || "00:00:00"),
      genre: track.music_details.genre || "",
      year: track.music_details.release_date
        ? new Date(track.music_details.release_date).getFullYear()
        : null,
      release_date: track.music_details.release_date,
      track_number: track.track_number || 0,
      playlist_id: Number(playlist?.id) || null, // Ensure playlist_id is a number
      playlist_name: playlist?.name || "Unknown Playlist",
    }),
    [playlist]
  );

  // Handle play playlist
  const handlePlayPlaylist = useCallback(() => {
    if (!stableTracks.length) return;

    if (isCurrentTrackFromPlaylist) {
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    const formattedTracks = stableTracks.map(prepareTrackForPlayer);
    dispatch(clearQueue());
    dispatch(setQueue(formattedTracks));
    setCurrentPlaylistId(Number(playlist.id)); // Set currentPlaylistId as number

    if (formattedTracks.length > 0) {
      dispatch(setCurrentMusic(formattedTracks[0]));
      dispatch(setIsPlaying(true));
    }
  }, [dispatch, isCurrentTrackFromPlaylist, isPlaying, playlist, stableTracks, prepareTrackForPlayer]);

  // Handle play track
  const handlePlayTrack = useCallback(
    (track, index) => {
      const formattedTracks = stableTracks.map(prepareTrackForPlayer);
      const formattedTrack = formattedTracks[index];

      if (Number(currentMusicId) === Number(formattedTrack.id) && currentPlaylistId === Number(playlist.id)) {
        dispatch(setIsPlaying(!isPlaying));
        return;
      }

      if (currentPlaylistId !== Number(playlist.id)) {
        dispatch(clearQueue());
        dispatch(setQueue(formattedTracks));
        setCurrentPlaylistId(Number(playlist.id)); // Set currentPlaylistId as number
      }

      dispatch(setCurrentMusic(formattedTrack));
      dispatch(setIsPlaying(true));
    },
    [currentMusicId, currentPlaylistId, isPlaying, playlist, stableTracks, dispatch, prepareTrackForPlayer]
  );

  // Check if playlist is in library
  const checkLibraryStatus = useCallback(async () => {
    try {
      const response = await api.get(`/api/library/library/check-playlist/${playlistId}/`);
      setIsInLibrary(response.data.is_in_library);
    } catch (error) {
      console.error("Failed to check library status:", error);
    }
  }, [playlistId]);

  // Toggle playlist in library
  const handleToggleLibrary = useCallback(async () => {
    if (playlist?.created_by === "current_user") {
      return;
    }

    try {
      setIsLibraryLoading(true);
      if (isInLibrary) {
        await api.post('/api/library/remove_playlist/', { playlist_id: playlistId });
        setIsInLibrary(false);
      } else {
        await api.post('/api/library/library/add-playlist/', { playlist_id: playlistId });
        setIsInLibrary(true);
      }
    } catch (error) {
      console.error("Failed to update library:", error);
    } finally {
      setIsLibraryLoading(false);
    }
  }, [isInLibrary, playlist, playlistId]);

  // Calculate total duration
  useEffect(() => {
    const calculateTotalDuration = () => {
      if (stableTracks.length) {
        const totalSeconds = stableTracks.reduce((acc, track) => {
          const trackDuration = track.music_details?.duration || "00:00:00";
          return acc + convertToSeconds(trackDuration);
        }, 0);
        setTotalDuration(convertToHrMinFormat(totalSeconds));
      }
    };

    calculateTotalDuration();
  }, [stableTracks]);

  // Fetch playlist and initialize currentPlaylistId
  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const response = await api.get(`/api/playlist/playlists/${playlistId}/`);
        setPlaylist(response.data);
        // Initialize currentPlaylistId if queue matches this playlist
        if (
          queue.length > 0 &&
          queue.some((track) => Number(track.playlist_id) === Number(response.data.id))
        ) {
          setCurrentPlaylistId(Number(response.data.id));
        }
        checkLibraryStatus();
      } catch (err) {
        setError("Failed to load playlist");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistId, queue, checkLibraryStatus]);


  // Mobile-optimized track component
  const TrackItem = React.memo(({ track, index }) => {
    const isThisTrackPlaying = Number(currentMusicId) === Number(track.music_details.id) &&
                              isCurrentTrackFromPlaylist;

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
  });

  // Desktop track row component
  const TrackRow = React.memo(({ track, index }) => {
    const isThisTrackPlaying = Number(currentMusicId) === Number(track.music_details.id) &&
                              isCurrentTrackFromPlaylist;

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
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-36 w-36 sm:h-48 sm:w-48 bg-gray-700 animate-pulse rounded-lg mx-auto sm:mx-0"></div>
        <div className="h-10 w-56 bg-gray-700 animate-pulse rounded mx-auto sm:mx-0"></div>
        <div className="h-6 w-28 bg-gray-700 animate-pulse rounded mx-auto sm:mx-0"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-red-500 text-center">{error}</div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-gray-400 text-center">Playlist not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white pb-24 sm:pb-28">
      {/* Header Section */}
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

      {/* Action Buttons */}
      <div className="flex items-center justify-center sm:justify-start gap-4 p-4 sm:p-6">
        <button
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors shadow-lg"
          onClick={handlePlayPlaylist}
        >
          {isPlaying && isCurrentTrackFromPlaylist ? (
            <Pause className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
          ) : (
            <Play className="h-5 w-5 sm:h-6 sm:w-6 text-black ml-0.5 sm:ml-1" />
          )}
        </button>

        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
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
        </div>
      </div>

      {/* Track List */}
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
              {stableTracks.map((track, index) => (
                <TrackRow key={track.music_details.id} track={track} index={index} />
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
            {stableTracks.map((track, index) => (
              <TrackItem key={track.music_details.id} track={track} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedPlaylistPage;