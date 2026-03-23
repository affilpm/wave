import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Play, Pause, Clock, Share2, Plus, Check, Shuffle } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import api from "../../../../api";
import { LIBRARY } from "../../../../constants/apiEndpoints";
import {
  formatDuration,
  convertToSeconds,
  convertToHrMinFormat,
} from "../../../../utils/formatters";
import { prepareTracksForPlayer } from "../../../../utils/trackUtils";
import { usePlayCollection } from "../../../../hooks/usePlayCollection";
import { toggleSavedAlbumOptimistic } from "../../../../slices/user/librarySlice";

// Memoized selector for player state
const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentTrack: player.currentTrack,
    currentContext: player.currentContext,
  })
);

const AlbumPage = () => {
  const dispatch = useDispatch();
  const { albumId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const autoPlayHandled = useRef(false);

  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalDuration, setTotalDuration] = useState("");
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);

  const { currentTrack, currentContext } = useSelector(
    selectPlayerState,
    shallowEqual
  );
  
  const currentMusicId = currentTrack?.id;

  // Memoize tracks for stable props
  const stableTracks = useMemo(() => album?.tracks || [], [album]);

  const context = useMemo(() => ({
    type: 'album',
    id: albumId
  }), [albumId]);

  // Prepare formatted tracks for the player
  const formattedTracks = useMemo(
    () => prepareTracksForPlayer(stableTracks.map(t => t.music_details)),
    [stableTracks]
  );

  // Hook handles all play/pause/toggle/shuffle logic
  const {
    handlePlayCollection: handlePlayAlbum,
    handlePlayTrackAtIndex,
    handleShufflePlay,
    isCollectionPlaying,
    isCollectionActive: isCurrentTrackFromAlbum,
  } = usePlayCollection({ tracks: formattedTracks, context });

  const handlePlayTrack = useCallback(
    (_track, index) => {
      handlePlayTrackAtIndex(index);
    },
    [handlePlayTrackAtIndex]
  );
  
  // Handle autoPlay from location state
  useEffect(() => {
    if (stableTracks.length > 0 && !autoPlayHandled.current) {
      if (location.state?.autoPlay) {
        if (location.state?.autoShuffle) {
          handleShufflePlay();
        } else {
          handlePlayAlbum();
        }
        navigate(location.pathname, { replace: true, state: {} });
      }
      autoPlayHandled.current = true;
    }
  }, [stableTracks.length, location.state, location.pathname, handlePlayAlbum, handleShufflePlay, navigate]);

  // Check if album is in library
  const checkLibraryStatus = useCallback(async () => {
    try {
      const response = await api.get(LIBRARY.CHECK_ALBUM(albumId));
      setIsInLibrary(response.data.is_in_library);
    } catch (error) {
      console.error("Failed to check library status:", error);
    }
  }, [albumId]);

  // Toggle album in library
  const handleToggleLibrary = useCallback(async () => {
    const albumData = { id: Number(albumId), name: album?.name, cover_photo: album?.cover_photo, artist_username: album?.artist_username };
    
    // Optimistic update — update sidebar immediately
    const wasInLibrary = isInLibrary;
    setIsInLibrary(!wasInLibrary);
    dispatch(toggleSavedAlbumOptimistic(albumData));
    
    try {
      setIsLibraryLoading(true);
      if (wasInLibrary) {
        await api.post(LIBRARY.REMOVE_ALBUM, { album_id: albumId });
      } else {
        await api.post(LIBRARY.ADD_ALBUM, { album_id: albumId });
      }
    } catch (error) {
      console.error("Failed to update library:", error?.response?.data || error);
      // Revert optimistic update on failure
      setIsInLibrary(wasInLibrary);
      dispatch(toggleSavedAlbumOptimistic(albumData));
    } finally {
      setIsLibraryLoading(false);
    }
  }, [isInLibrary, albumId, album, dispatch]);

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

  // Fetch album and initialize currentAlbumId
  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const response = await api.get(`/api/v1/album/album-data/${albumId}/`);
        setAlbum(response.data);
        checkLibraryStatus();
      } catch (err) {
        setError("Failed to load album");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbum();
  }, [albumId, checkLibraryStatus]);

  const TrackItem = React.memo(({ track, index }) => {
    const isSameSong = Number(currentMusicId) === Number(track.music_details.id);
    const isSameContext = currentContext?.type === context.type && String(currentContext?.id) === String(context.id);
    const isThisTrackPlaying = isSameSong && isSameContext;

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
            {isThisTrackPlaying && isCollectionPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
        </div>

        <img
          src={track.music_details.cover_photo || "/api/v1/placeholder/40/40"}
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

  const TrackRow = React.memo(({ track, index }) => {
    const isSameSong = Number(currentMusicId) === Number(track.music_details.id);
    const isSameContext = currentContext?.type === context.type && String(currentContext?.id) === String(context.id);
    const isThisTrackPlaying = isSameSong && isSameContext;

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
              {isThisTrackPlaying && isCollectionPlaying ? (
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
              src={track.music_details.cover_photo || "/api/v1/placeholder/40/40"}
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
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-gray-800 rounded-md hover:bg-gray-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-gray-400 text-center">Album not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white pb-24 sm:pb-28">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-4 sm:p-6 pt-6">
        <div className="w-36 h-36 sm:w-48 sm:h-48 flex-shrink-0 shadow-xl">
          <img
            src={album.cover_photo || "/api/v1/placeholder/192/192"}
            alt={album.name}
            className="w-full h-full object-cover rounded-lg shadow-2xl"
          />
        </div>

        <div className="flex flex-col gap-2 sm:gap-4 text-center sm:text-left">
          <span className="text-xs sm:text-sm font-medium uppercase tracking-wider text-gray-400">
            Album
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight">
            {album.name}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-gray-300 text-xs sm:text-sm">
            <span>
              By <span className="text-white">{album.artist_username}</span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span>{album.tracks?.length || 0} songs</span>
            <span className="hidden sm:inline">•</span>
            <span>{totalDuration}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center sm:justify-start gap-4 p-4 sm:p-6">
        <button
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors shadow-lg"
          onClick={handlePlayAlbum}
        >
          {isCollectionPlaying ? (
            <Pause className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
          ) : (
            <Play className="h-5 w-5 sm:h-6 sm:w-6 text-black ml-0.5 sm:ml-1" />
          )}
        </button>

        <button
          className="w-12 h-12 rounded-full border border-white/20 hover:bg-white/10 flex items-center justify-center transition-colors"
          onClick={handleShufflePlay}
          title="Shuffle Play"
        >
          <Shuffle className="h-5 w-5 text-white" />
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
            {stableTracks.map((track, index) => (
              <TrackItem key={track.id} track={track} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumPage;