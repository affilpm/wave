import React, { useRef, useState } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import PlaylistSectionMenuModal from "./PlaylistSectionMenuModal";
import PlaylistPlayButton from "./PLaylistPlayButton";



const PlaylistSection = ({ title, items, isPlaying, setIsPlaying, onPlaylistClick }) => {
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);

  const handlePlaylistAddSuccess = (playlistId) => {
    console.log("Playlist added to library successfully:", playlistId);
    // Here you could trigger a refresh of the library data if needed
  };
  console.log('fg',items)
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

  return (
    <section className="mb-8 relative">
      <div className="flex justify-between items-center mb-4 px-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        {/* Add Show all button if needed */}
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
            {items.map((item) => (
              <div
                key={item.id}
                className="flex-none w-40"
                onClick={() => onPlaylistClick(item.id)}
              >
                <div className="relative group">
                  <img
                    src={item.cover_photo}
                    alt={item.name}
                    className="w-25 h-25 object-cover rounded-md shadow-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-md">
                  <PlaylistPlayButton 
  playlist={item} 
  className="absolute bottom-2 right-2 hidden group-hover:flex"
/>
                  </div>
                  <div className="absolute top-2 right-2">
                    <PlaylistSectionMenuModal
                      playlist={{
                        id: item.id,
                        name: item.name,
                      }}
                      onSuccess={() => handlePlaylistAddSuccess(item.id)}
                    />
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
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlaylistSection;