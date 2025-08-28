import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, Pause, Clock, Share2 } from "lucide-react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import api from "../../../../../api";
import {
  setCurrentMusic,
  setQueue,
  clearQueue,
  setIsPlaying,
} from "../../../../../slices/user/playerSlice";
import {
  formatDuration,
  convertToSeconds,
  convertToHrMinFormat,
} from "../../../../../utils/formatters";

const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentMusicId: player.currentMusicId,
    isPlaying: player.isPlaying,
    queue: player.queue,
    currentIndex: player.currentIndex,
  })
);

const ArtistDetailPage = () => {
  const { artistId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [artist, setArtist] = useState(null);
  const [publicSongs, setPublicSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalDuration, setTotalDuration] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [currentArtistId, setCurrentArtistId] = useState(null);

  const currentUserId = useSelector((state) => state.user_id);
  const { currentMusicId, isPlaying, queue, currentIndex } = useSelector(
    selectPlayerState,
    shallowEqual
  );

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
        const artistResponse = await api.get(`/api/home/artistlist/${artistId}/`);
        setArtist(artistResponse.data);

        // Fetch artist's public songs
        const songsResponse = await api.get(`/api/music/artist/${artistId}/`);
        setPublicSongs(songsResponse.data.results || songsResponse.data);

        // Fetch followers count
        const followersCountResponse = await api.get(`/api/artists/${artistId}/followers-count/`);
        setFollowersCount(followersCountResponse.data.followers_count);

        // Check if current user is following this artist
        try {
          const userFollowingResponse = await api.get(`/api/artists/me/following/`);
          const isFollowingArtist = userFollowingResponse.data.some(
            (follow) => follow.artist.id === Number(artistId)
          );
          setIsFollowing(isFollowingArtist);
        } catch (err) {
          console.error("Error checking follow status:", err);
          setIsFollowing(false);
        }

        // Initialize currentArtistId if queue contains tracks from this artist
        if (
          queue.length > 0 &&
          queue.some((track) => Number(track.artist_id) === Number(artistId))
        ) {
          setCurrentArtistId(Number(artistId));
        }
      } catch (err) {
        console.error("Error fetching artist data:", err);
        setError("Failed to load artist information.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [artistId, queue]);

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

  // Memoize track preparation (aligned with AlbumPage)
  const prepareTrackForPlayer = useCallback(
    (song) => ({
      id: Number(song.id),
      name: song.title || song.name || "Unknown Track",
      title: song.title || song.name || "Unknown Track",
      artist: song.artist_username || artist?.username || "Unknown Artist",
      artist_full:
        song.artist_full_name ||
        artist?.full_name ||
        artist?.username ||
        "Unknown Artist",
      album: song.album_name || "Unknown Album",
      cover_photo: song.cover_photo || null,
      duration: convertToSeconds(song.duration || "00:00:00"),
      genre: song.genre || "",
      year: song.release_date
        ? new Date(song.release_date).getFullYear()
        : null,
      release_date: song.release_date || null,
      track_number: song.track_number || 0,
      album_id: Number(song.album_id) || null,
      album_name: song.album_name || "Unknown Album",
      artist_id: Number(artistId) || null,
      added_by_user: currentUserId || null,
      added_at: new Date().toISOString(),
    }),
    [artist, artistId, currentUserId]
  );

  // Memoize isCurrentTrackFromArtist (aligned with isCurrentTrackFromAlbum)
  const isCurrentTrackFromArtist = useMemo(() => {
    if (
      !stableSongs.length ||
      !currentMusicId ||
      currentArtistId !== Number(artistId)
    ) {
      return false;
    }
    const currentTrack = queue[currentIndex];
    const isTrackInArtistSongs = stableSongs.some(
      (song) => Number(song.id) === Number(currentMusicId)
    );
    return (
      currentTrack &&
      Number(currentTrack.id) === Number(currentMusicId) &&
      isTrackInArtistSongs
    );
  }, [stableSongs, currentMusicId, currentArtistId, queue, currentIndex, artistId]);

  // Handle play all songs (aligned with handlePlayAlbum)
  const handlePlayAll = useCallback(() => {
    if (!stableSongs.length) return;

    if (isCurrentTrackFromArtist) {
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    const formattedTracks = stableSongs.map(prepareTrackForPlayer);
    dispatch(clearQueue());
    dispatch(setQueue(formattedTracks));
    setCurrentArtistId(Number(artistId));

    if (formattedTracks.length > 0) {
      dispatch(setCurrentMusic(formattedTracks[0]));
      dispatch(setIsPlaying(true));
    }
  }, [dispatch, isCurrentTrackFromArtist, isPlaying, artistId, stableSongs, prepareTrackForPlayer]);

  // Handle play individual song 
  const handlePlaySong = useCallback(
    (song, index) => {
      const formattedTracks = stableSongs.map(prepareTrackForPlayer);
      const formattedTrack = formattedTracks[index];

      if (
        Number(currentMusicId) === Number(formattedTrack.id) &&
        currentArtistId === Number(artistId)
      ) {
        dispatch(setIsPlaying(!isPlaying));
        return;
      }

      if (currentArtistId !== Number(artistId)) {
        dispatch(clearQueue());
        dispatch(setQueue(formattedTracks));
        setCurrentArtistId(Number(artistId));
      }

      dispatch(setCurrentMusic(formattedTrack));
      dispatch(setIsPlaying(true));
    },
    [currentMusicId, currentArtistId, isPlaying, artistId, stableSongs, dispatch, prepareTrackForPlayer]
  );

  // Toggle follow
  const toggleFollow = async () => {
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.delete(`/api/artists/${artistId}/follow/`);
        setIsFollowing(false);
        setFollowersCount((prevCount) => prevCount - 1);
      } else {
        await api.post(`/api/artists/${artistId}/follow/`);
        setIsFollowing(true);
        setFollowersCount((prevCount) => prevCount + 1);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setFollowLoading(false);
    }
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
          className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors"
          onClick={handlePlayAll}
          disabled={publicSongs.length === 0}
        >
          {isPlaying && isCurrentTrackFromArtist ? (
            <Pause className="h-5 w-5 md:h-6 md:w-6 text-black" />
          ) : (
            <Play className="h-5 w-5 md:h-6 md:w-6 text-black ml-1" />
          )}
        </button>

        <button
          className={`px-4 py-2 text-sm md:text-base md:px-6 md:py-2 font-semibold rounded-full border ${
            isFollowing 
              ? "bg-white text-black border-white hover:bg-transparent hover:text-white" 
              : "text-white border-gray-400 hover:border-white"
          } transition-colors`}
          onClick={toggleFollow}
          disabled={followLoading}
        >
          {followLoading ? "Processing..." : isFollowing ? "Following" : "Follow"}
        </button>

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
                    Added
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
                      isPlaying;
                    return (
                      <tr
                        key={song.id}
                        className={`group hover:bg-white/10 transition-colors ${
                          isThisTrackPlaying ? "bg-white/20" : ""
                        }`}
                        onClick={() => handlePlaySong(song, index)}
                      >
                        <td className="py-2 md:py-3 pl-2 md:pl-4">
                          <div className="flex items-center justify-center w-6 md:w-8 group">
                            <span className="group-hover:hidden text-xs md:text-sm">{index + 1}</span>
                            <button
                              className="hidden group-hover:block p-1 hover:text-white text-gray-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlaySong(song, index);
                              }}
                            >
                              {isThisTrackPlaying ? (
                                <Pause className="h-3 w-3 md:h-4 md:w-4" />
                              ) : (
                                <Play className="h-3 w-3 md:h-4 md:w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-2 md:py-3 pl-2 md:pl-3">
                          <div className="flex items-center gap-2 md:gap-3">
                            <img
                              src={song.cover_photo || "/api/placeholder/40/40"}
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
                          {song.release_date}
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