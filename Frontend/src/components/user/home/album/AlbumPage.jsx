import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Play, Pause, Clock, Share2, Plus, Check, Shuffle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
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

// Mobile-optimized track component
const TrackItem = React.memo(({ 
  track, 
  index, 
  currentMusicId, 
  isCollectionActive, 
  isCollectionPlaying, 
  onPlayTrack 
}) => {
  const isThisTrackPlaying = useMemo(
    () => Number(currentMusicId) === Number(track.music_details.id) && isCollectionActive,
    [currentMusicId, isCollectionActive]
  );

  return (
    <div
      className={`flex items-center p-3 border-b border-gray-800 ${
        isThisTrackPlaying ? "bg-white/5" : ""
      } hover:bg-white/10 transition-colors cursor-pointer group`}
      onClick={() => onPlayTrack(track, index)}
    >
      <div className="flex flex-col items-center justify-center w-6 mr-3 h-8 relative group">
        {isThisTrackPlaying && isCollectionPlaying ? (
          <div className="flex items-center gap-0.5 h-3 items-end">
            <motion.span 
              animate={{ height: ["20%", "70%", "30%", "100%", "40%"] }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
              className="w-0.5 min-h-[3px] bg-green-500 rounded-full"
            />
            <motion.span 
              animate={{ height: ["40%", "100%", "50%", "80%", "60%"] }}
              transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut", delay: 0.1 }}
              className="w-0.5 min-h-[3px] bg-green-500 rounded-full"
            />
            <motion.span 
              animate={{ height: ["15%", "60%", "25%", "90%", "35%"] }}
              transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.2 }}
              className="w-0.5 min-h-[3px] bg-green-500 rounded-full"
            />
          </div>
        ) : (
          <>
            <span className={`text-sm font-medium group-hover:hidden ${isThisTrackPlaying ? 'text-green-500' : 'text-gray-400'}`}>
              {index + 1}
            </span>
            <button
              className="hidden group-hover:flex items-center justify-center p-1 hover:text-white text-gray-400 active:scale-90 transition-transform bg-black/40 rounded-full backdrop-blur-sm shadow-lg"
              onClick={(e) => { e.stopPropagation(); onPlayTrack(track, index); }}
            >
              {isThisTrackPlaying && isCollectionPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              )}
            </button>
          </>
        )}
      </div>

      <img
        src={track.music_details.cover_photo || "/api/v1/placeholder/40/40"}
        alt={track.music_details.name}
        className="w-10 h-10 rounded-md"
      />

      <div className="flex-1 min-w-0 ml-3">
        <div className={`font-medium text-sm truncate ${isThisTrackPlaying ? 'text-green-500' : ''}`}>
          {track.music_details.name}
        </div>
        <div className="text-xs text-gray-400 truncate">
          {track.music_details.artist_username}
        </div>
      </div>

      <span className="text-xs text-gray-400 ml-2 w-12 text-right">
        {formatDuration(track.music_details.duration)}
      </span>
    </div>
  );
}, (prev, next) => 
  prev.track.music_details.id === next.track.music_details.id && 
  prev.index === next.index && 
  prev.currentMusicId === next.currentMusicId && 
  prev.isCollectionActive === next.isCollectionActive &&
  prev.isCollectionPlaying === next.isCollectionPlaying
);

