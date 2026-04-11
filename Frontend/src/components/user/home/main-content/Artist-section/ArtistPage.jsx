import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Play, Pause, Clock, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import api from "../../../../../api";
import { prepareTracksForPlayer } from "../../../../../utils/trackUtils";
import {
  formatDuration,
  convertToSeconds,
  convertToHrMinFormat,
} from "../../../../../utils/formatters";
import { usePlayCollection } from "../../../../../hooks/usePlayCollection";
import { toggleFollowArtist, selectFollowedArtists } from "../../../../../slices/user/librarySlice";
import { toast } from "react-toastify";
import ShareModal from "../../../../common/ShareModal";

const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentTrack: player.currentTrack,
    currentContext: player.currentContext,
  })
);

// Memoized TrackRow component for stability and performance
const TrackRow = React.memo(({ 
  song, 
  index, 
  currentMusicId, 
  isCollectionActive, 
  isCollectionPlaying, 
  onPlaySong 
}) => {
  const isThisTrackPlaying = useMemo(
    () => Number(currentMusicId) === Number(song.id) && isCollectionActive,
    [currentMusicId, isCollectionActive]
  );

  return (
    <tr
      className={`group hover:bg-white/10 transition-colors cursor-pointer ${
        isThisTrackPlaying ? "bg-white/5" : ""
      }`}
      onClick={() => onPlaySong(song, index)}
    >
      <td className="py-2 md:py-3 pl-2 md:pl-4">
        <div className="flex items-center justify-center w-6 md:w-8 h-8 group relative">
          {isThisTrackPlaying && isCollectionPlaying ? (
            <div className="flex items-center gap-0.5 h-4 items-end">
              <motion.span 
                animate={{ height: ["20%", "60%", "30%", "80%", "40%"] }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                className="w-0.5 min-h-[4px] bg-green-500 rounded-full"
              />
              <motion.span 
                animate={{ height: ["40%", "90%", "50%", "100%", "60%"] }}
                transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut", delay: 0.1 }}
                className="w-0.5 min-h-[4px] bg-green-500 rounded-full"
              />
              <motion.span 
                animate={{ height: ["15%", "50%", "25%", "70%", "35%"] }}
                transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.2 }}
                className="w-0.5 min-h-[4px] bg-green-500 rounded-full"
              />
            </div>
          ) : (
            <>
              <span className={`group-hover:hidden text-xs md:text-sm font-medium ${isThisTrackPlaying ? 'text-green-500' : 'text-gray-400'}`}>
                {index + 1}
              </span>
              <button
                className="hidden group-hover:flex items-center justify-center p-1.5 hover:text-white text-gray-400 active:scale-90 transition-transform bg-black/40 rounded-full backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlaySong(song, index);
                }}
              >
                {isThisTrackPlaying && isCollectionPlaying ? (
                  <Pause className="h-3 w-3 md:h-4 md:w-4 fill-current" />
                ) : (
                  <Play className="h-3 w-3 md:h-4 md:w-4 fill-current ml-0.5" />
                )}
              </button>
            </>
          )}
        </div>
      </td>
      <td className="py-2 md:py-3 pl-2 md:pl-3">
        <div className="flex items-center gap-2 md:gap-3">
          <img
            src={song.cover_photo || "/api/v1/placeholder/40/40"}
            alt={song.name}
            className="w-8 h-8 md:w-10 md:h-10 rounded-md shadow-md"
          />
          <span className={`text-sm md:text-base font-medium truncate ${isThisTrackPlaying ? 'text-green-500' : ''}`}>
            {song.name}
          </span>
        </div>
      </td>
      <td className="py-2 md:py-3 hidden md:table-cell pl-3 text-sm text-gray-400">
        {song.album_name ? (
          <Link to={`/album/${song.album_id}`} className="hover:underline hover:text-white transition-colors">
            {song.album_name}
          </Link>
        ) : (
          "Single"
        )}
      </td>
      <td className="py-2 md:py-3 text-center text-xs md:text-sm text-gray-400">
        {formatDuration(song.duration)}
      </td>
    </tr>
  );
}, (prev, next) => 
  prev.song.id === next.song.id && 
  prev.index === next.index && 
  prev.currentMusicId === next.currentMusicId && 
  prev.isCollectionActive === next.isCollectionActive && 
  prev.isCollectionPlaying === next.isCollectionPlaying
);

