import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { Play, Pause, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  selectSavedPlaylists, 
  toggleSavedPlaylistOptimistic 
} from "../../../../../slices/user/librarySlice";
import { LIBRARY } from "../../../../../constants/apiEndpoints";
import { handlePlaybackAction } from "./playlist-utils";
import api from "../../../../../api";

const selectPlayerState = createSelector(
  [(state) => state.player], 
  (player) => ({
    currentTrack: player.currentTrack,
    status: player.status,
    queue: player.queue || [],
    queueIndex: player.queueIndex || 0,
    currentPlaylistId: player.currentPlaylistId,
  })
);

const PlaylistShowMorePage = () => {
  const location = useLocation();
  const { title } = location.state || {};
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const username = useSelector((state) => state.user?.username);
  const { currentTrack, status, queue, queueIndex } = useSelector(
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const musiclistResponse = await api.get(`/api/v1/home/playlist/?all_songs&page=${page}`);
        const data = musiclistResponse.data.results || musiclistResponse.data || [];
        const count = musiclistResponse.data.results ? musiclistResponse.data.count : data.length;
        const pageSize = musiclistResponse.data.results ? (musiclistResponse.data.page_size || 10) : 10;

        setItems(data);
        setHasNextPage(!!musiclistResponse.data.next);
        setTotalPages(Math.ceil(count / pageSize));
      } catch (error) {
        console.error("Error fetching playlist data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  const handlePlaylistClick = useCallback(
    (playlistId) => {
      const playlist = items.find((item) => item.id === playlistId);
      if (playlist && playlist.created_by === username) {
        navigate(`/playlist/${playlistId}`);
      } else {
        navigate(`/saved-playlist/${playlistId}`);
      }
    },
    [items, navigate, username]
  );

  const handlePlayClick = useCallback(
    async (e, item) => {
      e.stopPropagation();
      await handlePlaybackAction({
        playlistId: item.id,
        dispatch,
        currentState: { currentMusicId, isPlaying, queue, currentIndex },
      });
    },
    [dispatch, currentMusicId, isPlaying, queue, currentIndex]
  );

  const memoizedItems = useMemo(() => items, [items]);

  const handleNextPage = () => setPage((prev) => prev + 1);
  const handlePrevPage = () => setPage((prev) => Math.max(prev - 1, 1));

  const savedPlaylists = useSelector(selectSavedPlaylists);
  const [isLibraryLoading, setIsLibraryLoading] = useState(null);

  const handleToggleLibrary = async (e, item) => {
    e.stopPropagation();
    const isSaved = savedPlaylists.some(p => p.id === item.id);
    const playlistData = {
      id: item.id,
      name: item.name,
      cover_photo: item.cover_photo,
      created_by_username: item.created_by_username || item.created_by,
    };
    
    dispatch(toggleSavedPlaylistOptimistic(playlistData));
    
    try {
      setIsLibraryLoading(item.id);
      if (isSaved) {
        await api.post(LIBRARY.REMOVE_PLAYLIST, { playlist_id: item.id });
      } else {
        await api.post(LIBRARY.ADD_PLAYLIST, { playlist_id: item.id });
      }
    } catch (error) {
      console.error("Failed to update library:", error);
      dispatch(toggleSavedPlaylistOptimistic(playlistData));
    } finally {
      setIsLibraryLoading(null);
    }
  };

  if (loading) {
    return <div className="p-4 text-white">Loading...</div>;
  }

  if (!memoizedItems.length) return null;

  return (
    <section className="mb-8 relative p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="relative">
        <div className="px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {memoizedItems.map((item) => {
              const isCurrentPlaylist = queue.some(
                (track) => track.playlist_id === item.id
              );
              const showPauseButton = isCurrentPlaylist && isPlaying && currentMusicId;
              return (
                <div
                  key={item.id}
                  className="cursor-pointer group w-full"
                  onClick={() => handlePlaylistClick(item.id)}
                >
                  <div className="relative group">
                    <img
                      src={item.cover_photo}
                      alt={item.name}
                      className="w-40 h-40 object-cover rounded-md shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-md">
                      {/* Library Toggle (Plus/Check) */}
                      {item.created_by !== username && (
                        <div className={`absolute top-2 right-2 transition-opacity duration-300 ${savedPlaylists.some(p => p.id === item.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <button 
                            onClick={(e) => handleToggleLibrary(e, item)}
                            disabled={isLibraryLoading === item.id}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all bg-black/40 backdrop-blur-md hover:scale-110 active:scale-95 ${savedPlaylists.some(p => p.id === item.id) ? "text-green-500" : "text-white"}`}
                          >
                            {isLibraryLoading === item.id ? (
                              <div className="h-4 w-4 border-2 border-t-transparent border-current rounded-full animate-spin"></div>
                            ) : savedPlaylists.some(p => p.id === item.id) ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}

                      <button
                        className="absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center hidden group-hover:flex shadow-xl hover:scale-105 active:scale-90 transition-all overflow-hidden"
                        onClick={(e) => handlePlayClick(e, item)}
                      >
                        <AnimatePresence mode="wait">
                          {showPauseButton ? (
                            <motion.div
                              key="pause"
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.5, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Pause className="w-6 h-6 text-black fill-black" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="play"
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.5, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Play className="w-6 h-6 text-black fill-black ml-1" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <h3 className="font-bold text-white truncate">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-400 truncate">{item.description}</p>
                    )}
                    {item.created_by && (
                      <p className="text-sm text-gray-400 truncate">By {item.created_by}</p>
                    )}
                  </div>
                </div>
              );
            })}
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

export default React.memo(PlaylistShowMorePage);