import React, { useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import TrackCard from "./TrackCard";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from '@reduxjs/toolkit';
import { usePlayCollection } from "../../../../hooks/usePlayCollection";
import { prepareTracksForPlayer } from "../../../../utils/trackUtils";
import { setQueue, setIsPlaying } from "../../../../slices/user/playerSlice";
import api from "../../../../api";

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

const Section = ({ title, items, onShowAll, type = 'music' }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentTrack, status, currentContext } = useSelector(selectPlayerState, shallowEqual);
  const currentMusicId = currentTrack?.id;
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';

  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);

  const context = useMemo(() => ({ type: 'section', id: title }), [title]);
  
  const formattedTracks = useMemo(() => 
    (type === 'music' && items?.length) ? prepareTracksForPlayer(items) : [],
    [items, type]
  );

  const {
    handlePlayTrackAtIndex,
    handleShufflePlay: handleSectionShufflePlay,
    isCollectionActive
  } = usePlayCollection({ tracks: formattedTracks, context });

  const handleScroll = useCallback((direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 400;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  const handlePlay = async (item, index, e) => {
    e.stopPropagation();
    if (type === 'music') {
      handlePlayTrackAtIndex(index);
    } else if (type === 'album' || type === 'playlist') {
      // Toggle play/pause if this is already the active context
      const isActiveCollection = currentContext?.type === type && String(currentContext?.id) === String(item.id);
      if (isActiveCollection) {
        dispatch(setIsPlaying(!isPlaying));
        return;
      }

      try {
        const endpoint = type === 'album' 
          ? `/api/v1/album/album-data/${item.id}/`
          : `/api/v1/playlist/playlists/${item.id}/`;
        
        const response = await api.get(endpoint);
        const data = response.data;
        
        // Normalize track list based on type
        const rawTracks = type === 'album' 
          ? data.tracks.map((t) => t.music_details) 
          : data.tracks;
          
        const formattedTracks = prepareTracksForPlayer(rawTracks);

        if (formattedTracks.length > 0) {
          dispatch(setQueue({
            tracks: formattedTracks,
            startIndex: 0,
            context: { type, id: item.id }
          }));
          dispatch(setIsPlaying(true));
        }
      } catch (error) {
        console.error(`Error playing ${type}:`, error);
      }
    } else if (type === 'artist') {
      // For artists, we still navigate for now as playing "all" tracks requires more complex logic
      navigate(`/artist/${item.id}`, { state: { autoPlay: true } });
    }
  };

  const isItemPlaying = useCallback((item) => {
    if (type === 'music') {
      // Show as playing if the ID matches and player is active, regardless of context
      return Number(currentMusicId) === Number(item.id) && isPlaying;
    } else {
      // For albums and playlists, we still care about the context matching
      return currentContext?.type === type && String(currentContext?.id) === String(item.id) && isPlaying;
    }
  }, [currentMusicId, isPlaying, type, currentContext]);

  if (!items || !items.length) return null;

  return (
    <section className="mb-8 relative px-4 text-white">
      <div className="flex justify-between items-end mb-4 group/header">
        <h2 className="text-2xl font-bold hover:underline cursor-pointer transition-all">{title}</h2>
        {onShowAll && (
          <button
            onClick={onShowAll}
            className="text-sm font-bold text-neutral-400 hover:text-white uppercase tracking-wider transition-colors"
          >
            Show all
          </button>
        )}
      </div>

      <div
        className="relative group/scroll"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Scroll Controls */}
        <button
          onClick={() => handleScroll('left')}
          className={`absolute -left-4 top-1/2 z-10 w-10 h-10 bg-black/80 text-white rounded-full flex items-center justify-center transform -translate-y-1/2 transition-all duration-300 hover:scale-105 ${showControls ? 'opacity-100' : 'opacity-0'} shadow-xl disabled:opacity-0`}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={() => handleScroll('right')}
          className={`absolute -right-4 top-1/2 z-10 w-10 h-10 bg-black/80 text-white rounded-full flex items-center justify-center transform -translate-y-1/2 transition-all duration-300 hover:scale-105 ${showControls ? 'opacity-100' : 'opacity-0'} shadow-xl disabled:opacity-0`}
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide py-2 gap-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.filter(i => i && (i.id || i.username)).map((item, index) => (
            <TrackCard 
              key={item.id || item.username || index} 
              item={item} 
              index={index} 
              type={type}
              isPlaying={isItemPlaying(item)}
              onPlayPlayable={handlePlay}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Section;
