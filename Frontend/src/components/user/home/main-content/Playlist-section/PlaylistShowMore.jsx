import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import PlaylistSectionMenuModal from "./PlaylistSectionMenuModal";
import { handlePlaybackAction } from "./playlist-utils";
import api from "../../../../../api";

const selectPlayerState = createSelector(
  [(state) => state.player], 
  (player) => ({
    currentMusicId: player.currentMusicId,
    isPlaying: player.isPlaying,
    queue: player.queue || [],
    currentIndex: player.currentIndex || 0,
    currentPlaylistId: player.currentPlaylistId,
  })
);

const PlaylistShowMorePage = () => {
  const location = useLocation();
  const { title } = location.state || {};
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const username = useSelector((state) => state.user.username);
  const { currentMusicId, isPlaying, queue, currentIndex } = useSelector(
    selectPlayerState,
    shallowEqual
  );
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const musiclistResponse = await api.get(`/api/home/playlist/?all_songs&page=${page}`);
        setItems(musiclistResponse.data.results);
        setHasNextPage(!!musiclistResponse.data.next);
        setTotalPages(Math.ceil(musiclistResponse.data.count / musiclistResponse.data.page_size));
      } catch (error) {
        console.error("Error fetching playlist data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

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

  const handleNextPage = () => setPage((prev) => prev + 1);
  const handlePrevPage = () => setPage((prev) => Math.max(prev - 1, 1));

  if (loading) {
    return <div className="p-4 text-white">Loading...</div>;
  }

  if (!memoizedItems.length) return null;

  return (
    <section className="mb-8 relative p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex gap-2">
          <button
            className="text-sm text-gray-400 hover:text-white transition-colors bg-gray-700 py-1 px-3 rounded disabled:opacity-50"
            onClick={handlePrevPage}
            disabled={page === 1}
          >
            Previous
          </button>
          <button
            className="text-sm text-gray-400 hover:text-white transition-colors bg-gray-700 py-1 px-3 rounded disabled:opacity-50"
            onClick={handleNextPage}
            disabled={!hasNextPage}
          >
            Next
          </button>
        </div>
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
              const isCurrentPlaylist = queue.some(
                (track) => track.playlist_id === item.id
              );
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
                      <button
                        className="absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center hidden group-hover:flex shadow-xl hover:scale-105 transition-all"
                        onClick={(e) => handlePlayClick(e, item)}
                      >
                        {showPauseButton ? (
                          <Pause className="w-6 h-6 text-black" />
                        ) : (
                          <Play className="w-6 h-6 text-black" />
                        )}
                      </button>
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

export default React.memo(PlaylistShowMorePage);