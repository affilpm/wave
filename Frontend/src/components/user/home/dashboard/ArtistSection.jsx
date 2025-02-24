import React, { useRef, useState } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';

const ArtistSection = ({ title, items }) => {
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
console.log(items)
  const { 
    musicId, 
    isPlaying, 
    currentArtistId 
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

  const handlePlayArtist = async (artist, e) => {
    e.stopPropagation();
    // Implement artist playback logic here
    // This would typically play the artist's top tracks or latest releases
  };

  const isArtistPlaying = (artist) => {
    return Number(currentArtistId) === Number(artist.id) && isPlaying;
  };

  const handleArtistClick = (artistId) => {
    navigate(`/artist/${artistId}`);
  };

  const handleShowMore = () => {
    navigate("/artists-show-more", { state: { title } });
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
            {items.map((artist, index) => (
              <div
                key={index}
                className="flex-none w-40"
                onClick={() => handleArtistClick(artist.id)}
              >
                <div className="relative group">
                  <div className="w-40 h-40 rounded-full overflow-hidden">
                    <img
                      src={artist.cover_photo}
                      alt={artist.name}
                      className="w-full h-full object-cover transform transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-full">
                    <button
                      className={`absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center ${
                        isArtistPlaying(artist) ? 'flex' : 'hidden group-hover:flex'
                      } shadow-xl hover:scale-105 transition-all`}
                      onClick={(e) => handlePlayArtist(artist, e)}
                    >
                      {isArtistPlaying(artist) ? (
                        <Pause className="w-6 h-6 text-black" />
                      ) : (
                        <Play className="w-6 h-6 text-black" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <h3 className="font-bold text-white truncate">{artist.name}</h3>
                  <p className="text-sm text-gray-400 truncate">Artist</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtistSection;