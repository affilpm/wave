import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import api from "../../../../../api";
import { handleAlbumPlaybackAction } from "../Album-section/album-utils";
import TrackCard from "../TrackCard";

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
  const { title } = location.state || { title: "Albums" };
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentTrack, status, currentContext } = useSelector(
    selectPlayerState,
    shallowEqual
  );
  
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

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

  const handlePlayClick = useCallback(
    async (item, index, e) => {
      e.stopPropagation();
      try {
        await handleAlbumPlaybackAction({
          albumId: item.id,
          dispatch,
          currentState: { currentTrack, status, queue: [], queueIndex: 0, currentContext },
        });
      } catch (error) {
        console.error("Playback error:", error);
      }
    },
    [dispatch, currentTrack, status, currentContext]
  );

  const handleNextPage = useCallback(() => setPage((prev) => prev + 1), []);
  const handlePrevPage = useCallback(() => setPage((prev) => Math.max(prev - 1, 1)), []);

  if (loading && page === 1) {
    return (
      <div className="flex-1 p-6 space-y-8 h-full overflow-y-auto">
        <div className="h-10 w-64 bg-gray-800 animate-pulse rounded-md mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-800 animate-pulse rounded-lg shadow-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto h-full scrollbar-hide">
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white">{title}</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 justify-items-center">
          {items.map((item, index) => (
            <TrackCard
              key={item.id}
              item={item}
              index={index}
              type="album"
              isPlaying={currentContext?.type === 'album' && String(currentContext?.id) === String(item.id) && isPlaying}
              onPlayPlayable={handlePlayClick}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-12 mb-8 px-4">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/5"
            onClick={handlePrevPage}
            disabled={page === 1}
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Previous</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm font-medium">
              Page <span className="text-white">{page}</span> of <span className="text-white">{totalPages || 1}</span>
            </span>
          </div>
          
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/5"
            onClick={handleNextPage}
            disabled={!hasNextPage}
          >
            <span>Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </motion.section>
    </div>
  );
};

export default React.memo(AlbumShowMorePage);