import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createSelector } from '@reduxjs/toolkit';
import {
  setCurrentMusic,
  setIsPlaying,
  setQueue,
  clearQueue,
  toggleShufflePlay,
  togglePlay
} from "../../../../../slices/user/playerSlice";
import { prepareTrackForPlayer, prepareTracksForPlayer } from "../../../../../utils/trackUtils";

const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentTrack: player.currentTrack,
    status: player.status,
    queue: player.queue,
    queueIndex: player.queueIndex,
  })
);

const MusicSection = ({ title, items }) => {
  const dispatch = useDispatch();
  const { currentTrack, status, queue, queueIndex, currentContext } = useSelector(
    selectPlayerState,
    shallowEqual
  );
  const currentMusicId = currentTrack?.id;
  const isPlaying = status === 'playing';
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const musiclistData = useMemo(() => items || [], [items]);

  const isQueueFromSectionTracks = useMemo(() => {
    if (!queue.length) return false;
    return queue.some((track) => track.source === 'public_songs');
  }, [queue]);

  const isCurrentTrackFromSectionTracks = useMemo(() => {
    if (!musiclistData.length || !currentMusicId || !isQueueFromSectionTracks) {
      return false;
    }
    const trackAtIdx = queue[queueIndex];
    const isTrackInTracks = musiclistData.some(
      (track) => Number(track.id) === Number(currentMusicId)
    );
    
    return (
      trackAtIdx &&
      Number(trackAtIdx.id) === Number(currentMusicId) &&
      isTrackInTracks
    );
  }, [musiclistData, currentMusicId, isQueueFromSectionTracks, queue, queueIndex]);

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

  const context = useMemo(() => ({
    type: 'section',
    id: title
  }), [title]);

  const handlePlay = useCallback(
    (item, index, e) => {
      e.stopPropagation();
      const formattedTracks = prepareTracksForPlayer(musiclistData);
      const formattedTrack = formattedTracks[index];

      // Rebuild queue if:
      // 1. Different song
      // 2. OR Same song but different context (e.g. playing from a different section)
      const isSameSong = Number(currentMusicId) === Number(formattedTrack.id);
      const isSameContext = currentContext?.type === context.type && currentContext?.id === context.id;

      if (isSameSong && isSameContext) {
        dispatch(togglePlay());
        return;
      }
      
      dispatch(clearQueue());
      dispatch(setQueue({ 
        tracks: formattedTracks, 
        startIndex: index,
        context: context
      }));
      dispatch(setIsPlaying(true));
    },
    [
      currentMusicId,
      isQueueFromSectionTracks,
      isPlaying,
      musiclistData,
      dispatch,
      prepareTrackForPlayer,
    ]
  );

  const handleShufflePlay = useCallback(() => {
    const formattedTracks = musiclistData.map(prepareTrackForPlayer);
    dispatch(toggleShufflePlay(formattedTracks));
  }, [musiclistData, prepareTrackForPlayer, dispatch]);

  const isItemPlaying = useCallback(
    (item) => {
      return Number(currentMusicId) === Number(item.id) && isPlaying;
    },
    [currentMusicId, isPlaying]
);

  const handleShowMore = useCallback(() => {
    navigate("/music-show-more", { state: { title } });
  }, [navigate, title]);

  if (loading) {
    return <div>Loading...</div>;
  }

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