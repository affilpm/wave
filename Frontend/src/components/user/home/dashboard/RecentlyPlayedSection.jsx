import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import api from "../../../../api";
import { 
  setMusicId,
  setIsPlaying,
  setQueue,
  clearQueue,
  setCurrentPlaylistId
} from "../../../../slices/user/musicPlayerSlice";

const RecentlyPlayedSection = ({ title }) => {
  const dispatch = useDispatch();
  const { musicId, isPlaying } = useSelector((state) => state.musicPlayer);
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecentlyPlayed = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/listening_history/recently-played/");
        setRecentTracks(response.data);
      } catch (error) {
        console.error("Error fetching recently played tracks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentlyPlayed();
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
    id: track.music_id,
    name: track.title,
    artist: track.artist,
    cover_photo: track.cover_photo,
    audio_file: track.audio_file,
    play_count: track.play_count
  });

  const handlePlay = async (track, e) => {
    e.stopPropagation();
    
    const formattedTrack = prepareTrackForPlayer(track);
    const sectionId = 'recently-played-section';
    
    if (musicId === formattedTrack.id) {
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    dispatch(clearQueue());
    dispatch(setQueue({
      tracks: [formattedTrack],
      playlistId: sectionId
    }));
    
    dispatch(setCurrentPlaylistId(sectionId));
    dispatch(setMusicId(formattedTrack.id));
    dispatch(setIsPlaying(true));
  };

  const isItemPlaying = (track) => {
    return musicId === track.music_id && isPlaying;
  };

  if (loading) {
    return <div className="px-4">Loading recently played tracks...</div>;
  }

  if (!recentTracks.length) {
    return null;
  }

  return (
    <section className="mb-8 relative">
      <div className="flex justify-between items-center mb-4 px-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="text-sm text-gray-400">
          Your recently played tracks
        </div>
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
            {recentTracks.map((track, index) => (
              <div
                key={index}
                className="flex-none w-40"
              >
                <div className="relative group">
                  <img
                    src={track.cover_photo || `/api/placeholder/160/160`}
                    alt={track.title}
                    className="w-40 h-40 object-cover rounded-md"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-md">
                    <button
                      className={`absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center ${
                        isItemPlaying(track) ? 'flex' : 'hidden group-hover:flex'
                      } shadow-xl hover:scale-105 transition-all`}
                      onClick={(e) => handlePlay(track, e)}
                      aria-label={isItemPlaying(track) ? "Pause" : "Play"}
                    >
                      {isItemPlaying(track) ? (
                        <Pause className="w-6 h-6 text-black" />
                      ) : (
                        <Play className="w-6 h-6 text-black" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="font-bold text-white truncate">{track.title}</h3>
                  <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                  {/* <p className="text-xs text-gray-500">Played {track.play_count} times</p> */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RecentlyPlayedSection;