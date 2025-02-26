import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

const RecentlyPlayedSection = React.memo(({ title }) => {
  const dispatch = useDispatch();
  const { musicId, isPlaying } = useSelector((state) => state.musicPlayer);
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const prevMusicIdRef = useRef(null);

  // Fetch recently played tracks from API
  const fetchRecentlyPlayed = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/listening_history/recently-played/");
      setRecentTracks(response.data);
    } catch (error) {
      console.error("Error fetching recently played tracks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Make API call whenever musicId changes
  useEffect(() => {
    // Only make the API call if musicId has actually changed
    if (prevMusicIdRef.current !== musicId) {
      fetchRecentlyPlayed();
      prevMusicIdRef.current = musicId;
    }
  }, [musicId, fetchRecentlyPlayed]);

  // Initial data fetch on component mount
  useEffect(() => {
    fetchRecentlyPlayed();
  }, [fetchRecentlyPlayed]);

  // Memoized scroll handler
  const handleScroll = useCallback((direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }, []);

  // Memoize track preparation
  const prepareTrackForPlayer = useMemo(() => (track) => ({
    id: track.music_id,
    name: track.title,
    artist: track.artist,
    cover_photo: track.cover_photo,
    audio_file: track.audio_file,
    play_count: track.play_count
  }), []);

  // Memoize play handler with dependencies
  const handlePlay = useCallback((track, e) => {
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
  }, [dispatch, musicId, isPlaying, prepareTrackForPlayer]);

  // Memoize item playing check
  const isItemPlaying = useCallback((track) => {
    return musicId === track.music_id && isPlaying;
  }, [musicId, isPlaying]);

  // Memoize controls visibility handlers
  const showControlsHandler = useCallback(() => setShowControls(true), []);
  const hideControlsHandler = useCallback(() => setShowControls(false), []);

  // Memoize the track items
  const trackItems = useMemo(() => {
    return recentTracks.map((track, index) => (
      <div
        key={`${track.music_id}-${index}-${isItemPlaying(track)}`}
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
        </div>
      </div>
    ));
  }, [recentTracks, isItemPlaying, handlePlay]);

  if (loading && recentTracks.length === 0) {
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
        onMouseEnter={showControlsHandler}
        onMouseLeave={hideControlsHandler}
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
            {trackItems}
          </div>
        </div>
      </div>
    </section>
  );
});

// Set display name for better debugging
RecentlyPlayedSection.displayName = "RecentlyPlayedSection";

export default RecentlyPlayedSection;