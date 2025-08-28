import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, Clock, Share2, Music, Headphones, Radio, Mic, Guitar, Stars } from 'lucide-react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import {
  setCurrentMusic,
  setIsPlaying,
  setQueue,
  clearQueue,
} from "../../../../../slices/user/playerSlice";
import api from '../../../../../api';
import { formatDuration, convertToSeconds, convertToHrMinFormat } from '../../../../../utils/formatters';

const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentMusicId: player.currentMusicId,
    isPlaying: player.isPlaying,
    queue: player.queue,
    currentIndex: player.currentIndex,
  })
);

const GenrePage = () => {
  const dispatch = useDispatch();
  const { currentMusicId, isPlaying, queue, currentIndex } = useSelector(
    selectPlayerState,
    shallowEqual
  );
  const [genreData, setGenreData] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { genreId } = useParams();
  const [totalDuration, setTotalDuration] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const genreIcons = {
    Pop: { icon: <Music size={36} className="text-white mb-2" />, color: 'bg-pink-500' },
    Electronic: { icon: <Headphones size={36} className="text-white mb-2" />, color: 'bg-purple-500' },
    Rock: { icon: <Guitar size={36} className="text-white mb-2" />, color: 'bg-red-500' },
    'Hip Hop': { icon: <Mic size={36} className="text-white mb-2" />, color: 'bg-blue-500' },
    Jazz: { icon: <Radio size={36} className="text-white mb-2" />, color: 'bg-yellow-500' },
    Indie: { icon: <Stars size={36} className="text-white mb-2" />, color: 'bg-green-500' },
  };

  const stableTracks = useMemo(() => tracks || [], [tracks]);

  const isQueueFromGenreTracks = useMemo(() => {
    if (!queue.length) return false;
    return queue.every(
      (track) => track.source === 'public_songs'
    );
  }, [queue]);

  const isCurrentTrackFromGenreTracks = useMemo(() => {
    if (!stableTracks.length || !currentMusicId || !isQueueFromGenreTracks) {
      console.log('isCurrentTrackFromGenreTracks: Early return', {
        hasTracks: !!stableTracks.length,
        currentMusicId,
        isQueueFromGenreTracks,
        queueLength: queue.length,
        currentIndex,
      });
      return false;
    }
    const currentTrack = queue[currentIndex];
    const isTrackInTracks = stableTracks.some(
      (track) => Number(track.id) === Number(currentMusicId)
    );
    console.log('isCurrentTrackFromGenreTracks: Result', {
      currentTrackId: currentTrack?.id,
      currentMusicId,
      isTrackInTracks,
      isPlaying,
    });
    return (
      currentTrack &&
      Number(currentTrack.id) === Number(currentMusicId) &&
      isTrackInTracks
    );
  }, [stableTracks, currentMusicId, isQueueFromGenreTracks, queue, currentIndex]);

  useEffect(() => {
    const fetchGenreData = async () => {
      try {
        const [genreResponse, tracksResponse] = await Promise.all([
          api.get(`/api/home/public_genres/${genreId}/`),
          api.get(`/api/home/by-genre/${genreId}/?page=${currentPage}`)
        ]);
        setGenreData(genreResponse.data);
        setTracks(tracksResponse.data.results);
        setTotalPages(Math.ceil(tracksResponse.data.count / 10));

        const seconds = tracksResponse.data.results.reduce((acc, track) =>
          acc + convertToSeconds(track.duration), 0);
        setTotalDuration(convertToHrMinFormat(seconds));
      } catch (err) {
        console.error('Failed to fetch genre data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenreData();
  }, [genreId, currentPage]);

  const prepareTrackForPlayer = useCallback((track) => ({
    id: Number(track.id),
    name: track.name,
    title: track.name,
    artist: track.artist?.user?.username || 'Unknown Artist',
    artist_full: track.artist?.full_name,
    album: 'Single', // Added for similarity to Profile, assuming no album data
    cover_photo: track.cover_photo || '/api/placeholder/48/48',
    duration: convertToSeconds(track.duration || '00:00:00'),
    genre: track.genre || '',
    year: track.release_date ? new Date(track.release_date).getFullYear() : null,
    release_date: track.release_date,
    track_number: track.track_number || 0,
    source: 'public_songs',
  }), []);

  const handlePlayTrack = useCallback(
    (track, index) => {
      const formattedTracks = stableTracks.map(prepareTrackForPlayer);
      const formattedTrack = formattedTracks[index];

      console.log('handlePlayTrack:', {
        trackId: track.id,
        currentMusicId,
        isQueueFromGenreTracks,
        isPlaying,
        action: Number(currentMusicId) === Number(formattedTrack.id) && isQueueFromGenreTracks ? 'toggle' : 'play new',
      });

      if (
        Number(currentMusicId) === Number(formattedTrack.id) &&
        isQueueFromGenreTracks
      ) {
        dispatch(setIsPlaying(!isPlaying));
        return;
      }

      dispatch(clearQueue());
      dispatch(setQueue(formattedTracks));
      dispatch(setCurrentMusic(formattedTrack));
      dispatch(setIsPlaying(true));
    },
    [currentMusicId, isQueueFromGenreTracks, isPlaying, stableTracks, dispatch, prepareTrackForPlayer]
  );

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      console.log('Navigating to previous page:', currentPage - 1);
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      console.log('Navigating to next page:', currentPage + 1);
      setCurrentPage(currentPage + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-48 w-48 bg-gray-700 animate-pulse rounded-lg"></div>
        <div className="h-12 w-64 bg-gray-700 animate-pulse rounded"></div>
      </div>
    );
  }

  const isTrackPlaying = (track) => {
    const isPlayingThisTrack =
      Number(currentMusicId) === Number(track.id) &&
      isCurrentTrackFromGenreTracks &&
      isPlaying;
    console.log('isTrackPlaying:', {
      trackId: track.id,
      currentMusicId,
      isCurrentTrackFromGenreTracks,
      isPlaying,
      isPlayingThisTrack,
    });
    return isPlayingThisTrack;
  };

  const TrackRow = ({ track, index }) => {
    const currentlyPlaying = isTrackPlaying(track);

    return (
      <tr className="group hover:bg-white/10 transition-colors">
        <td className="py-3 pl-4">
          <div className="flex items-center justify-center w-8 group">
            <span className="group-hover:hidden">{index + 1}</span>
            <button
              className="hidden group-hover:flex p-1 hover:text-white text-gray-400"
              onClick={() => handlePlayTrack(track, index)}
            >
              {currentlyPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
          </div>
        </td>
        <td className="py-3 pl-3">
          <div className="flex items-center gap-3">
            <img
              src={track.cover_photo}
              alt={track.name}
              className="w-10 h-10 rounded-md"
            />
            <span className="font-medium">{track.name}</span>
          </div>
        </td>
        <td className="py-3 pl-3 hidden md:table-cell text-gray-400">
          {track.artist?.user?.username || 'Unknown Artist'}
        </td>
        <td className="py-3 pl-3 hidden md:table-cell text-gray-400">
          {new Date(track.release_date).toLocaleDateString()}
        </td>
        <td className="py-3 text-center text-gray-400 w-20">
          {formatDuration(track.duration)}
        </td>
      </tr>
    );
  };

  const genreStyle = genreIcons[genreData?.name] || { icon: <Music size={48} className="text-white" />, color: 'bg-gray-700' };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      <div className="flex flex-col md:flex-row items-end gap-6 p-6">
        <div className={`w-48 h-48 flex-shrink-0 rounded-lg ${genreStyle.color} flex flex-col items-center justify-center`}>
          {genreStyle.icon}
          <span className="text-white text-lg font-semibold">{genreData?.name}</span>
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-sm font-medium uppercase tracking-wider text-gray-400">
            Genre
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            {genreData?.name}
          </h1>
          <div className="flex items-center gap-4 text-gray-300">
            <span className="text-sm">
              {tracks.length} tracks • {totalDuration}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800">
              <th className="font-normal py-3 w-12 pl-4">#</th>
              <th className="font-normal text-left py-3 pl-3">Title</th>
              <th className="font-normal text-left py-3 hidden md:table-cell pl-3">
                Artist
              </th>
              <th className="font-normal text-left py-3 hidden md:table-cell pl-3">
                Release Date
              </th>
              <th className="font-normal text-center py-3 w-20">
                <Clock className="h-4 w-4 inline" />
              </th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track, index) => (
              <TrackRow key={track.id} track={track} index={index} />
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-6">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="bg-gray-700 text-white py-1 px-3 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="bg-gray-700 text-white py-1 px-3 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenrePage;