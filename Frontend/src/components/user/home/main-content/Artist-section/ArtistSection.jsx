import React, { useRef, useState, useCallback, useEffect } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  togglePlay
} from "../../../../../slices/user/playerSlice";
import api from "../../../../../api";

const ArtistSection = ({ title }) => {
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [loading, setLoading] = useState(true);
  const [artistlist, setArtistlist] = useState([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const response = await api.get(`/api/v1/home/artistlist/`);
        setArtistlist(response.data.results || response.data || []);
      } catch (error) {
        console.error("Error fetching artist items:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArtists();
  }, []);

  // Selectors at top level
  const { currentTrack, status, queue, queueIndex, currentContext } = useSelector(
    (state) => state.player
  );
  const isPlaying = status === 'playing';
  const currentMusicId = currentTrack?.id;
  const currentUserId = useSelector((state) => state.user_id);

  // Handle scroll for left/right navigation
  const handleScroll = (direction) => {
    const container = scrollContainerRef.current; // Fixed typo: personallyRef → scrollContainerRef
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };


  const isCurrentTrackFromArtist = useCallback(
    (artistId) => {
      if (!currentTrack || !currentMusicId) return false;
      const isSameContext = currentContext?.type === 'artist' && String(currentContext?.id) === String(artistId);
      return isSameContext && Number(currentTrack.artist_id) === Number(artistId);
    },
    [currentTrack, currentMusicId, currentContext]
  );

  const handlePlayArtist = (artist, e) => {
    e.stopPropagation();
    if (isCurrentTrackFromArtist(artist.id)) {
      dispatch(togglePlay());
    } else {
      navigate(`/artist/${artist.id}`, { state: { autoPlay: true } });
    }
  };

  const handleShufflePlay = (artist, e) => {
    e.stopPropagation();
    navigate(`/artist/${artist.id}`, { state: { autoPlay: true, autoShuffle: true } });
  };

  // Handle artist click to navigate to artist page
  const handleArtistClick = (artistId) => {
    navigate(`/artist/${artistId}`);
  };

  // Handle show more
  const handleShowMore = () => {
    navigate("/artists-show-more", { state: { title } });
  };

  // Color array for profile placeholder
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];

  // Get color based on username
  const getColor = (username) => {
    const index = username ? username.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  if (loading) {
    return (
      <section className="mb-8 px-4">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-none w-40 h-40 bg-gray-800 animate-pulse rounded-full" />
          ))}
        </div>
      </section>
    );
  }

  if (!artistlist.length) return null;

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
              onClick={() => handleScroll("left")}
              className="absolute left-0 top-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transform -translate-y-1/2 transition-transform hover:scale-110"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => handleScroll("right")}
              className="absolute right-0 top-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transform -translate-y-1/2 transition-transform hover:scale-110"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="flex gap-4 px-4">
            {artistlist.map((artist) => (
              <div
                key={artist.id}
                className="flex-none w-40"
                onClick={() => handleArtistClick(artist.id)}
              >
                <div className="relative group">
                  <div className="w-40 h-40 rounded-full overflow-hidden">
                    {artist.profile_photo ? (
                      <img
                        src={artist.profile_photo}
                        alt={artist.name}
                        className="w-full h-full object-cover transform transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex items-center justify-center ${getColor(
                          artist.username
                        )} text-xl font-bold text-white transform transition-transform group-hover:scale-105`}
                      >
                        {artist.username?.charAt(0).toUpperCase()}
                        {artist.username?.charAt(artist.username.length - 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-full">
                    <div className="absolute bottom-2 right-2 flex gap-2">
                       <button
                        className={`w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full items-center justify-center hidden group-hover:flex shadow-xl transition-all`}
                        onClick={(e) => handleShufflePlay(artist, e)}
                        title="Shuffle Play"
                      >
                        <Shuffle className="w-5 h-5 text-white" />
                      </button>
                      <button
                        className={`w-12 h-12 bg-green-500 rounded-full flex items-center justify-center ${
                          isCurrentTrackFromArtist(artist.id) ? "flex" : "hidden group-hover:flex"
                        } shadow-xl hover:scale-105 transition-all`}
                        onClick={(e) => handlePlayArtist(artist, e)}
                      >
                        {isCurrentTrackFromArtist(artist.id) && isPlaying ? (
                          <Pause className="w-6 h-6 text-black" />
                        ) : (
                          <Play className="w-6 h-6 text-black" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <h3 className="font-bold text-white truncate">{artist.username}</h3>
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