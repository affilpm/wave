import React, { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import PlaylistSectionMenuModal from "./PlaylistSectionMenuModal";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { useNavigate } from "react-router-dom";
import api from "../../../../../api";
import { setQueue, setIsPlaying } from "../../../../../slices/user/playerSlice";
import { prepareTracksForPlayer } from "../../../../../utils/trackUtils";

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

const PlaylistSection = ({ title }) => {
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playlistData, setPlaylistData] = useState([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const username = useSelector((state) => state.user.username);
  const { currentTrack, status, queue, queueIndex, currentContext } = useSelector(
    selectPlayerState,
    shallowEqual
  );
  const currentMusicId = currentTrack?.id;
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';
  const currentIndex = queueIndex;

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await api.get(`/api/v1/home/playlist/?top10=true`);
        setPlaylistData(response.data.results || response.data || []);
      } catch (error) {
        console.error("Error fetching playlist items:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, []);

  const handlePlaylistClick = useCallback(
    (playlistId) => {
      const playlist = playlistData.find((item) => item.id === playlistId);
      if (playlist && playlist.created_by === username) {
        navigate(`/playlist/${playlistId}`);
      } else {
        navigate(`/saved-playlist/${playlistId}`);
      }
    },
    [playlistData, navigate, username]
  );

  const handlePlayClick = useCallback(
    async (e, item) => {
      e.stopPropagation();
      const isCurrentPlaylist = currentContext?.type === 'playlist' && String(currentContext?.id) === String(item.id);

      if (isCurrentPlaylist) {
        dispatch(setIsPlaying(!isPlaying));
      } else {
        try {
          // Fetch playlist data to get tracks
          const response = await api.get(`/api/v1/playlist/playlists/${item.id}/`);
          const data = response.data;
          const tracks = data.tracks || [];
          const formattedTracks = prepareTracksForPlayer(tracks);

          if (formattedTracks.length > 0) {
            dispatch(setQueue({
              tracks: formattedTracks,
              startIndex: 0,
              context: { type: 'playlist', id: item.id }
            }));
            dispatch(setIsPlaying(true));
          }
        } catch (error) {
          console.error("Error playing playlist:", error);
        }
      }
    },
    [dispatch, currentContext, isPlaying]
  );

  const handleShuffleClick = useCallback(
    async (e, item) => {
      e.stopPropagation();
      try {
        const response = await api.get(`/api/v1/playlist/playlists/${item.id}/`);
        const data = response.data;
        const tracks = data.tracks || [];
        const formattedTracks = prepareTracksForPlayer(tracks);

        if (formattedTracks.length > 0) {
          dispatch(setQueue({
            tracks: formattedTracks,
            startIndex: Math.floor(Math.random() * formattedTracks.length),
            context: { type: 'playlist', id: item.id }
          }));
          // Ideally we'd have a toggleShufflePlay action that takes tracks but setQueue with random start is similar if shuffleMode is on
          // Actually toggleShufflePlay in playerSlice.ts handles this better
          // dispatch(toggleShufflePlay(formattedTracks)); // Wait, toggleShufflePlay is not exported here yet
          dispatch(setIsPlaying(true));
        }
      } catch (error) {
        console.error("Error shuffling playlist:", error);
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

  const handleShowMore = () => {
    navigate("/playlist-show-more", { state: { title } });
  };

  if (loading) {
    return (
      <section className="mb-8 px-4">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-none w-40 h-40 bg-gray-800 animate-pulse rounded-md" />
          ))}
        </div>
      </section>
    );
  }

  if (!playlistData.length) return null;

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
            {playlistData.map((item) => {
              // Determine if this playlist is currently playing
              const isCurrentPlaylist = currentContext?.type === 'playlist' && String(currentContext?.id) === String(item.id);
              // Show pause button if this playlist is active and playing
              const showPauseButton = isCurrentPlaylist && isPlaying;
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