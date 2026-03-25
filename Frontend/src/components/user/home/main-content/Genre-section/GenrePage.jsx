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
  togglePlay
} from "../../../../../slices/user/playerSlice";
import api from '../../../../../api';
import { formatDuration, convertToSeconds, convertToHrMinFormat } from '../../../../../utils/formatters';
import { prepareTracksForPlayer } from '../../../../../utils/trackUtils';

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

const TrackRow = ({ track, index, isPlaying, onPlay }) => {
  return (
    <tr className="group hover:bg-white/10 transition-colors">
      <td className="py-3 pl-4">
        <div className="flex items-center justify-center w-8 group">
          <span className="group-hover:hidden">{index + 1}</span>
          <button
            className="hidden group-hover:flex p-1 hover:text-white text-gray-400"
            onClick={() => onPlay(track, index)}
          >
            {isPlaying ? (
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

const GenrePage = () => {
  const dispatch = useDispatch();
  const { currentTrack, status, queue, queueIndex, currentContext } = useSelector(
    selectPlayerState,
    shallowEqual
  );
  
  const currentMusicId = currentTrack?.id;
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';
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

  const context = useMemo(() => ({
    type: 'genre',
    id: genreId
  }), [genreId]);

  const isCurrentTrackFromGenreTracks = useMemo(() => {
    const isSameContext = currentContext?.type === context.type && String(currentContext?.id) === String(context.id);
    return isSameContext && stableTracks.some(track => Number(track.id) === Number(currentMusicId));
  }, [currentMusicId, stableTracks, currentContext, context]);

  useEffect(() => {
    const fetchGenreData = async () => {
      try {
        const [genreResponse, tracksResponse] = await Promise.all([
          api.get(`/api/v1/home/public-genres/${genreId}/`),
          api.get(`/api/v1/home/by-genre/${genreId}/?page=${currentPage}`)
        ]);
        const genreData = genreResponse.data;
        const tracksData = tracksResponse.data.results || tracksResponse.data || [];
        const count = tracksResponse.data.results ? tracksResponse.data.count : tracksData.length;
        
        const pageSize = tracksResponse.data.page_size || 10;
        setGenreData(genreData);
        setTracks(tracksData);
        setTotalPages(Math.ceil(count / pageSize));

        const seconds = tracksData.reduce((acc, track) =>
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


  const handlePlayTrack = useCallback(
    (track, index) => {
      const formattedTracks = prepareTracksForPlayer(stableTracks);
      const formattedTrack = formattedTracks[index];

      const isSameSong = Number(currentMusicId) === Number(formattedTrack.id);
      const isSameContext = currentContext?.type === context.type && String(currentContext?.id) === String(context.id);

      if (isSameSong && isSameContext) {
        dispatch(togglePlay());
        return;
      }

      dispatch(clearQueue());
      dispatch(setQueue({
        tracks: formattedTracks,
        startIndex: index,
        context: context
      }));
      dispatch(setIsPlaying(true));
    },
    [currentMusicId, currentContext, context, isPlaying, stableTracks, dispatch]
  );

  const handlePreviousPage = () => {
    if (currentPage > 1) {

      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {

      setCurrentPage(currentPage + 1);
    }
  };

  const isTrackPlaying = useCallback((track) => {
    const isSameSong = Number(currentMusicId) === Number(track.id);
    const isSameContext = currentContext?.type === context.type && String(currentContext?.id) === String(context.id);
    return isSameSong && isSameContext && isPlaying;
  }, [currentMusicId, currentContext, context, isPlaying]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-48 w-48 bg-gray-700 animate-pulse rounded-lg"></div>
        <div className="h-12 w-64 bg-gray-700 animate-pulse rounded"></div>
      </div>
    );
  }

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
              <TrackRow 
                key={track.id} 
                track={track} 
                index={index} 
                isPlaying={isTrackPlaying(track)}
                onPlay={handlePlayTrack}
              />
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