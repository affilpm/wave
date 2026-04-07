import React, { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, Music2, ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { 
  selectSavedAlbums, 
  toggleSavedAlbumOptimistic 
} from "../../../../slices/user/librarySlice";
import api from "../../../../api";
import { LIBRARY } from "../../../../constants/apiEndpoints";
import { prepareTracksForPlayer } from "../../../../utils/trackUtils";
import { setQueue, setIsPlaying } from "../../../../slices/user/playerSlice";
import AvatarFallback from "../../../common/AvatarFallback";
import { createSelector } from '@reduxjs/toolkit';

const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentTrack: player.currentTrack,
    status: player.status,
    currentContext: player.currentContext,
  })
);

const JumpBackInSection = ({ albums = [], hasSingles = false }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const scrollRef = useRef(null);
  const [showControls, setShowControls] = useState(false);

  const { currentTrack, status, currentContext } = useSelector(
    selectPlayerState,
    shallowEqual
  );

  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';

  const handleScroll = useCallback((direction) => {
    const container = scrollRef.current;
    if (container) {
      container.scrollBy({
        left: direction === 'left' ? -400 : 400,
        behavior: 'smooth',
      });
    }
  }, []);

  const handlePlayAlbum = async (e, album) => {
    e.stopPropagation();

    // Toggle play/pause if this album is already the active context
    const isActiveContext = currentContext?.type === 'album' && String(currentContext?.id) === String(album.id);
    if (isActiveContext) {
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    try {
      const response = await api.get(`/api/v1/album/album-data/${album.id}/`);
      const data = response.data;
      const formattedTracks = prepareTracksForPlayer(data.tracks.map(t => t.music_details));

      if (formattedTracks.length > 0) {
        dispatch(setQueue({
          tracks: formattedTracks,
          startIndex: 0,
          context: { type: 'album', id: album.id }
        }));
        dispatch(setIsPlaying(true));
      }
    } catch (error) {
      console.error("Error playing album:", error);
    }
  };

  const handlePlaySingles = async (e) => {
    e.stopPropagation();
    
    // Toggle play/pause if singles are already the active context
    const isActiveContext = currentContext?.type === 'singles';
    if (isActiveContext) {
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    try {
      // For now, playing singles from history - can be refined to a specific list
      const response = await api.get("/api/v1/home/musiclist/"); // Fallback to trending or something similar
      const data = response.data.results || response.data;
      const formattedTracks = prepareTracksForPlayer(data);

      if (formattedTracks.length > 0) {
        dispatch(setQueue({
          tracks: formattedTracks,
          startIndex: 0,
          context: { type: 'singles', id: 'history' }
        }));
        dispatch(setIsPlaying(true));
      }
    } catch (error) {
      console.error("Error playing singles:", error);
    }
  };

  const isAlbumPlaying = (albumId) => {
    return (currentContext?.type === 'album' && String(currentContext?.id) === String(albumId)) && isPlaying;
  };

  const isSinglesPlaying = () => {
    return (currentContext?.type === 'singles') && isPlaying;
  };

  const savedAlbums = useSelector(selectSavedAlbums);
  const [isLibraryLoading, setIsLibraryLoading] = useState(null); // ID of the album loading

  const handleToggleLibrary = async (e, album) => {
    e.stopPropagation();
    const isSaved = savedAlbums.some(a => a.id === album.id);
    const albumData = { 
      id: album.id, 
      name: album.name, 
      cover_photo: album.cover_photo, 
      artist_username: album.artist_username 
    };
    
    dispatch(toggleSavedAlbumOptimistic(albumData));
    
    try {
      setIsLibraryLoading(album.id);
      if (isSaved) {
        await api.post(LIBRARY.REMOVE_ALBUM, { album_id: album.id });
      } else {
        await api.post(LIBRARY.ADD_ALBUM, { album_id: album.id });
      }
    } catch (error) {
      console.error("Failed to update library:", error);
      dispatch(toggleSavedAlbumOptimistic(albumData));
    } finally {
      setIsLibraryLoading(null);
    }
  };

  if (!albums.length && !hasSingles) return null;

  return (
    <section className="mb-8 relative px-4 text-white">
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-2xl font-bold hover:underline cursor-pointer transition-all">
          Jump Back In
        </h2>
      </div>

      <div
        className="relative group/scroll"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <button
          onClick={() => handleScroll('left')}
          className={`absolute -left-4 top-1/2 z-10 w-10 h-10 bg-black/80 text-white rounded-full flex items-center justify-center transform -translate-y-1/2 transition-all duration-300 hover:scale-105 ${showControls ? 'opacity-100' : 'opacity-0'} shadow-xl`}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={() => handleScroll('right')}
          className={`absolute -right-4 top-1/2 z-10 w-10 h-10 bg-black/80 text-white rounded-full flex items-center justify-center transform -translate-y-1/2 transition-all duration-300 hover:scale-105 ${showControls ? 'opacity-100' : 'opacity-0'} shadow-xl`}
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-hide gap-4 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {albums.map((album) => (
            <div
              key={album.id}
              onClick={() => navigate(`/album/${album.id}`)}
              className="group relative shrink-0 w-44 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className="relative aspect-square">
                {album.cover_photo && !album.cover_photo.toString().includes('default-cover.png') ? (
                  <img
                    src={album.cover_photo}
                    alt={album.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <AvatarFallback 
                  name={album.name}
                  className="w-full h-full"
                  style={{ display: (album.cover_photo && !album.cover_photo.toString().includes('default-cover.png')) ? 'none' : 'flex' }}
                />
                {/* Library Toggle */}
                <div className={`absolute top-2 right-2 transition-all duration-300 ${savedAlbums.some(a => a.id === album.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <button 
                    onClick={(e) => handleToggleLibrary(e, album)}
                    disabled={isLibraryLoading === album.id}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all bg-black/40 backdrop-blur-md hover:scale-110 active:scale-95 ${savedAlbums.some(a => a.id === album.id) ? "text-green-500" : "text-white"}`}
                  >
                    {isLibraryLoading === album.id ? (
                      <div className="h-4 w-4 border-2 border-t-transparent border-current rounded-full animate-spin"></div>
                    ) : savedAlbums.some(a => a.id === album.id) ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Play button overlay */}
                <div className={`absolute bottom-2 right-2 transition-all duration-300 ${isAlbumPlaying(album.id) ? 'opacity-100 translate-y-0' : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}`}>
                  <button 
                    onClick={(e) => handlePlayAlbum(e, album)}
                    className="w-12 h-12 bg-green-500 hover:bg-green-400 hover:scale-105 active:scale-90 rounded-full flex items-center justify-center shadow-xl transition-all overflow-hidden"
                  >
                    <AnimatePresence mode="wait">
                      {isAlbumPlaying(album.id) ? (
                        <motion.div
                          key="pause"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Pause className="h-5 w-5 text-black fill-black" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="play"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Play className="h-5 w-5 text-black fill-black ml-0.5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="font-bold text-sm truncate">{album.name}</p>
                <p className="text-xs text-neutral-400 mt-1 truncate">
                  {album.artist_username || 'Various Artists'}
                </p>
              </div>
            </div>
          ))}

          {/* Singles Card */}
          {hasSingles && (
            <div
              className="group relative shrink-0 w-44 rounded-lg bg-gradient-to-br from-purple-900/40 to-indigo-900/40 hover:from-purple-800/50 hover:to-indigo-800/50 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className="relative aspect-square flex items-center justify-center bg-gradient-to-br from-purple-600/30 to-indigo-600/30">
                <Music2 className="h-16 w-16 text-purple-300/60" />
                <div className={`absolute bottom-2 right-2 transition-all duration-300 ${isSinglesPlaying() ? 'opacity-100 translate-y-0' : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}`}>
                  <button 
                    onClick={handlePlaySingles}
                    className="w-12 h-12 bg-green-500 hover:bg-green-400 hover:scale-105 active:scale-90 rounded-full flex items-center justify-center shadow-xl transition-all overflow-hidden"
                  >
                    <AnimatePresence mode="wait">
                      {isSinglesPlaying() ? (
                        <motion.div
                          key="pause"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Pause className="h-5 w-5 text-black fill-black" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="play"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Play className="h-5 w-5 text-black fill-black ml-0.5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="font-bold text-sm">Singles</p>
                <p className="text-xs text-neutral-400 mt-1">Your played singles</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default JumpBackInSection;
