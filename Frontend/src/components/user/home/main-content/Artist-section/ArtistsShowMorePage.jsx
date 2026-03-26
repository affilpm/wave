import React, { useState, useEffect, useCallback } from "react";
import { createSelector } from "@reduxjs/toolkit";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Play, Pause } from "lucide-react";
import api from "../../../../../api";
import {
  setCurrentMusic,
  setQueue,
  clearQueue,
  setIsPlaying,
  togglePlay
} from "../../../../../slices/user/playerSlice";
import { prepareTracksForPlayer } from "../../../../../utils/trackUtils";

const ArtistsShowMorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { title } = location.state || {};
  const dispatch = useDispatch();

  // Define selector for player state
  const selectPlayerState = createSelector(
    [(state) => state.player],
    (player) => ({
      currentTrack: player.currentTrack,
      status: player.status,
      queue: player.queue,
      queueIndex: player.queueIndex,
      currentContext: player.currentContext,
    })
  );

  // Use the selector
  const { currentTrack, status, queue, queueIndex, currentContext } = useSelector(selectPlayerState);
  const currentMusicId = currentTrack?.id;
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';
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


  const isCurrentTrackFromArtist = useCallback(
    (artistId) => {
      if (!currentTrack || !currentMusicId) return false;
      const isSameContext = currentContext?.type === 'artist' && String(currentContext?.id) === String(artistId);
      return isSameContext && Number(currentTrack.artist_id) === Number(artistId);
    },
    [currentTrack, currentMusicId, currentContext]
  );

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        setLoading(true);
        const artistsResponse = await api.get(`/api/v1/home/artistshowmore/?page=${page}`);
        const data = artistsResponse.data.results || artistsResponse.data || [];
        const count = artistsResponse.data.results ? artistsResponse.data.count : data.length;
        const pageSize = artistsResponse.data.page_size || 10;

        setArtists(data);
        setHasNextPage(!!artistsResponse.data.next);
        setTotalPages(Math.ceil(count / pageSize));
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
      if (isCurrentTrackFromArtist(artist.id)) {
        dispatch(togglePlay());
        return;
      }

      const context = { type: 'artist', id: artist.id };
      const songsResponse = await api.get(`/api/v1/music/artist/${artist.id}/`);
      const songs = songsResponse.data.results || songsResponse.data;

      if (songs && songs.length > 0) {
        const formattedTracks = prepareTracksForPlayer(songs, artist, currentUserId);

        dispatch(clearQueue());
        dispatch(setQueue({
          tracks: formattedTracks,
          startIndex: 0,
          context: context
        }));
        dispatch(setIsPlaying(true));
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
        <div className="p-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {artists.map((artist) => (
              <div
                key={artist.id}
                className="w-full cursor-pointer group"
                onClick={() => handleArtistClick(artist.id)}
              >
                <div className="relative group">
                  <div className="aspect-square rounded-full overflow-hidden">
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

      <div className="flex justify-between items-center mt-8 px-4">
        <button
          className="text-sm text-gray-400 hover:text-white transition-colors bg-gray-700 py-2 px-4 rounded-full disabled:opacity-50 font-medium"
          onClick={handlePrevPage}
          disabled={page === 1}
        >
          Previous
        </button>
        <span className="text-gray-400 text-sm">
          Page {page} {totalPages > 0 && `of ${totalPages}`}
        </span>
        <button
          className="text-sm text-gray-400 hover:text-white transition-colors bg-gray-700 py-2 px-4 rounded-full disabled:opacity-50 font-medium"
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