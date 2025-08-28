import React, { useRef, useState, useCallback, memo } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { handleAlbumPlaybackAction } from "./album-utils";

// Memoized selector for player state
const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentMusicId: player.currentMusicId,
    isPlaying: player.isPlaying,
    queue: player.queue,
    currentIndex: player.currentIndex,
  })
);

const AlbumSection = memo(({ title, items }) => {
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState({}); 
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentMusicId, isPlaying, queue, currentIndex } = useSelector(
    selectPlayerState,
    shallowEqual
  );

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
    async (item, e) => {
      e.stopPropagation();
      setIsLoading((prev) => ({ ...prev, [item.id]: true }));
      try {
        await handleAlbumPlaybackAction({
          albumId: item.id,
          dispatch,
          currentState: {
            currentMusicId,
            isPlaying,
            queue,
            currentIndex,
          },
        });
      } catch (error) {
        console.error("Playback error:", error);
      } finally {
        setIsLoading((prev) => ({ ...prev, [item.id]: false }));
      }
    },
    [dispatch, currentMusicId, isPlaying, queue, currentIndex]
  );

  const isItemPlaying = useCallback(
    (item) => {
      const currentTrack = queue[currentIndex];
      return (
        currentTrack &&
        currentTrack.id === currentMusicId &&
        currentTrack.album === Number(item.id) && // Ensure Number comparison
        isPlaying
      );
    },
    [currentMusicId, isPlaying, queue, currentIndex]
  );

  const handleAlbumClick = useCallback((albumId) => {
    navigate(`/album/${albumId}`);
  }, [navigate]);

  const handleShowMore = useCallback(() => {
    navigate("/albums-show-more", { state: { title } });
  }, [navigate, title]);

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
            {items.map((item) => (
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
                    src={item.cover_photo || "/api/placeholder/192/192"} // Fallback image
                    alt={item.name || "Unknown Album"}
                    className="w-40 h-40 object-cover rounded-md"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-md">
                    <button
                      className={`absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center ${
                        isItemPlaying(item) ? "flex" : "hidden group-hover:flex"
                      } shadow-xl hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-green-500`}
                      onClick={(e) => handlePlay(item, e)}
                      aria-label={isItemPlaying(item) ? `Pause ${item.name || "album"}` : `Play ${item.name || "album"}`}
                      disabled={isLoading[item.id]}
                    >
                      {isLoading[item.id] ? (
                        <svg
                          className="w-6 h-6 animate-spin text-black"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          />
                        </svg>
                      ) : isItemPlaying(item) ? (
                        <Pause className="w-6 h-6 text-black" />
                      ) : (
                        <Play className="w-6 h-6 text-black" />
                      )}
                    </button>
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

export default AlbumSection;