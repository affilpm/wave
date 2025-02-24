import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../../../../../api";
import { 
  setMusicId,
  setIsPlaying,
  setQueue,
  clearQueue,
  setCurrentPlaylistId
} from "../../../../../slices/user/musicPlayerSlice";

const MusicSection = ({ title }) => {
  const dispatch = useDispatch();
  const { musicId, isPlaying, currentPlaylistId } = useSelector((state) => state.musicPlayer);
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [musiclistData, setMusiclistData] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const musiclistResponse = await api.get(`/api/home/musiclist/?top10=true`);

        setMusiclistData(musiclistResponse.data.results || []);
        
      } catch (error) {
        console.error("Error fetching music data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const prepareTrackForPlayer = (track) => ({
    id: track.id,
    name: track.name,
    artist: track.artist,
    artist_full: track.artist_full,
    cover_photo: track.cover_photo,
    audio_file: track.audio_file,
    duration: track.duration
  });

  const handlePlay = async (item, e) => {
    e.stopPropagation();
    
    const formattedTrack = prepareTrackForPlayer(item);
    const sectionId = `section-${title.toLowerCase().replace(/\s+/g, '-')}`;
    
    // If clicking the currently playing track
    if (musicId === formattedTrack.id) {
      // Just toggle play/pause
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    // Playing a new track
    // Clear existing queue
    dispatch(clearQueue());
    
    // Add only the current track to the queue
    dispatch(setQueue({
      tracks: [formattedTrack],
      playlistId: sectionId
    }));
    
    // Set the new track ID and start playing
    dispatch(setCurrentPlaylistId(sectionId));
    dispatch(setMusicId(formattedTrack.id));
    dispatch(setIsPlaying(true));
  };

  const isItemPlaying = (item) => {
    return musicId === item.id && isPlaying;
  };

  const handleShowMore = () => {
    navigate("/music-show-more", { state: { title } });
  };

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
              <div
                key={index}
                className="flex-none w-40"
              >
                <div className="relative group">
                  <img
                    src={item.cover_photo}
                    alt={item.name}
                    className="w-25 h-25 object-cover rounded-md"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-md">
                    <button
                      className={`absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center ${
                        isItemPlaying(item) ? 'flex' : 'hidden group-hover:flex'
                      } shadow-xl hover:scale-105 transition-all`}
                      onClick={(e) => handlePlay(item, e)}
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