import React, { useRef, useState, useCallback, memo, useEffect } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { togglePlay } from "../../../../../slices/user/playerSlice";
import api from "../../../../../api";
import { Shuffle } from "lucide-react";

// Memoized selector for player state
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

const AlbumSection = memo(({ title }) => {
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [albumlistData, setAlbumlistData] = useState([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentTrack, status, queue, queueIndex, currentContext } = useSelector(
    selectPlayerState,
    shallowEqual
  );
  const currentMusicId = currentTrack?.id;
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';
  const currentIndex = queueIndex;

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const response = await api.get(`/api/v1/home/albumlist/?top10=true`);
        setAlbumlistData(response.data.results || response.data || []);
      } catch (error) {
        console.error("Error fetching album items:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlbums();
  }, []);

  const handleScroll = useCallback((direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  }, []);

  const handlePlay = useCallback(
    (item, e) => {
      e.stopPropagation();
      const isSameContext = currentContext?.type === 'album' && String(currentContext?.id) === String(item.id);
      
      if (isSameContext) {
        dispatch(togglePlay());
      } else {
        navigate(`/album/${item.id}`, { state: { autoPlay: true } });
      }
    },
    [dispatch, currentContext, navigate]
  );

  const handleShufflePlay = useCallback(
    (item, e) => {
      e.stopPropagation();
      navigate(`/album/${item.id}`, { state: { autoPlay: true, autoShuffle: true } });
    },
    [navigate]
  );

  const isItemPlaying = useCallback(
    (item) => {
      const isSameContext = currentContext?.type === 'album' && String(currentContext?.id) === String(item.id);
      return isSameContext && isPlaying;
    },
    [currentContext, isPlaying]
  );

  const handleAlbumClick = useCallback((albumId) => {
    navigate(`/album/${albumId}`);
  }, [navigate]);

  const handleShowMore = useCallback(() => {
    navigate("/albums-show-more", { state: { title } });
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

  if (!albumlistData.length) return null;

  return (
    <section className="mb-8 relative" aria-label={`Album section: ${title}`}>
      <div className="flex justify-between items-center mb-4 px-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <button
          onClick={handleShowMore}
          className="text-sm text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          aria-label={`Show all albums for ${title}`}
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
              onClick={() => handleScroll("left")}
              className="absolute left-0 top-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transform -translate-y-1/2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Scroll albums left"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => handleScroll("right")}
              className="absolute right-0 top-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transform -translate-y-1/2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Scroll albums right"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          role="region"
          aria-label="Album list"
        >
          <div className="flex gap-4 px-4">
            {albumlistData.map((item) => (
              <div
                key={item.id} // Use item.id for uniqueness
                className="flex-none w-40 cursor-pointer"
                onClick={() => handleAlbumClick(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleAlbumClick(item.id)}
                aria-label={`View album ${item.name || "Unknown Album"}`}
              >
                <div className="relative group">
                  <img
                    src={item.cover_photo || "/api/v1/placeholder/192/192"} // Fallback image
                    alt={item.name || "Unknown Album"}
                    className="w-40 h-40 object-cover rounded-md"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-md">
                    <div className="absolute bottom-2 right-2 flex gap-2">
                       <button
                        className={`w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full items-center justify-center hidden group-hover:flex shadow-xl transition-all`}
                        onClick={(e) => handleShufflePlay(item, e)}
                        title="Shuffle Play"
                      >
                        <Shuffle className="w-5 h-5 text-white" />
                      </button>
                      <button
                        className={`w-12 h-12 bg-green-500 rounded-full items-center justify-center ${
                          isItemPlaying(item) ? "flex" : "hidden group-hover:flex"
                        } shadow-xl hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-green-500`}
                        onClick={(e) => handlePlay(item, e)}
                        aria-label={isItemPlaying(item) ? `Pause ${item.name || "album"}` : `Play ${item.name || "album"}`}
                      >
                        {isItemPlaying(item) ? (
                          <Pause className="w-6 h-6 text-black" />
                        ) : (
                          <Play className="w-6 h-6 text-black" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="font-bold text-white truncate" title={item.name || "Unknown Album"}>
                    {item.name || "Unknown Album"}
                  </h3>
                  {(item.created_by || item.artist) && (
                    <p
                      className="text-sm text-gray-400 truncate"
                      title={item.created_by || item.artist || "Unknown Artist"}
                    >
                      {item.created_by || item.artist || "Unknown Artist"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

AlbumSection.displayName = 'AlbumSection';
export default AlbumSection;