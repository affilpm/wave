import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Play, Pause, Clock, Share2, Plus, Check } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import api from "../../../../api";
import {
  formatDuration,
  convertToSeconds,
  convertToHrMinFormat,
} from "../../../../utils/formatters";
import {
  setCurrentMusic,
  setIsPlaying,
  setQueue,
  clearQueue,
} from "../../../../slices/user/playerSlice";

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

const AlbumPage = () => {
  const dispatch = useDispatch();
  const { albumId } = useParams();
  const navigate = useNavigate();

  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalDuration, setTotalDuration] = useState("");
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [currentAlbumId, setCurrentAlbumId] = useState(null);

  const { currentMusicId, isPlaying, queue, currentIndex } = useSelector(
    selectPlayerState,
    shallowEqual
  );

  // Memoize tracks for stable props
  const stableTracks = useMemo(() => album?.tracks || [], [album]);

  // Memoize isCurrentTrackFromAlbum
  const isCurrentTrackFromAlbum = useMemo(() => {
    if (!album?.tracks || !currentMusicId || currentAlbumId !== album?.id) {
      return false;
    }
    const currentTrack = queue[currentIndex];
    const isTrackInAlbum = album.tracks.some(
      (track) => Number(track.music_details.id) === Number(currentMusicId)
    );
    return (
      currentTrack &&
      Number(currentTrack.id) === Number(currentMusicId) &&
      isTrackInAlbum
    );
  }, [album, currentMusicId, currentAlbumId, queue, currentIndex]);

  // Memoize track preparation
  const prepareTrackForPlayer = useCallback(
    (track) => ({
      id: Number(track.music_details.id),
      name: track.music_details.name,
      title: track.music_details.name,
      artist: track.music_details.artist_username,
      artist_full: track.music_details.artist_full_name,
      album: track.music_details.album_name || album?.name || "Unknown Album",
      cover_photo: track.music_details.cover_photo,
      duration: convertToSeconds(track.music_details.duration || "00:00:00"),
      genre: track.music_details.genre || "",
      year: track.music_details.release_date
        ? new Date(track.music_details.release_date).getFullYear()
        : null,
      release_date: track.music_details.release_date,
      track_number: track.track_number || 0,
      album_id: Number(album?.id) || null,
      album_name: album?.name || "Unknown Album",
    }),
    [album]
  );

  // Handle play album
  const handlePlayAlbum = useCallback(() => {
    if (!stableTracks.length) return;

    if (isCurrentTrackFromAlbum) {
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    const formattedTracks = stableTracks.map(prepareTrackForPlayer);
    dispatch(clearQueue());
    dispatch(setQueue(formattedTracks));
    setCurrentAlbumId(Number(album.id));

    if (formattedTracks.length > 0) {
      dispatch(setCurrentMusic(formattedTracks[0]));
      dispatch(setIsPlaying(true));
    }
  }, [dispatch, isCurrentTrackFromAlbum, isPlaying, album, stableTracks, prepareTrackForPlayer]);

  // Handle play track
  const handlePlayTrack = useCallback(
    (track, index) => {
      const formattedTracks = stableTracks.map(prepareTrackForPlayer);
      const formattedTrack = formattedTracks[index];

      if (Number(currentMusicId) === Number(formattedTrack.id) && currentAlbumId === Number(album.id)) {
        dispatch(setIsPlaying(!isPlaying));
        return;
      }

      if (currentAlbumId !== Number(album.id)) {
        dispatch(clearQueue());
        dispatch(setQueue(formattedTracks));
        setCurrentAlbumId(Number(album.id));
      }

      dispatch(setCurrentMusic(formattedTrack));
      dispatch(setIsPlaying(true));
    },
    [currentMusicId, currentAlbumId, isPlaying, album, stableTracks, dispatch, prepareTrackForPlayer]
  );

  // Check if album is in library
  const checkLibraryStatus = useCallback(async () => {
    try {
      const response = await api.get(`/api/library/library/check-album/${albumId}/`);
      setIsInLibrary(response.data.is_in_library);
    } catch (error) {
      console.error("Failed to check library status:", error);
    }
  }, [albumId]);

  // Toggle album in library
  const handleToggleLibrary = useCallback(async () => {
    try {
      setIsLibraryLoading(true);
      if (isInLibrary) {
        await api.post('/api/library/remove-album/', { album_id: albumId });
        setIsInLibrary(false);
      } else {
        await api.post('/api/library/library/add-album/', { album_id: albumId });
        setIsInLibrary(true);
      }
    } catch (error) {
      console.error("Failed to update library:", error);
    } finally {
      setIsLibraryLoading(false);
    }
  }, [isInLibrary, albumId]);

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
        const response = await api.get(`/api/album/album-data/${albumId}/`);
        setAlbum(response.data);
        if (
          queue.length > 0 &&
          queue.some((track) => Number(track.album_id) === Number(response.data.id))
        ) {
          setCurrentAlbumId(Number(response.data.id));
        }
        checkLibraryStatus();
      } catch (err) {
        setError("Failed to load album");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbum();
  }, [albumId, queue, checkLibraryStatus]);

  // Mobile-optimized track component
  const TrackItem = React.memo(({ track, index }) => {
    const isThisTrackPlaying = Number(currentMusicId) === Number(track.music_details.id) &&
                              isCurrentTrackFromAlbum;

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
                              isCurrentTrackFromAlbum;

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
            src={album.cover_photo || "/api/placeholder/192/192"}
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
          {isPlaying && isCurrentTrackFromAlbum ? (
            <Pause className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
          ) : (
            <Play className="h-5 w-5 sm:h-6 sm:w-6 text-black ml-0.5 sm:ml-1" />
          )}
        </button>

        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* <button
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
          </button> */}
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