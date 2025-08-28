import React, { useRef, useState, useCallback } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  setCurrentMusic,
  setQueue,
  clearQueue,
  setIsPlaying,
} from "../../../../../slices/user/playerSlice";
import api from "../../../../../api";

const ArtistSection = ({ title, items }) => {
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Selectors at top level
  const { currentMusicId, isPlaying, queue, currentIndex } = useSelector(
    (state) => state.player
  );
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

  // Prepare track for player (aligned with ArtistDetailPage)
  const prepareTrackForPlayer = useCallback(
    (song, artist, userId) => ({
      id: Number(song.id),
      name: song.title || song.name || "Unknown Track",
      title: song.title || song.name || "Unknown Track",
      artist: artist?.username || "Unknown Artist",
      artist_full: artist?.full_name || artist?.username || "Unknown Artist",
      album: song.album_name || "Unknown Album",
      cover_photo: song.cover_photo || null,
      duration: song.duration
        ? Math.round(
            song.duration
              .split(":")
              .reduce((acc, time, index) => acc + time * Math.pow(60, 2 - index), 0)
          )
        : 0,
      genre: song.genre || "",
      year: song.release_date ? new Date(song.release_date).getFullYear() : null,
      release_date: song.release_date || null,
      track_number: song.track_number || 0,
      album_id: Number(song.album_id) || null,
      album_name: song.album_name || "Unknown Album",
      artist_id: Number(artist.id) || null,
      added_by_user: userId || null,
      added_at: new Date().toISOString(),
    }),
    []
  );

  // Check if the current track is from the artist
  const isCurrentTrackFromArtist = useCallback(
    (artistId) => {
      if (!queue.length || !currentMusicId) return false;
      const currentTrack = queue[currentIndex];
      return currentTrack && Number(currentTrack.artist_id) === Number(artistId);
    },
    [queue, currentMusicId, currentIndex]
  );

  // Handle play artist
  const handlePlayArtist = async (artist, e) => {
    e.stopPropagation();
    try {
      // If this artist's track is already selected, toggle play/pause only
      if (isCurrentTrackFromArtist(artist.id)) {
        dispatch(setIsPlaying(!isPlaying));
        return;
      }

      // Fetch artist's songs only if switching to a new artist
      const songsResponse = await api.get(`/api/music/artist/${artist.id}/`);
      const songs = songsResponse.data.results || songsResponse.data;

      if (songs && songs.length > 0) {
        // Format tracks
        const formattedTracks = songs.map((song) =>
          prepareTrackForPlayer(song, artist, currentUserId)
        );

        // Clear queue and set new queue
        dispatch(clearQueue());
        dispatch(setQueue(formattedTracks));

        // Set the first song to play
        if (formattedTracks.length > 0) {
          dispatch(setCurrentMusic(formattedTracks[0]));
          dispatch(setIsPlaying(true));
        }
      } else {
        console.log("No songs found for this artist");
      }
    } catch (error) {
      console.error("Error fetching artist songs:", error);
    }
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
            {items.map((artist) => (
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
                    <button
                      className={`absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center ${
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