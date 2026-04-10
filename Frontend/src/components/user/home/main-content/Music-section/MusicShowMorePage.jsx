import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { Play, Pause, Shuffle, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import api from "../../../../../api";
import { prepareTracksForPlayer } from "../../../../../utils/trackUtils";
import { usePlayCollection } from "../../../../../hooks/usePlayCollection";
import TrackCard from "../TrackCard";

const MusicShowMorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { title } = location.state || { title: "Discover Music" };
  const dispatch = useDispatch();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const { currentTrack, status, currentContext: playerContext } = useSelector(
    (state) => state.player,
    shallowEqual
  );
  
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';

  const context = useMemo(() => ({
    type: 'section_show_more',
    id: title
  }), [title]);

  const formattedTracks = useMemo(() => 
    items.length ? prepareTracksForPlayer(items) : [],
    [items]
  );

  const {
    handlePlayCollection,
    handlePlayTrackAtIndex,
    handleShufflePlay,
    isCollectionPlaying,
    isCollectionActive
  } = usePlayCollection({ tracks: formattedTracks, context });

  // Fetch data for the current page
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const musiclistResponse = await api.get(`/api/v1/home/musiclist/?all_songs&page=${page}`);
        const data = musiclistResponse.data.results || musiclistResponse.data || [];
        const count = musiclistResponse.data.results ? musiclistResponse.data.count : data.length;
        const pageSize = musiclistResponse.data.results ? (musiclistResponse.data.page_size || 10) : 10;

        setItems(data);
        setHasNextPage(!!musiclistResponse.data.next);
        setTotalPages(Math.ceil(count / pageSize));
      } catch (error) {
        console.error("Error fetching music data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  const handleNextPage = () => setPage((prev) => prev + 1);
  const handlePrevPage = () => setPage((prev) => Math.max(prev - 1, 1));

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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-black text-white">{title}</h1>
            <p className="text-gray-400">Discover your next favorite track</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleShufflePlay}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all group font-medium"
            >
              <Shuffle className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
              <span>Shuffle Play</span>
            </button>
            
            <button
              onClick={handlePlayCollection}
              className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all group"
            >
              {isCollectionPlaying ? (
                <Pause className="w-7 h-7 text-black fill-black" />
              ) : (
                <Play className="w-7 h-7 text-black fill-black ml-1" />
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 justify-items-center">
          {items.map((item, index) => (
            <TrackCard
              key={item.id}
              item={item}
              index={index}
              type="music"
              isPlaying={Number(currentTrack?.id) === Number(item.id) && isPlaying}
              onPlayPlayable={() => handlePlayTrackAtIndex(index)}
            />
          ))}
        </div>

        {/* Improved Pagination Controls */}
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

export default React.memo(MusicShowMorePage);