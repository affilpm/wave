import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createSelector } from '@reduxjs/toolkit';
import {
  setCurrentMusic,
  setIsPlaying,
  setQueue,
  clearQueue,
} from "../../../../../slices/user/playerSlice";

const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentMusicId: player.currentMusicId,
    isPlaying: player.isPlaying,
    queue: player.queue,
    currentIndex: player.currentIndex,
  })
);

const MusicSection = ({ title, items }) => {
  const dispatch = useDispatch();
  const { currentMusicId, isPlaying, queue, currentIndex } = useSelector(
    selectPlayerState,
    shallowEqual
  );
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const musiclistData = useMemo(() => items || [], [items]);

  const isQueueFromSectionTracks = useMemo(() => {
    if (!queue.length) return false;
    return queue.every((track) => track.source === 'public_songs');
  }, [queue, title]);

  const isCurrentTrackFromSectionTracks = useMemo(() => {
    if (!musiclistData.length || !currentMusicId || !isQueueFromSectionTracks) {
      console.log('isCurrentTrackFromSectionTracks: Early return', {
        hasTracks: !!musiclistData.length,
        currentMusicId,
        isQueueFromSectionTracks,
        queueLength: queue.length,
        currentIndex,
      });
      return false;
    }
    const currentTrack = queue[currentIndex];
    const isTrackInTracks = musiclistData.some(
      (track) => Number(track.id) === Number(currentMusicId)
    );
    console.log('isCurrentTrackFromSectionTracks: Result', {
      currentTrackId: currentTrack?.id,
      currentMusicId,
      isTrackInTracks,
      isPlaying,
    });
    return (
      currentTrack &&
      Number(currentTrack.id) === Number(currentMusicId) &&
      isTrackInTracks
    );
  }, [musiclistData, currentMusicId, isQueueFromSectionTracks, queue, currentIndex]);

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

  const prepareTrackForPlayer = useCallback(
    (track) => ({
      id: Number(track.id),
      name: track.name,
      title: track.name,
      artist: track.artist?.user?.username || track.artist || 'Unknown Artist',
      artist_full: track.artist_full || track.artist,
      album: 'Single',
      cover_photo: track.cover_photo || '/api/placeholder/48/48',
      duration: track.duration || 0, // Assuming duration is in seconds or can be converted
      genre: track.genre || '',
      year: track.release_date ? new Date(track.release_date).getFullYear() : null,
      release_date: track.release_date,
      track_number: track.track_number || 0,
      source: 'public_songs',
    }),
    [title]
  );

  const handlePlay = useCallback(
    (item, index, e) => {
      e.stopPropagation();
      const formattedTracks = musiclistData.map(prepareTrackForPlayer);
      const formattedTrack = formattedTracks[index];

      console.log('handlePlay:', {
        trackId: item.id,
        currentMusicId,
        isQueueFromSectionTracks,
        isPlaying,
        action:
          Number(currentMusicId) === Number(formattedTrack.id) && isQueueFromSectionTracks
            ? 'toggle'
            : 'play new',
      });

      if (
        Number(currentMusicId) === Number(formattedTrack.id) &&
        isQueueFromSectionTracks
      ) {
        dispatch(setIsPlaying(!isPlaying));
        return;
      }

      dispatch(clearQueue());
      dispatch(setQueue(formattedTracks));
      dispatch(setCurrentMusic(formattedTrack));
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

  const isItemPlaying = useCallback(
    (item) => {
      const isPlayingThisItem =
        Number(currentMusicId) === Number(item.id) &&
        isCurrentTrackFromSectionTracks &&
        isPlaying;
      console.log('isItemPlaying:', {
        itemId: item.id,
        currentMusicId,
        isCurrentTrackFromSectionTracks,
        isPlaying,
        isPlayingThisItem,
      });
      return isPlayingThisItem;
    },
    [currentMusicId, isCurrentTrackFromSectionTracks, isPlaying]
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
              <div key={index} className="flex-none w-40">
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