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
  togglePlay,
} from "../../../../../slices/user/playerSlice";
import { prepareTracksForPlayer } from "../../../../../utils/trackUtils";

// Define the same selector as in MusicSection
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

const MusicShowMorePage = () => {
  const location = useLocation();
  const { title } = location.state || {};
  const dispatch = useDispatch();
  const { currentTrack, status, queue, queueIndex, currentContext } = useSelector(
    selectPlayerState,
    shallowEqual
  );
  
  const currentMusicId = currentTrack?.id;
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  // Memoize the items to prevent unnecessary re-renders
  const musiclistData = useMemo(() => items || [], [items]);

  const context = useMemo(() => ({
    type: 'section_show_more',
    id: title
  }), [title]);

  // Check if the current track is from this page's tracks AND context matches
  const isCurrentTrackFromSectionTracks = useMemo(() => {
    const isSameContext = currentContext?.type === context.type && currentContext?.id === context.id;
    return isSameContext && Number(currentMusicId) === Number(queue[queueIndex]?.id);
  }, [currentMusicId, queue, queueIndex, currentContext, context]);

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


  // Handle play/pause, matching MusicSection's logic
  const handlePlay = useCallback(
    (item, index, e) => {
      e.stopPropagation();
      const formattedTracks = prepareTracksForPlayer(musiclistData);
      const formattedTrack = formattedTracks[index];

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
      currentContext,
      context,
      isPlaying,
      musiclistData,
      dispatch,
    ]
  );

  // Check if an item is currently playing
  const isItemPlaying = useCallback(
    (item) => {
      const isSameSong = Number(currentMusicId) === Number(item.id);
      const isSameContext = currentContext?.type === context.type && currentContext?.id === context.id;
      return isSameSong && isSameContext && isPlaying;
    },
    [currentMusicId, isPlaying, currentContext, context]
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
        <div className="p-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {musiclistData.map((item, index) => (
              <div
                key={index}
                className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/60 transition-all cursor-pointer group w-full"
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