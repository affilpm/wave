import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createSelector } from '@reduxjs/toolkit';
import { prepareTrackForPlayer, prepareTracksForPlayer } from "../../../../../utils/trackUtils";
import { usePlayCollection } from "../../../../../hooks/usePlayCollection";
import api from "../../../../../api";

const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentTrack: player.currentTrack,
    status: player.status,
    queue: player.queue,
    queueIndex: player.queueIndex,
  })
);

const MusicSection = ({ title }) => {
  const dispatch = useDispatch();
  const { currentTrack, status, queue, queueIndex, currentContext } = useSelector(
    selectPlayerState,
    shallowEqual
  );
  const currentMusicId = currentTrack?.id;
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [loading, setLoading] = useState(true);
  const [musiclistData, setMusiclistData] = useState([]);
  const navigate = useNavigate();

  const context = useMemo(() => ({
    type: 'section',
    id: title
  }), [title]);

  const formattedTracks = useMemo(() => 
    musiclistData.length ? prepareTracksForPlayer(musiclistData) : [],
    [musiclistData]
  );

  const {
    handlePlayTrackAtIndex,
    handleShufflePlay: handleSectionShufflePlay,
    isCollectionActive
  } = usePlayCollection({ tracks: formattedTracks, context });

  useEffect(() => {
    const fetchMusic = async () => {
      try {
        const response = await api.get(`/api/v1/home/musiclist/?top10=true`);
        setMusiclistData(response.data.results || response.data || []);
      } catch (error) {
        console.error("Error fetching music items:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMusic();
  }, []);

  const handleScroll = useCallback((direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  const handlePlay = (item, index, e) => {
    e.stopPropagation();
    handlePlayTrackAtIndex(index);
  };

  const handleShufflePlay = () => {
    handleSectionShufflePlay();
  };

  const isItemPlaying = useCallback(
    (item) => {
      // It is playing if it is the current track, audio is playing, AND we are playing from this section context
      return Number(currentMusicId) === Number(item.id) && isPlaying && isCollectionActive;
    },
    [currentMusicId, isPlaying, isCollectionActive]
  );

  const handleShowMore = useCallback(() => {
    navigate("/music-show-more", { state: { title } });
  }, [navigate, title]);

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

  if (!musiclistData.length) return null;

  return (
    <section className="mb-8 relative">
      <div className="flex justify-between items-center mb-4 px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button
            onClick={handleShufflePlay}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors group"
            title="Shuffle Play"
          >
            <Shuffle className="w-5 h-5 text-gray-400 group-hover:text-white" />
          </button>
        </div>
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
              onClick={() => handleScroll('left')}
              className="absolute left-0 top-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transform -translate-y-1/2 transition-transform hover:scale-110"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="absolute right-0 top-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transform -translate-y-1/2 transition-transform hover:scale-110"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex gap-4 px-4">
            {musiclistData.map((item, index) => (
              <div key={item.id} className="flex-none w-40">
                <div className="relative group">
                  <img
                    src={item.cover_photo}
                    alt={item.name}
                    className="w-40 h-40 object-cover rounded-md"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-md">
                    <button
                      className={`absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center ${
                        isItemPlaying(item) ? 'flex' : 'hidden group-hover:flex'
                      } shadow-xl hover:scale-105 transition-all`}
                      onClick={(e) => handlePlay(item, index, e)}
                      aria-label={isItemPlaying(item) ? "Pause" : "Play"}
                    >
                      {isItemPlaying(item) ? (
                        <Pause className="w-6 h-6 text-black" />
                      ) : (
                        <Play className="w-6 h-6 text-black" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="font-bold text-white truncate">{item.name}</h3>
                  {item.artist && (
                    <p className="text-sm text-gray-400 truncate">{item.artist}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MusicSection;