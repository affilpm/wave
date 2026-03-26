import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { Play, Pause } from "lucide-react";
import api from "../../../../../api";
import { handleAlbumPlaybackAction } from "./album-utils";

// Memoized selector for player state
const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentTrack: player.currentTrack,
    status: player.status,
    queue: player.queue || [],
    queueIndex: player.queueIndex || 0,
    currentContext: player.currentContext,
  })
);

const AlbumShowMorePage = () => {
  const location = useLocation();
  const { title } = location.state || {};
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentTrack, status, queue, queueIndex, currentContext } = useSelector(
    selectPlayerState,
    shallowEqual
  );
  const currentMusicId = currentTrack?.id;
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';
  const currentIndex = queueIndex;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState({}); // For individual album loading states

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/v1/home/albumlist/?all_songs&page=${page}`);
        const data = response.data.results || response.data || [];
        const count = response.data.results ? response.data.count : data.length;
        const pageSize = response.data.results ? (response.data.page_size || 10) : 10;

        setItems(data);
        setHasNextPage(!!response.data.next);
        setTotalPages(Math.ceil(count / pageSize));
      } catch (error) {
        console.error("Error fetching album data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  const handleAlbumClick = useCallback(
    (albumId) => {
      navigate(`/album/${albumId}`);
    },
    [navigate]
  );

  const handlePlayClick = useCallback(
    async (e, item) => {
      e.stopPropagation();
      setIsLoading((prev) => ({ ...prev, [item.id]: true }));
      try {
        await handleAlbumPlaybackAction({
          albumId: item.id,
          dispatch,
          currentState: { currentTrack, status, queue, queueIndex, currentContext },
        });
      } catch (error) {
        console.error("Playback error:", error);
      } finally {
        setIsLoading((prev) => ({ ...prev, [item.id]: false }));
      }
    },
    [dispatch, currentMusicId, isPlaying, queue, currentIndex]
  );

  const isItemPlaying = useCallback(
    (item) => {
      const isSameContext = currentContext?.type === 'album' && String(currentContext?.id) === String(item.id);
      return isSameContext && isPlaying;
    },
    [currentContext, isPlaying]
  );

  const handleNextPage = useCallback(() => setPage((prev) => prev + 1), []);
  const handlePrevPage = useCallback(() => setPage((prev) => Math.max(prev - 1, 1)), []);

  const memoizedItems = useMemo(() => items, [items]);

  if (loading) {
    return <div className="p-4 text-white">Loading...</div>;
  }

  if (!memoizedItems.length) return null;

  return (
    <section className="mb-8 relative p-4" aria-label={`Album section: ${title}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="relative">
        <div className="px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {memoizedItems.map((item) => (
              <div
                key={item.id}
                className="cursor-pointer group w-full"
                onClick={() => handleAlbumClick(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleAlbumClick(item.id)}
                aria-label={`View album ${item.name || "Unknown Album"}`}
              >
                <div className="relative group">
                  <img
                    src={item.cover_photo || "/api/v1/placeholder/192/192"}
                    alt={item.name || "Unknown Album"}
                    className="w-40 h-40 object-cover rounded-md shadow-lg"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-md">
                    <button
                      className={`absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center ${
                        isItemPlaying(item) ? "flex" : "hidden group-hover:flex"
                      } shadow-xl hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-green-500`}
                      onClick={(e) => handlePlayClick(e, item)}
                      aria-label={
                        isItemPlaying(item)
                          ? `Pause ${item.name || "album"}`
                          : `Play ${item.name || "album"}`
                      }
                      disabled={isLoading[item.id]}
                    >
                      {isLoading[item.id] ? (
                        <svg
                          className="w-6 h-6 animate-spin text-black"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          />
                        </svg>
                      ) : isItemPlaying(item) ? (
                        <Pause className="w-6 h-6 text-black" />
                      ) : (
                        <Play className="w-6 h-6 text-black" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <h3
                    className="font-bold text-white truncate"
                    title={item.name || "Unknown Album"}
                  >
                    {item.name || "Unknown Album"}
                  </h3>
                  {(item.created_by || item.artist) && (
                    <p
                      className="text-sm text-gray-400 truncate"
                      title={item.created_by || item.artist || "Unknown Artist"}
                    >
                      {item.created_by || item.artist || "Unknown Artist"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-8 px-4">
        <button
          className="text-sm text-gray-400 hover:text-white transition-colors bg-gray-700 py-2 px-4 rounded-full disabled:opacity-50 font-medium"
          onClick={handlePrevPage}
          disabled={page === 1}
        >
          Previous
        </button>
        <span className="text-gray-400 text-sm">
          Page {page} {totalPages > 0 && `of ${totalPages}`}
        </span>
        <button
          className="text-sm text-gray-400 hover:text-white transition-colors bg-gray-700 py-2 px-4 rounded-full disabled:opacity-50 font-medium"
          onClick={handleNextPage}
          disabled={!hasNextPage}
        >
          Next
        </button>
      </div>
    </section>
  );
};

export default React.memo(AlbumShowMorePage);