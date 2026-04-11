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

const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentTrack: player.currentTrack,
    currentContext: player.currentContext,
  })
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

        // Fetch artist information
        const artistResponse = await api.get(`/api/v1/home/artistlist/${artistId}/`);
        setArtist(artistResponse.data);

        // Fetch artist's public songs
        const songsResponse = await api.get(`/api/v1/music/artist/${artistId}/`);
        setPublicSongs(songsResponse.data.results || songsResponse.data);

        // Fetch followers count
        const followersCountResponse = await api.get(`/api/v1/artists/${artistId}/followers-count/`);
        setFollowersCount(followersCountResponse.data.followers_count);

        // Follow status is now handled by Redux selector 'isFollowing'
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
    
    // Dispatch Redux action for global state (sidebar)
    dispatch(toggleFollowArtist(artist));
    
    // Update local followers count for immediate UI feedback
    setFollowersCount((prevCount) => isFollowing ? prevCount - 1 : prevCount + 1);
  };

  // Get color for profile placeholder
  const getColor = (username) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
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

        <button className="p-2 text-gray-400 hover:text-white transition-colors">
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
                  {stableSongs.map((song, index) => {
                    const isThisTrackPlaying =
                      Number(currentMusicId) === Number(song.id) &&
                      isCurrentTrackFromArtist &&
                      isCollectionPlaying;
                    return (
                        <tr
                          key={song.id}
                          className={`group hover:bg-white/10 transition-colors cursor-pointer ${
                            isThisTrackPlaying ? "bg-white/5" : ""
                          }`}
                          onClick={() => handlePlaySong(song, index)}
                        >
                          <td className="py-2 md:py-3 pl-2 md:pl-4">
                            <div className="flex items-center justify-center w-6 md:w-8 group">
                              {isThisTrackPlaying ? (
                                <div className="flex items-center gap-0.5">
                                  <span className="w-0.5 h-2 md:h-3 bg-green-500 rounded-full animate-pulse"></span>
                                  <span className="w-0.5 h-3 md:h-4 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }}></span>
                                  <span className="w-0.5 h-1.5 md:h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></span>
                                </div>
                              ) : (
                                <>
                                  <span className={`group-hover:hidden text-xs md:text-sm ${isThisTrackPlaying ? 'text-green-500' : ''}`}>{index + 1}</span>
                                  <button
                                    className="hidden group-hover:block p-1 hover:text-white text-gray-400 active:scale-90 transition-transform"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePlaySong(song, index);
                                    }}
                                  >
                                    <AnimatePresence mode="wait">
                                      {isThisTrackPlaying ? (
                                        <motion.div
                                          key="pause-inner"
                                          initial={{ scale: 0.5, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          exit={{ scale: 0.5, opacity: 0 }}
                                          transition={{ duration: 0.15 }}
                                        >
                                          <Pause className="h-3 w-3 md:h-4 md:w-4 fill-current" />
                                        </motion.div>
                                      ) : (
                                        <motion.div
                                          key="play-inner"
                                          initial={{ scale: 0.5, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          exit={{ scale: 0.5, opacity: 0 }}
                                          transition={{ duration: 0.15 }}
                                        >
                                          <Play className="h-3 w-3 md:h-4 md:w-4 fill-current ml-0.5" />
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        <td className="py-2 md:py-3 pl-2 md:pl-3">
                          <div className="flex items-center gap-2 md:gap-3">
                            <img
                              src={song.cover_photo || "/api/v1/placeholder/40/40"}
                              alt={song.title}
                              className="w-8 h-8 md:w-10 md:h-10 rounded-md"
                            />
                            <div>
                              <div
                                className={`text-sm md:text-base ${
                                  isThisTrackPlaying ? "text-green-500" : "text-white"
                                }`}
                              >
                                {song.title}
                              </div>
                              <div className="text-xs md:text-sm text-gray-400">
                                {artist.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 md:py-3 pl-3 hidden md:table-cell text-gray-400">
                          {song.album_id ? (
                            <Link 
                              to={`/album/${song.album_id}`} 
                              className="hover:underline hover:text-white transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {song.album_name}
                            </Link>
                          ) : (
                            "Single"
                          )}
                        </td>
                        <td className="py-2 md:py-3 text-center text-gray-400 text-xs md:text-sm w-16 md:w-20">
                          {formatDuration(song.duration)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistDetailPage;