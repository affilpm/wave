import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import api from "../../../../../api";
import { setQueue, setIsPlaying, clearQueue } from "../../../../../slices/user/playerSlice";
import { prepareTracksForPlayer } from "../../../../../utils/trackUtils";
import TrackCard from "../TrackCard";

const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentTrack: player.currentTrack,
    status: player.status,
    currentContext: player.currentContext,
  })
);

const ArtistsShowMorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { title } = location.state || { title: "Artists" };
  const dispatch = useDispatch();
  const currentUserId = useSelector((state) => state.user_id);

  const { status, currentContext } = useSelector(selectPlayerState, shallowEqual);
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';

  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        setLoading(true);
        const artistsResponse = await api.get(`/api/v1/home/artistshowmore/?page=${page}`);
        const data = artistsResponse.data.results || artistsResponse.data || [];
        const count = artistsResponse.data.results ? artistsResponse.data.count : data.length;
        const pageSize = artistsResponse.data.page_size || 10;

        setArtists(data);
        setHasNextPage(!!artistsResponse.data.next);
        setTotalPages(Math.ceil(count / pageSize));
      } catch (error) {
        console.error("Error fetching artists:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, [page]);

  const handlePlayArtist = async (item, index, e) => {
    e.stopPropagation();
    try {
      const context = { type: 'artist', id: item.id };
      const songsResponse = await api.get(`/api/v1/music/artist/${item.id}/`);
      const songs = songsResponse.data.results || songsResponse.data;

      if (songs && songs.length > 0) {
        const formattedTracks = prepareTracksForPlayer(songs, item, currentUserId);
        dispatch(clearQueue());
        dispatch(setQueue({
          tracks: formattedTracks,
          startIndex: 0,
          context: context
        }));
        dispatch(setIsPlaying(true));
      }
    } catch (error) {
      console.error("Error fetching artist songs:", error);
    }
  };

  const handleNextPage = () => setPage((prev) => prev + 1);
  const handlePrevPage = () => setPage((prev) => Math.max(prev - 1, 1));

  if (loading && page === 1) {
    return (
      <div className="flex-1 p-6 space-y-8 h-full overflow-y-auto">
        <div className="h-10 w-64 bg-gray-800 animate-pulse rounded-md mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-800 animate-pulse rounded-full shadow-lg" />
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-y-10 gap-x-6 justify-items-start">
          {artists.map((item, index) => (
            <TrackCard
              key={item.id}
              item={item}
              index={index}
              type="artist"
              isPlaying={currentContext?.type === 'artist' && String(currentContext?.id) === String(item.id) && isPlaying}
              onPlayPlayable={handlePlayArtist}
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

export default React.memo(ArtistsShowMorePage);