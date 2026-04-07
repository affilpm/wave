import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, Clock, Shuffle, Share2, Music, Headphones, Radio, Mic, Guitar, Stars } from 'lucide-react';
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
import { getGenreStyles } from '../../../../../utils/genreUtils.jsx';
import { usePlayCollection } from '../../../../../hooks/usePlayCollection';

const TrackRow = ({ track, index, isPlaying, isCurrent, onPlay }) => {
  return (
    <tr 
      className={`group hover:bg-white/10 transition-colors cursor-pointer ${isCurrent ? 'bg-white/5' : ''}`}
      onClick={() => onPlay(track, index)}
    >
      <td className="py-3 pl-4">
        <div className="flex items-center justify-center w-8">
          {isCurrent && isPlaying ? (
            <div className="flex items-center gap-0.5">
              <span className="w-0.5 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <span className="w-0.5 h-4 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }}></span>
              <span className="w-0.5 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></span>
            </div>
          ) : (
            <>
              <span className={`group-hover:hidden ${isCurrent ? 'text-green-500' : ''}`}>{index + 1}</span>
              <button
                className="hidden group-hover:flex p-1 hover:text-white text-gray-400"
                onClick={(e) => { e.stopPropagation(); onPlay(track, index); }}
              >
                {isCurrent && isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </button>
            </>
          )}
        </div>
      </td>
      <td className="py-3 pl-3">
        <div className="flex items-center gap-3">
          <img
            src={track.cover_photo}
            alt={track.name}
            className="w-10 h-10 rounded-md"
          />
          <span className={`font-medium ${isCurrent ? 'text-green-500' : ''}`}>{track.name}</span>
        </div>
      </td>
      <td className="py-3 pl-3 text-gray-400">
        <div className="flex flex-col">
          <span className="md:hidden text-xs text-white/60 mb-1">
            {track.artist?.id ? (
              <Link 
                to={`/artist/${track.artist.id}`}
                className="hover:underline hover:text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {track.artist?.user?.username || 'Unknown Artist'}
              </Link>
            ) : (
              track.artist?.user?.username || 'Unknown Artist'
            )}
          </span>
          {track.album_id ? (
            <Link 
              to={`/album/${track.album_id}`} 
              className="hover:underline hover:text-white transition-colors text-sm md:text-base"
              onClick={(e) => e.stopPropagation()}
            >
              {track.album_name}
            </Link>
          ) : (
            <span className="text-sm md:text-base">Single</span>
          )}
        </div>
      </td>
      <td className="py-3 pl-3 hidden lg:table-cell text-gray-400">
        {track.artist?.id ? (
          <Link 
            to={`/artist/${track.artist.id}`}
            className="hover:underline hover:text-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {track.artist?.user?.username || 'Unknown Artist'}
          </Link>
        ) : (
          track.artist?.user?.username || 'Unknown Artist'
        )}
      </td>
      <td className="py-3 text-right md:text-center text-gray-400 pr-4 w-20">
        {formatDuration(track.duration)}
      </td>
    </tr>
  );
};

const GenrePage = () => {
  const dispatch = useDispatch();
  
  const [genreData, setGenreData] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { genreId } = useParams();
  const [totalDuration, setTotalDuration] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const stableTracks = useMemo(() => tracks || [], [tracks]);

  const context = useMemo(() => ({
    type: 'genre',
    id: genreId
  }), [genreId]);

  // Prepare formatted tracks for the player
  const formattedTracks = useMemo(
    () => prepareTracksForPlayer(stableTracks),
    [stableTracks]
  );

  // Use the shared play collection hook for Play/Shuffle/Track-click
  const {
    handlePlayCollection: handlePlayGenre,
    handlePlayTrackAtIndex,
    handleShufflePlay,
    isCollectionPlaying,
    isCollectionActive,
  } = usePlayCollection({ tracks: formattedTracks, context });

  // Get current track info for highlighting
  const currentTrack = useSelector((state) => state.player.currentTrack);

  const handlePlayTrack = useCallback(
    (_track, index) => {
      handlePlayTrackAtIndex(index);
    },
    [handlePlayTrackAtIndex]
  );

  const isTrackCurrent = useCallback((track) => {
    return isCollectionActive && currentTrack && String(currentTrack.id) === String(track.id);
  }, [isCollectionActive, currentTrack]);

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

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-48 w-48 bg-gray-700 animate-pulse rounded-lg"></div>
        <div className="h-12 w-64 bg-gray-700 animate-pulse rounded"></div>
      </div>
    );
  }

  const { color, icon } = getGenreStyles(genreData?.name);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 pb-2 md:pb-6">
        <div className={`w-36 h-36 md:w-48 md:h-48 flex-shrink-0 rounded-lg ${color} flex flex-col items-center justify-center shadow-2xl transition-all duration-500`}>
          {React.cloneElement(icon, { size: 48, className: "text-white mb-2" })}
          <span className="text-white text-lg font-semibold">{genreData?.name}</span>
        </div>

        <div className="flex flex-col gap-2 md:gap-4 text-center md:text-left">
          <span className="text-xs md:text-sm font-medium uppercase tracking-wider text-gray-400">
            Genre
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight">
            {genreData?.name}
          </h1>
          <div className="flex items-center gap-4 text-gray-300">
            <span className="text-sm">
              {tracks.length} tracks • {totalDuration}
            </span>
          </div>
        </div>
      </div>

      {/* Play / Shuffle / Share controls */}
      <div className="flex items-center justify-center md:justify-start gap-4 p-4 md:px-6">
        <button
          className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-green-500 hover:bg-green-400 hover:scale-105 flex items-center justify-center transition-all duration-200 ease-in-out shadow-lg"
          onClick={handlePlayGenre}
          title={isCollectionPlaying ? 'Pause' : 'Play'}
        >
          {isCollectionPlaying ? (
            <Pause className="h-5 w-5 md:h-6 md:w-6 text-black" />
          ) : (
            <Play className="h-5 w-5 md:h-6 md:w-6 text-black ml-0.5 md:ml-1" />
          )}
        </button>

        <button
          className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/20 hover:bg-white/10 hover:scale-105 flex items-center justify-center transition-all duration-200 shadow-lg"
          onClick={handleShufflePlay}
          title="Shuffle Play"
        >
          <Shuffle className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </button>

        <button className="p-2 text-gray-400 hover:text-white transition-colors duration-200 ease-in-out">
          <Share2 className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>

      <div className="flex-1 p-4 md:p-6 pb-20 md:pb-12">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800 text-xs md:text-sm">
              <th className="font-normal py-3 w-12 pl-4">#</th>
              <th className="font-normal text-left py-3 pl-3">Title</th>
              <th className="font-normal text-left py-3 pl-3">Album</th>
              <th className="font-normal text-left py-3 hidden lg:table-cell pl-3">
                Artist
              </th>
              <th className="font-normal text-right md:text-center py-3 w-20 pr-4">
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
                isPlaying={isCollectionPlaying}
                isCurrent={isTrackCurrent(track)}
                onPlay={handlePlayTrack}
              />
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 p-6">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenrePage;