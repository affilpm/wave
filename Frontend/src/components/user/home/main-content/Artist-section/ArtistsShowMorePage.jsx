import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Play, Pause } from "lucide-react";
import api from "../../../../../api";
import {
  setCurrentMusic,
  setQueue,
  clearQueue,
  setIsPlaying,
} from "../../../../../slices/user/playerSlice";

const ArtistsShowMorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { title } = location.state || {};
  const dispatch = useDispatch();
  const { currentMusicId, isPlaying, queue, currentIndex } = useSelector(
    (state) => state.player
  );
  const currentUserId = useSelector((state) => state.user_id);

  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

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

  const getColor = (username) => {
    const index = username ? username.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  // Prepare track for player (aligned with ArtistSection)
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

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        setLoading(true);
        const artistsResponse = await api.get(`/api/home/artistshowmore/?page=${page}`);
        setArtists(artistsResponse.data.results);
        setHasNextPage(!!artistsResponse.data.next);
        setTotalPages(Math.ceil(artistsResponse.data.count / artistsResponse.data.page_size));
      } catch (error) {
        console.error("Error fetching artists:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, [page]);

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

  const handleArtistClick = (artistId) => {
    navigate(`/artist/${artistId}`);
  };

  const handleNextPage = () => setPage((prev) => prev + 1);
  const handlePrevPage = () => setPage((prev) => Math.max(prev - 1, 1));

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 p-2">
      <section className="mb-8 relative">
        <h2 className="text-2xl p-2 font-bold mb-4">{title || "Artists"}</h2>
        <div className="overflow-x-auto scrollbar-hidden">
          <div className="flex flex-wrap gap-6">
            {artists.map((artist) => (
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
        <div className="flex justify-between mt-4 items-center">
          <button
            className="bg-gray-700 text-white py-1 px-3 rounded disabled:opacity-50"
            onClick={handlePrevPage}
            disabled={page === 1}
          >
            Previous
          </button>
          <button
            className="bg-gray-700 text-white py-1 px-3 rounded disabled:opacity-50"
            onClick={handleNextPage}
            disabled={!hasNextPage}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
};

export default ArtistsShowMorePage;