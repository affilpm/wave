import React, { useRef, useState } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { handleAlbumPlaybackAction } from "../album/album-playback-utils";

const AlbumSection = ({ title, items }) => {
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get necessary state from Redux
  const { 
    musicId, 
    isPlaying, 
    queue, 
    currentPlaylistId 
  } = useSelector((state) => state.musicPlayer);

  const handleScroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handlePlay = async (item, e) => {
    e.stopPropagation();
    
    // Use the same pattern as AlbumPage
    await handleAlbumPlaybackAction({
      albumId: item.id,
      dispatch,
      currentState: { 
        musicId, 
        isPlaying, 
        queue, 
        currentPlaylistId 
      }
    });
  };

  const isItemPlaying = (item) => {
    // Match the check in AlbumPage
    return Number(currentPlaylistId) === Number(item.id) && isPlaying;
  };

  const handleAlbumClick = (albumId) => {
    navigate(`/album/${albumId}`);
  };

  const handleShowMore = () => {
    navigate("/albums-show-more", { state: { title } });
  };

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
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button
              onClick={() => handleScroll('right')}
              className="absolute right-0 top-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transform -translate-y-1/2 transition-transform hover:scale-110"
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
            {items.map((item, index) => (
              <div
                key={index}
                className="flex-none w-40"
                onClick={() => handleAlbumClick(item.id)}
              >
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
                      onClick={(e) => handlePlay(item, e)}
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
                  {item.created_by && (
                    <p className="text-sm text-gray-400 truncate">{item.created_by}</p>
                  )}
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

export default AlbumSection;