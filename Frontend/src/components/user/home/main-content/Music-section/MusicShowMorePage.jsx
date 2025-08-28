import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { Play, Pause } from "lucide-react";
import { createSelector } from '@reduxjs/toolkit';
import api from "../../../../../api";
import {
  setCurrentMusic,
  setIsPlaying,
  setQueue,
  clearQueue,
} from "../../../../../slices/user/playerSlice";

// Define the same selector as in MusicSection
const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentMusicId: player.currentMusicId,
    isPlaying: player.isPlaying,
    queue: player.queue,
    currentIndex: player.currentIndex,
  })
);

const MusicShowMorePage = () => {
  const location = useLocation();
  const { title } = location.state || {};
  const dispatch = useDispatch();
  const { currentMusicId, isPlaying, queue, currentIndex } = useSelector(
    selectPlayerState,
    shallowEqual
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  // Memoize the items to prevent unnecessary re-renders
  const musiclistData = useMemo(() => items || [], [items]);

  // Check if the queue is from this page's tracks
  const isQueueFromSectionTracks = useMemo(() => {
    if (!queue.length) return false;
    return queue.every((track) => track.source === 'public_songs');
  }, [queue]);

  // Check if the current track is from this page's tracks
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

  // Fetch data for the current page
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const musiclistResponse = await api.get(`/api/home/musiclist/?all_songs&page=${page}`);
        setItems(musiclistResponse.data.results);
        setHasNextPage(!!musiclistResponse.data.next);
        setTotalPages(Math.ceil(musiclistResponse.data.count / musiclistResponse.data.page_size));
      } catch (error) {
        console.error("Error fetching music data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  // Prepare track for player, matching MusicSection's format
  const prepareTrackForPlayer = useCallback(
    (track) => ({
      id: Number(track.id),
      name: track.name,
      title: track.name,
      artist: track.artist?.user?.username || track.artist || 'Unknown Artist',
      artist_full: track.artist_full || track.artist,
      album: 'Single',
      cover_photo: track.cover_photo || '/api/placeholder/48/48',
      duration: track.duration || 0,
      genre: track.genre || '',
      year: track.release_date ? new Date(track.release_date).getFullYear() : null,
      release_date: track.release_date,
      track_number: track.track_number || 0,
      source: 'public_songs',
    }),
    []
  );

  // Handle play/pause, matching MusicSection's logic
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

  // Check if an item is currently playing
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

  // Handle pagination
  const handleNextPage = () => setPage((prev) => prev + 1);
  const handlePrevPage = () => setPage((prev) => Math.max(prev - 1, 1));

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 p-2">
      <section className="mb-8 relative">
        <h2 className="text-2xl p-2 font-bold mb-4">{title}</h2>
        <div className="overflow-x-auto scrollbar-hidden">
          <div className="flex flex-wrap gap-6">
            {musiclistData.map((item, index) => (
              <div
                key={index}
                className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/60 transition-all cursor-pointer group flex-none w-40"
              >
                <div className="relative">
                  <img
                    src={item.cover_photo}
                    alt={item.name}
                    className="w-full aspect-square object-cover rounded-md shadow-lg mb-4"
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
                <h3 className="font-bold mb-1 truncate">{item.name}</h3>
                {item.artist && (
                  <p className="text-sm text-gray-400 truncate">{item.artist}</p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between mt-4 items-center">
          <button
            className="bg-gray-700 text-white py-1 px-3 rounded disabled:opacity-50"
            onClick={handlePrevPage}
            disabled={page === 1}
          >
            Previous
          </button>
          <button
            className="bg-gray-700 text-white py-1 px-3 rounded disabled:opacity-50"
            onClick={handleNextPage}
            disabled={!hasNextPage}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
};

export default MusicShowMorePage;