// Desktop track row component
const TrackRow = React.memo(({ 
  track, 
  index, 
  currentMusicId, 
  isCollectionActive, 
  isCollectionPlaying, 
  onPlayTrack 
}) => {
  const isThisTrackPlaying = useMemo(
    () => Number(currentMusicId) === Number(track.music_details.id) && isCollectionActive,
    [currentMusicId, isCollectionActive]
  );

  return (
    <tr
      className={`group hover:bg-white/10 transition-colors cursor-pointer ${
        isThisTrackPlaying ? "bg-white/5" : ""
      }`}
      onClick={() => onPlayTrack(track, index)}
    >
      <td className="py-3 pl-4">
        <div className="flex flex-col items-center justify-center w-8 h-8 relative group">
          {isThisTrackPlaying && isCollectionPlaying ? (
            <div className="flex items-center gap-0.5 h-3 items-end">
              <motion.span 
                animate={{ height: ["20%", "70%", "30%", "100%", "40%"] }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                className="w-0.5 min-h-[3px] bg-green-500 rounded-full"
              />
              <motion.span 
                animate={{ height: ["40%", "100%", "50%", "80%", "60%"] }}
                transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut", delay: 0.1 }}
                className="w-0.5 min-h-[3px] bg-green-500 rounded-full"
              />
              <motion.span 
                animate={{ height: ["15%", "60%", "25%", "90%", "35%"] }}
                transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.2 }}
                className="w-0.5 min-h-[3px] bg-green-500 rounded-full"
              />
            </div>
          ) : (
            <>
              <span className={`text-sm font-medium group-hover:hidden ${isThisTrackPlaying ? 'text-green-500' : 'text-gray-400'}`}>
                {index + 1}
              </span>
              <button
                className="hidden group-hover:flex items-center justify-center p-1.5 hover:text-white text-gray-400 active:scale-90 transition-transform bg-black/40 rounded-full backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); onPlayTrack(track, index); }}
              >
                {isThisTrackPlaying && isCollectionPlaying ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                )}
              </button>
            </>
          )}
        </div>
      </td>
      <td className="py-3 pl-6">
        <div className="flex items-center gap-3">
          <img
            src={track.music_details.cover_photo || "/api/v1/placeholder/40/40"}
            alt={track.music_details.name}
            className="w-10 h-10 rounded-md"
          />
          <span className={`font-medium ${isThisTrackPlaying ? 'text-green-500' : ''}`}>{track.music_details.name}</span>
        </div>
      </td>
      <td className="py-3 pl-6 text-gray-400">
        {track.music_details.artist_username}
      </td>
      <td className="py-3 text-center text-gray-400 w-20">
        {formatDuration(track.music_details.duration)}
      </td>
    </tr>
  );
}, (prev, next) => 
  prev.track.music_details.id === next.track.music_details.id && 
  prev.index === next.index && 
  prev.currentMusicId === next.currentMusicId && 
  prev.isCollectionActive === next.isCollectionActive &&
  prev.isCollectionPlaying === next.isCollectionPlaying
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
    if (!album) return;
    
    setIsLibraryLoading(true);
    try {
      dispatch(toggleSavedAlbumOptimistic({
        album: {
          id: albumId,
          name: album.name,
          cover_photo: album.cover_photo,
          artist_username: album.artist_username,
          release_year: album.release_year
        },
        isInLibrary: !isInLibrary
      }));
      
      await api.post(LIBRARY.TOGGLE_ALBUM(albumId));
      setIsInLibrary(prev => !prev);
    } catch (error) {
      console.error("Failed to toggle library status:", error);
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

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="h-36 w-36 md:h-48 md:w-48 bg-gray-700 animate-pulse rounded-lg mx-auto md:mx-0"></div>
        <div className="h-10 w-48 md:h-12 md:w-64 bg-gray-700 animate-pulse rounded mx-auto md:mx-0"></div>
        <div className="h-6 w-24 md:h-8 md:w-32 bg-gray-700 animate-pulse rounded mx-auto md:mx-0"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-red-500 text-center">{error}</div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-gray-800 rounded-md hover:bg-gray-700 text-white"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!album) return null;

  return (
    <div className="flex flex-col text-white pb-24 md:pb-28">
      <div className="flex flex-col items-center md:items-start md:flex-row md:items-end gap-4 md:gap-6 p-4 md:p-6">
        <div className="relative group w-36 h-36 md:w-48 md:h-48 flex-shrink-0">
          <img
            src={album.cover_photo || "/api/v1/placeholder/192/192"}
            alt={album.name}
            className="w-full h-full object-cover rounded-lg shadow-2xl"
          />
        </div>
        <div className="flex flex-col gap-2 md:gap-4 text-center md:text-left">
          <span className="text-xs md:text-sm font-medium uppercase tracking-wider text-gray-400 font-mono">
            {album.album_type || "Album"}
          </span>
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold tracking-tight">
            {album.name}
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-gray-300 flex-wrap">
            <span className="text-xs md:text-sm">
              <span className="text-white hover:underline cursor-pointer">{album.artist_username}</span>
            </span>
            <span className="hidden md:inline text-gray-500">•</span>
            <span className="text-xs md:text-sm">{album.release_year}</span>
            <span className="hidden md:inline text-gray-500">•</span>
            <span className="text-xs md:text-sm">{stableTracks.length} songs</span>
            <span className="hidden md:inline text-gray-500">•</span>
            <span className="text-xs md:text-sm">{totalDuration}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center md:justify-start gap-6 p-4 md:p-6">
        <button
          className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors duration-200 ease-in-out shadow-lg"
          onClick={handlePlayAlbum}
        >
          {isCollectionPlaying ? (
            <Pause className="h-5 w-5 md:h-6 md:w-6 text-black" />
          ) : (
            <Play className="h-5 w-5 md:h-6 md:w-6 text-black ml-0.5 md:ml-1" />
          )}
        </button>

        <button 
           onClick={handleToggleLibrary}
           disabled={isLibraryLoading}
           className={`p-2 transition-all duration-200 hover:scale-105 active:scale-95 ${isInLibrary ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}>
             {isInLibrary ? (
               <Check className="h-6 w-6 md:h-8 md:w-8" />
             ) : (
               <Plus className="h-6 w-6 md:h-8 md:w-8" />
             )}
        </button>

        <button className="p-2 text-gray-400 hover:text-white transition-colors duration-200 ease-in-out">
          <Share2 className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>

      <div className="flex-1 p-4 md:p-6 pb-20 md:pb-12">
        <div className="hidden md:block w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="font-normal py-3 w-12 pl-4">#</th>
                <th className="font-normal text-left py-3 pl-6 pr-4">Title</th>
                <th className="font-normal text-left py-3 pl-6 pr-4 text-xs uppercase tracking-wider">Artist</th>
                <th className="font-normal text-center py-3 w-20">
                  <Clock className="h-4 w-4 inline" />
                </th>
              </tr>
            </thead>
            <tbody>
              {stableTracks.map((track, index) => (
                <TrackRow 
                  key={track.music_details.id} 
                  track={track} 
                  index={index}
                  currentMusicId={currentMusicId}
                  isCollectionActive={isCurrentTrackFromAlbum}
                  isCollectionPlaying={isCollectionPlaying}
                  onPlayTrack={handlePlayTrack}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden">
          <div className="flex justify-between items-center mb-2 px-2 text-gray-400 text-sm font-medium">
            <div>#</div>
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
            </div>
          </div>
          <div className="rounded-lg overflow-hidden">
            {stableTracks.map((track, index) => (
              <TrackItem 
                key={track.music_details.id} 
                track={track} 
                index={index}
                currentMusicId={currentMusicId}
                isCollectionActive={isCurrentTrackFromAlbum}
                isCollectionPlaying={isCollectionPlaying}
                onPlayTrack={handlePlayTrack}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumPage;