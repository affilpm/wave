import React, { useState, useRef, useCallback, useMemo } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import PlaylistSectionMenuModal from "./PlaylistSectionMenuModal";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { useNavigate } from "react-router-dom";
import { handlePlaybackAction } from "./playlist-utils";
import { toggleShufflePlay } from "../../../../../slices/user/playerSlice";
import { fetchPlaylistTracks } from "./playlist-utils";
import { Shuffle } from "lucide-react";

const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentTrack: player.currentTrack,
    status: player.status,
    queue: player.queue,
    queueIndex: player.queueIndex,
  })
);

const PlaylistSection = ({ title, items, onLengthChange }) => {
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const username = useSelector((state) => state.user.username);
  const { currentTrack, status, queue, queueIndex } = useSelector(
    selectPlayerState,
    shallowEqual
  );
  const currentMusicId = currentTrack?.id;
  const isPlaying = status === 'playing';
  const currentIndex = queueIndex;

  const handlePlaylistClick = useCallback(
    (playlistId) => {
      const playlist = items.find((item) => item.id === playlistId);
      if (playlist && playlist.created_by === username) {
        navigate(`/playlist/${playlistId}`);
      } else {
        navigate(`/saved-playlist/${playlistId}`);
      }
    },
    [items, navigate, username]
  );

  const handlePlayClick = useCallback(
    async (e, item) => {
      e.stopPropagation();
      await handlePlaybackAction({
        playlistId: item.id,
        dispatch,
        currentState: { currentMusicId, isPlaying, queue, currentIndex },
      });
    },
    [dispatch, currentMusicId, isPlaying, queue, currentIndex]
  );

  const handleShuffleClick = useCallback(
    async (e, item) => {
      e.stopPropagation();
      const result = await fetchPlaylistTracks(item.id);
      if (result && result.tracks) {
        // We'll need to format them. Since handlePlaybackAction does formatting,
        // let's just use it with a shuffle flag if it supported it. It doesn't.
        // I'll manually format them here or update utils.
        // For now, let's keep it simple: fetch and dispatch toggleShufflePlay.
        // Note: fetchPlaylistTracks returns raw tracks.
        // I'll just use a simplified formatting for shuffle play here.
        const formatted = result.tracks.map(track => ({
             id: Number(track.music_details?.id || track.id),
             name: track.music_details?.name || track.name,
             title: track.music_details?.name || track.name,
             artist: track.music_details?.artist_username || track.artist,
             audio_file: track.music_details?.audio_file || track.audio_file,
             cover_photo: track.music_details?.cover_photo || track.cover_photo,
             playlist_id: Number(item.id),
        }));
        dispatch(toggleShufflePlay(formatted));
      }
    },
    [dispatch]
  );

  const handleScroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const memoizedItems = useMemo(() => items, [items]);

  const handleShowMore = () => {
    navigate("/playlist-show-more", { state: { title } });
  };

  if (!memoizedItems.length) return null;

  return (
    <section className="mb-8 relative">
      <div className="flex justify-between items-center mb-4 px-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <button
          onClick={handleShowMore}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Show all
        </button>
      </div>
      <div
        className="relative"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {showControls && (
          <>
            <button
              onClick={() => handleScroll("left")}
              className="absolute left-0 top-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transform -translate-y-1/2 transition-transform hover:scale-110"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => handleScroll("right")}
              className="absolute right-0 top-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transform -translate-y-1/2 transition-transform hover:scale-110"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="flex gap-4 px-4">
            {memoizedItems.map((item) => {
              // Determine if this playlist is currently playing
              const isCurrentPlaylist = queue.some(
                (track) => track.playlist_id === item.id
              );
              // Show pause button if this playlist is active and playing
              const showPauseButton = isCurrentPlaylist && isPlaying && currentMusicId;
              return (
                <div
                  key={item.id}
                  className="flex-none w-40"
                  onClick={() => handlePlaylistClick(item.id)}
                >
                  <div className="relative group">
                    <img
                      src={item.cover_photo}
                      alt={item.name}
                      className="w-40 h-40 object-cover rounded-md shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-md">
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <button
                          className="w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full items-center justify-center hidden group-hover:flex shadow-xl transition-all"
                          onClick={(e) => handleShuffleClick(e, item)}
                          title="Shuffle Play"
                        >
                          <Shuffle className="w-5 h-5 text-white" />
                        </button>
                        <button
                          className="w-12 h-12 bg-green-500 rounded-full items-center justify-center hidden group-hover:flex shadow-xl hover:scale-105 transition-all"
                          onClick={(e) => handlePlayClick(e, item)}
                        >
                          {showPauseButton ? (
                            <Pause className="w-6 h-6 text-black" />
                          ) : (
                            <Play className="w-6 h-6 text-black" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2">
                      <PlaylistSectionMenuModal
                        playlist={{
                          id: item.id,
                          name: item.name,
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <h3 className="font-bold text-white truncate">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-400 truncate">{item.description}</p>
                    )}
                    {item.created_by && (
                      <p className="text-sm text-gray-400 truncate">By {item.created_by}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(PlaylistSection);