const ArtistDetailPage = () => {
  const { artistId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const autoPlayHandled = useRef(false);

  const [artist, setArtist] = useState(null);
  const [publicSongs, setPublicSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalDuration, setTotalDuration] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const followedArtists = useSelector(selectFollowedArtists);
  const isFollowing = useMemo(() => {
    if (!artistId) return false;
    return followedArtists.some(f => (f.artist?.id || f.id) === Number(artistId));
  }, [followedArtists, artistId]);

  const currentUserId = useSelector((state) => state.user_id);
  const currentUsername = useSelector((state) => state.user?.username);
  const { currentTrack, currentContext } = useSelector(
    selectPlayerState,
    shallowEqual
  );

  const currentMusicId = currentTrack?.id;

  // Check if viewing on mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch artist data, songs, and user info
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const artistResponse = await api.get(`/api/v1/home/artistlist/${artistId}/`);
        setArtist(artistResponse.data);
        const songsResponse = await api.get(`/api/v1/music/artist/${artistId}/`);
        setPublicSongs(songsResponse.data.results || songsResponse.data);
        const followersCountResponse = await api.get(`/api/v1/artists/${artistId}/followers-count/`);
        setFollowersCount(followersCountResponse.data.followers_count);
      } catch (err) {
        console.error("Error fetching artist data:", err);
        setError("Failed to load artist information.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [artistId]);

  // Calculate total duration
  useEffect(() => {
    if (publicSongs?.length) {
      const totalSeconds = publicSongs.reduce((acc, song) => {
        const duration = song.duration || "00:00:00";
        return acc + convertToSeconds(duration);
      }, 0);
      setTotalDuration(convertToHrMinFormat(totalSeconds));
    }
  }, [publicSongs]);

  // Memoize songs for stable props
  const stableSongs = useMemo(() => publicSongs || [], [publicSongs]);

  const context = useMemo(() => ({
    type: 'artist',
    id: artistId
  }), [artistId]);

  // Prepare formatted tracks for the player
  const formattedTracks = useMemo(
    () => prepareTracksForPlayer(stableSongs, artist, currentUserId),
    [stableSongs, artist, currentUserId]
  );

  // Hook handles all play/pause/toggle/shuffle logic
  const {
    handlePlayCollection: handlePlayAll,
    handlePlayTrackAtIndex,
    handleShufflePlay,
    isCollectionPlaying,
    isCollectionActive: isCurrentTrackFromArtist,
  } = usePlayCollection({ tracks: formattedTracks, context });

  // Handle play individual song 
  const handlePlaySong = useCallback(
    (_song, index) => {
      handlePlayTrackAtIndex(index);
    },
    [handlePlayTrackAtIndex]
  );

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  // Handle autoPlay from location state
  useEffect(() => {
    if (stableSongs.length > 0 && !autoPlayHandled.current) {
      if (location.state?.autoPlay) {
        if (location.state?.autoShuffle) {
          handleShufflePlay();
        } else {
          handlePlayAll();
        }
        navigate(location.pathname, { replace: true, state: {} });
      }
      autoPlayHandled.current = true;
    }
  }, [stableSongs.length, location.state, location.pathname, handlePlayAll, handleShufflePlay, navigate]);

  // Toggle follow
  const toggleFollow = () => {
    if (!artist) return;
    dispatch(toggleFollowArtist(artist));
    setFollowersCount((prevCount) => isFollowing ? prevCount - 1 : prevCount + 1);
  };

  // Get color for profile placeholder
  const getColor = (username) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    ];
    const index = username ? username.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  if (loading) return <div className="p-4 text-white">Loading artist details...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!artist) return <div className="p-4 text-white">Artist not found</div>;

  const bottomPadding = isMobile ? "pb-40" : "pb-24";

  return (
    <div className={`w-full overflow-y-auto bg-gradient-to-b from-gray-900 via-black to-black text-white ${bottomPadding}`}>
      {/* Artist header section */}
      <div className="flex flex-col items-center md:items-end md:flex-row gap-4 md:gap-6 p-4 md:p-6">
        <div className="w-32 h-32 md:w-48 md:h-48 flex-shrink-0 rounded-full overflow-hidden">
          {artist.profile_photo ? (
            <img
              src={artist.profile_photo}
              alt={artist.username}
              className="w-full h-full object-cover rounded-lg shadow-2xl"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center ${getColor(artist.username)} rounded-lg shadow-2xl text-2xl md:text-4xl font-bold text-white`}
            >
              {artist.username && artist.username.charAt(0).toUpperCase()}
              {artist.username && artist.username.charAt(artist.username.length - 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 md:gap-4 text-center md:text-left">
          <span className="text-xs md:text-sm text-green-400 font-medium tracking-wider">Verified Artist</span>
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold tracking-tight">
            {artist.username}
          </h1>
          {artist.bio && <p className="text-gray-300 max-w-2xl text-sm md:text-base">{artist.bio}</p>}
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 md:gap-4 text-gray-300">
            <span className="text-xs md:text-sm">
              {publicSongs.length} songs
            </span>
            <span className="text-xs md:text-sm hidden sm:inline">
              • {followersCount} followers • {totalDuration}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center md:justify-start gap-3 md:gap-4 p-4 md:p-6">
        <button
          className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-green-500 hover:bg-green-400 active:scale-95 flex items-center justify-center transition-all shadow-lg overflow-hidden"
          onClick={handlePlayAll}
          disabled={publicSongs.length === 0}
        >
          <AnimatePresence mode="wait">
            {isCollectionPlaying ? (
              <motion.div
                key="pause"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Pause className="h-5 w-5 md:h-6 md:w-6 text-black fill-black" />
              </motion.div>
            ) : (
              <motion.div
                key="play"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Play className="h-5 w-5 md:h-6 md:w-6 text-black fill-black ml-1" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {!(artist?.username === currentUsername) && (
          <button
            className={`px-4 py-2 text-sm md:text-base md:px-6 md:py-2 font-semibold rounded-full border ${
              isFollowing 
                ? "bg-white text-black border-white hover:bg-transparent hover:text-white" 
                : "text-white border-gray-400 hover:border-white"
            } transition-colors`}
            onClick={toggleFollow}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}

        <button 
          onClick={handleShare}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <Share2 className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>

      {/* Songs section */}
      <div className="p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Songs</h2>
        {publicSongs.length === 0 ? (
          <p className="text-gray-400">This artist has no public songs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-full">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="font-normal py-2 md:py-3 w-10 md:w-12 pl-2 md:pl-4">#</th>
                  <th className="font-normal text-left py-2 md:py-3 pl-2 md:pl-3">Title</th>
                  <th className="font-normal text-left py-2 md:py-3 hidden md:table-cell pl-3">
                    Album
                  </th>
                  <th className="font-normal text-center py-2 md:py-3 w-16 md:w-20">
                    <Clock className="h-4 w-4 inline" />
                  </th>
                </tr>
              </thead>
                <tbody>
                  {stableSongs.map((song, index) => (
                    <TrackRow 
                      key={song.id} 
                      song={song} 
                      index={index}
                      currentMusicId={currentMusicId}
                      isCollectionActive={isCurrentTrackFromArtist}
                      isCollectionPlaying={isCollectionPlaying}
                      onPlaySong={handlePlaySong}
                      artistUsername={artist.username}
                    />
                  ))}
                </tbody>
            </table>
          </div>
        )}
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={window.location.href}
        title={artist ? `Check out the artist ${artist.username} on Wave!` : 'Check out this artist on Wave!'}
      />
    </div>
  );
};

export default ArtistDetailPage;