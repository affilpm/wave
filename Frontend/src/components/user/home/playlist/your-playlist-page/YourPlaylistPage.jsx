import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Play, Pause, Clock, Share2, X, Heart, Shuffle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
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
  toggleShufflePlay,
} from "../../../../../slices/user/playerSlice";
import { prepareTracksForPlayer } from "../../../../../utils/trackUtils";

// Memoized selector for player state
const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentTrack: player.currentTrack,
    status: player.status,
    queue: player.queue,
    queueIndex: player.queueIndex,
    currentContext: player.currentContext,
  })
);

const YourPlaylistPage = () => {
  const dispatch = useDispatch();
  const { playlistId } = useParams();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [trackToRemove, setTrackToRemove] = useState(null);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
  const [totalDuration, setTotalDuration] = useState("");

  const { currentTrack, status, queue, queueIndex, currentContext } = useSelector(
    selectPlayerState,
    shallowEqual
  );

  const currentMusicId = currentTrack?.id;
  const isPlaying = status === 'playing';

  // Memoize tracks for stable props
  const stableTracks = useMemo(() => playlist?.tracks || [], [playlist]);

  const context = useMemo(() => ({
    type: 'playlist',
    id: playlistId
  }), [playlistId]);

  // Memoize isCurrentTrackFromPlaylist
  const isCurrentTrackFromPlaylist = useMemo(() => {
    const isSameContext = currentContext?.type === context.type && String(currentContext?.id) === String(context.id);
    return isSameContext && stableTracks.some(track => track.music_details.id === currentMusicId);
  }, [currentMusicId, currentContext, context, stableTracks]);


  const handlePlayPlaylist = useCallback(() => {
    if (!stableTracks.length) return;

    if (isCurrentTrackFromPlaylist) {
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    const formattedTracks = prepareTracksForPlayer(stableTracks);
    dispatch(clearQueue());
    dispatch(setQueue({
      tracks: formattedTracks,
      startIndex: 0,
      context: context
    }));
    setCurrentPlaylistId(playlist.id);
    dispatch(setIsPlaying(true));
  }, [dispatch, isCurrentTrackFromPlaylist, isPlaying, playlist, stableTracks, context]);

  // Handle shuffle play
  const handleShufflePlay = useCallback(() => {
    if (!stableTracks.length) return;
    const formattedTracks = prepareTracksForPlayer(stableTracks);
    dispatch(toggleShufflePlay(formattedTracks));
    setCurrentPlaylistId(playlist.id);
  }, [dispatch, playlist, stableTracks]);

  const handlePlayTrack = useCallback(
    (track, index) => {
      const formattedTracks = prepareTracksForPlayer(stableTracks);
      const formattedTrack = formattedTracks[index];

      const isSameSong = Number(currentMusicId) === Number(formattedTrack.id);
      const isSameContext = currentContext?.type === context.type && String(currentContext?.id) === String(context.id);

      if (isSameSong && isSameContext) {
        dispatch(setIsPlaying(!isPlaying));
        return;
      }

      dispatch(clearQueue());
      dispatch(setQueue({
        tracks: formattedTracks,
        startIndex: index,
        context: context
      }));
      setCurrentPlaylistId(playlist.id);
      dispatch(setIsPlaying(true));
    },
    [currentMusicId, currentContext, context, isPlaying, playlist, stableTracks, dispatch]
  );

  // Handle edit playlist
  const handleEdit = useCallback(() => setIsEditModalOpen(true), []);

  const handleEditPlaylist = useCallback(
    (updatedPlaylist) => {
      setPlaylist(updatedPlaylist);
      const isSameContext = currentContext?.type === 'playlist' && String(currentContext?.id) === String(updatedPlaylist.id);
      if (isSameContext && updatedPlaylist.tracks) {
        const formattedTracks = prepareTracksForPlayer(updatedPlaylist.tracks);
        dispatch(setQueue({
          tracks: formattedTracks,
          context: { type: 'playlist', id: updatedPlaylist.id }
        }));
      }
    },
    [currentContext, dispatch]
  );

  // Handle toggle privacy
  const handleTogglePrivacy = useCallback(async () => {
    try {
      await api.patch(`/api/v1/playlist/playlists/${playlistId}/`, {
        is_public: !playlist.is_public,
      });
      setPlaylist((prev) => ({ ...prev, is_public: !prev.is_public }));
    } catch (err) {
      setError("Failed to update playlist privacy");
    }
  }, [playlist, playlistId]);

  // Handle delete playlist
  const handleDelete = useCallback(async () => {
    if (window.confirm("Are you sure you want to delete this playlist?")) {
      try {
        if (currentPlaylistId === playlist.id) {
          dispatch(clearQueue());
          setCurrentPlaylistId(null); // Reset currentPlaylistId
        }
        await api.delete(`/api/v1/playlist/playlists/${playlistId}/`);
        navigate("/home");
      } catch (err) {
        setError("Failed to delete playlist");
      }
    }
  }, [currentPlaylistId, dispatch, navigate, playlist, playlistId]);

  // Handle remove track confirmation
  const confirmRemoveTrack = useCallback((trackId, trackName) => {
    setTrackToRemove({ id: trackId, name: trackName });
    setShowRemoveConfirmation(true);
  }, []);

  // Handle remove track
  const handleRemoveTrack = useCallback(async () => {
    if (!trackToRemove) return;

    try {
      await api.post(`/api/v1/playlist/playlists/${playlistId}/remove-tracks/`, {
        track_ids: [trackToRemove.id],
      });

      await handleTracksUpdate();

      if (Number(currentPlaylistId) === Number(playlist.id)) {
        const updatedTracks = stableTracks.filter(
          (track) => track.music_details.id !== trackToRemove.id
        );
        const formattedTracks = prepareTracksForPlayer(updatedTracks);
        
        dispatch(setQueue({
          tracks: formattedTracks,
          context: { type: 'playlist', id: playlist.id }
        }));

        if (currentMusicId === trackToRemove.id) {
          if (formattedTracks.length > 0) {
            dispatch(playNext());
          } else {
            dispatch(clearQueue());
            dispatch(setIsPlaying(false));
            setCurrentPlaylistId(null);
          }
        }
      }

      setShowRemoveConfirmation(false);
      setTrackToRemove(null);
    } catch (err) {
      setError("Failed to remove track");
      setShowRemoveConfirmation(false);
    }
  }, [
    trackToRemove,
    currentPlaylistId,
    currentMusicId,
    playlist,
    stableTracks,
    dispatch,
    playlistId,
  ]);

  // Cancel remove track
  const cancelRemoveTrack = useCallback(() => {
    setShowRemoveConfirmation(false);
    setTrackToRemove(null);
  }, []);

  const handleTracksUpdate = useCallback(async () => {
    try {
      const response = await api.get(`/api/v1/playlist/playlists/${playlistId}/`);
      setPlaylist(response.data);
      const isSameContext = currentContext?.type === 'playlist' && String(currentContext?.id) === String(response.data.id);
      if (isSameContext && response.data.tracks) {
        const formattedTracks = prepareTracksForPlayer(response.data.tracks);
        dispatch(setQueue({
          tracks: formattedTracks,
          context: { type: 'playlist', id: response.data.id }
        }));
      }
    } catch (err) {
      setError("Failed to refresh playlist");
    }
  }, [currentContext, playlistId, dispatch]);

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
        const response = await api.get(`/api/v1/playlist/playlists/${playlistId}/`);
        setPlaylist(response.data);
        if (
          currentContext?.type === 'playlist' && 
          String(currentContext?.id) === String(response.data.id)
        ) {
          setCurrentPlaylistId(response.data.id);
        }
      } catch (err) {
        setError("Failed to load playlist");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistId, queue]);

  // TrackRow component
  const TrackRow = React.memo(
    ({ track, index }) => {
      const isThisTrackPlaying = useMemo(
        () => currentMusicId === track.music_details.id && isCurrentTrackFromPlaylist,
        [currentMusicId, isCurrentTrackFromPlaylist]
      );

      return (
        <tr
          className={`group hover:bg-white/10 transition-colors duration-200 ease-in-out ${
            isThisTrackPlaying ? "bg-white/20" : ""
          }`}
        >
          <td className="py-3 pl-4">
            <div className="flex items-center justify-center w-8">
              <span className="group-hover:hidden">{index + 1}</span>
              <button
                className="hidden group-hover:flex p-1 hover:text-white text-gray-400"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayTrack(track, index);
                }}
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
                src={track.music_details.cover_photo || "/api/v1/placeholder/40/40"}
                alt={track.music_details.name}
                className="w-10 h-10 rounded-md"
              />
              <span className="font-medium">{track.music_details.name}</span>
            </div>
          </td>
          <td className="py-3 pl-6 pr-4 text-gray-400">{track.music_details.artist_username}</td>
          <td className="py-3 pl-6 pr-4 text-gray-400">{track.music_details.release_date}</td>
          <td className="py-3 text-center text-gray-400 w-20">
            {formatDuration(track.music_details.duration)}
          </td>
          <td className="py-3 pr-6 text-right">
            <button
              className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-400 transition-opacity duration-200 ease-in-out"
              onClick={(e) => {
                e.stopPropagation();
                confirmRemoveTrack(track.music_details.id, track.music_details.name);
              }}
            >
              {playlist?.name === "Liked Songs" ? (
                <Heart className="h-4 w-4" fill="currentColor" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
          </td>
        </tr>
      );
    },
    (prevProps, nextProps) =>
      prevProps.track === nextProps.track && prevProps.index === nextProps.index
  );

  // TrackCard component
  const TrackCard = React.memo(
    ({ track, index }) => {
      const isThisTrackPlaying = useMemo(
        () => currentMusicId === track.music_details.id && isCurrentTrackFromPlaylist,
        [currentMusicId, isCurrentTrackFromPlaylist]
      );

      return (
        <div
          className={`group flex items-center p-3 border-b border-gray-800 gap-3 ${
            isThisTrackPlaying ? "bg-white/20" : ""
          } hover:bg-white/10 transition-colors duration-200 ease-in-out`}
        >
          <div className="w-6 text-center text-sm text-gray-400">
            <span className="group-hover:hidden">{index + 1}</span>
            <button
              className="hidden group-hover:block"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayTrack(track, index);
              }}
            >
              {isThisTrackPlaying && isPlaying ? (
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
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{track.music_details.name}</div>
            <div className="text-sm text-gray-400 truncate">
              {track.music_details.artist_username}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{formatDuration(track.music_details.duration)}</span>
            <button
              className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-400 transition-opacity duration-200 ease-in-out"
              onClick={(e) => {
                e.stopPropagation();
                confirmRemoveTrack(track.music_details.id, track.music_details.name);
              }}
            >
              {playlist?.name === "Liked Songs" ? (
                <Heart className="h-4 w-4" fill="currentColor" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      );
    },
    (prevProps, nextProps) =>
      prevProps.track === nextProps.track && prevProps.index === nextProps.index
  );

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
      <div className="p-4 md:p-6">
        <div className="text-red-500 text-center">{error}</div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-gray-400 text-center">Playlist not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white pb-24 md:pb-28">
      <div className="flex flex-col items-center md:items-start md:flex-row md:items-end gap-4 md:gap-6 p-4 md:p-6">
        <div className="relative group w-36 h-36 md:w-48 md:h-48 flex-shrink-0">
          {playlist.name === "Liked Songs" ? (
            <div className="w-full h-full relative">
              <div className="w-full h-full relative bg-gradient-to-br from-purple-700 via-pink-600 to-red-500 rounded-lg shadow-2xl flex items-center justify-center">
                <Heart className="h-20 w-20 md:h-28 md:w-28 text-white" fill="currentColor" />
              </div>
            </div>
          ) : (
            <img
              src={playlist.cover_photo || "/api/v1/placeholder/192/192"}
              alt={playlist.name}
              className="w-full h-full object-cover rounded-lg shadow-2xl transition-opacity duration-200 ease-in-out group-hover:opacity-75"
            />
          )}
          {playlist.name !== "Liked Songs" && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out">
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-md backdrop-blur-sm text-xs md:text-sm font-medium transition-colors duration-200 ease-in-out"
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
              Created by <span className="text-white">{playlist.created_by_username}</span>
            </span>
            <span className="hidden md:inline text-gray-500">•</span>
            <span className="text-xs md:text-sm">{stableTracks.length} songs</span>
            <span className="hidden md:inline text-gray-500">•</span>
            <span className="text-xs md:text-sm">{totalDuration}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center md:justify-start gap-4 p-4 md:p-6">
        <button
          className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors duration-200 ease-in-out shadow-lg"
          onClick={handlePlayPlaylist}
        >
          {isPlaying && isCurrentTrackFromPlaylist ? (
            <Pause className="h-5 w-5 md:h-6 md:w-6 text-black" />
          ) : (
            <Play className="h-5 w-5 md:h-6 md:w-6 text-black ml-0.5 md:ml-1" />
          )}
        </button>

        <button
          className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/20 hover:bg-white/10 flex items-center justify-center transition-colors shadow-lg"
          onClick={handleShufflePlay}
          title="Shuffle Play"
        >
          <Shuffle className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </button>
        <button className="p-2 text-gray-400 hover:text-white transition-colors duration-200 ease-in-out">
          <Share2 className="h-5 w-5 md:h-6 md:w-6" />
        </button>
        {playlist.name !== "Liked Songs" && (
          <PlaylistMenuModal
            playlist={playlist}
            onEdit={handleEdit}
            onTogglePrivacy={handleTogglePrivacy}
            onDelete={handleDelete}
          />
        )}
      </div>

      <div className="flex-1 p-4 md:p-6 pb-20 md:pb-12">
        <div className="hidden md:block w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="font-normal py-3 w-12 pl-4">#</th>
                <th className="font-normal text-left py-3 pl-6">Title</th>
                <th className="font-normal text-left py-3 pl-6 pr-4">Artist</th>
                <th className="font-normal text-left py-3 pl-6 pr-4">Added</th>
                <th className="font-normal text-center py-3 w-20">
                  <Clock className="h-4 w-4 inline" />
                </th>
                <th className="w-8 pr-6"></th>
              </tr>
            </thead>
            <tbody>
              {stableTracks.map((track, index) => (
                <TrackRow key={track.music_details.id} track={track} index={index} />
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
              <TrackCard key={track.music_details.id} track={track} index={index} />
            ))}
          </div>
        </div>
        {playlist.name !== "Liked Songs" && (
          <div className="mt-6">
            <TrackSearch playlistId={playlistId} onTracksUpdate={handleTracksUpdate} />
          </div>
        )}
      </div>

      {playlist.name !== "Liked Songs" && (
        <EditPlaylistModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onEditPlaylist={handleEditPlaylist}
          playlist={playlist}
        />
      )}

      {showRemoveConfirmation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-4 md:p-6 max-w-md w-full">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">
              Remove from playlist?
            </h3>
            <p className="text-gray-300 text-sm md:text-base mb-4 md:mb-6">
              Are you sure you want to remove "{trackToRemove?.name}" from this playlist?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelRemoveTrack}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-transparent hover:bg-white/10 rounded-md text-white text-sm transition-colors duration-200 ease-in-out"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveTrack}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-red-600 hover:bg-red-700 rounded-md text-white text-sm transition-colors duration-200 ease-in-out"
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

YourPlaylistPage.displayName = 'YourPlaylistPage';
export default YourPlaylistPage;