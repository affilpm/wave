import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, Clock, Share2, Shuffle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setQueue, setCurrentTrack, setIsPlaying, reorderQueue } from '../../../../slices/user/playerSlice';
import api from '../../../../api';
import { formatDuration, convertToSeconds, convertToHrMinFormat } from '../../../../utils/formatters';

const GenrePage = () => {
  const dispatch = useDispatch();
  const { currentTrack, isPlaying, queue } = useSelector((state) => state.player);
  const [genreData, setGenreData] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);
  const { genreId } = useParams();
  const [totalDuration, setTotalDuration] = useState("");

  useEffect(() => {
    const fetchGenreData = async () => {
      try {
        const [genreResponse, tracksResponse] = await Promise.all([
          api.get(`/api/music/genres/${genreId}/`),
          api.get(`/api/music/by-genre/${genreId}/`)
        ]);
        setGenreData(genreResponse.data);
        setTracks(tracksResponse.data);
        
        // Calculate total duration
        const seconds = tracksResponse.data.reduce((acc, track) => 
          acc + convertToSeconds(track.duration), 0);
        setTotalDuration(convertToHrMinFormat(seconds));
      } catch (err) {
        console.error('Failed to fetch genre data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenreData();
  }, [genreId]);

  const prepareTrackForPlayer = (track) => ({
    id: track.id,
    name: track.name,
    artist: track.artist.username,
    artist_full: track.artist.full_name,
    cover_photo: track.cover_photo,
    audio_file: track.audio_file,
    duration: track.duration
  });

  const handlePlayGenre = () => {
    if (!tracks.length) return;
    const formattedTracks = tracks.map(prepareTrackForPlayer);
    dispatch(setQueue(formattedTracks));
    dispatch(setCurrentTrack(formattedTracks[0]));
    dispatch(setIsPlaying(true));
  };

  const handlePlayTrack = (track, index) => {
    const formattedTrack = prepareTrackForPlayer(track);
    if (currentTrack?.id === formattedTrack.id) {
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    const formattedTracks = tracks.map(prepareTrackForPlayer);
    dispatch(setQueue(formattedTracks));
    dispatch(reorderQueue({ startIndex: index }));
    dispatch(setIsPlaying(true));
  };

  const handleShuffle = () => {
    setIsShuffling(!isShuffling);
    const formattedTracks = tracks.map(prepareTrackForPlayer);
    
    if (!isShuffling) {
      const shuffledTracks = [...formattedTracks].sort(() => Math.random() - 0.5);
      dispatch(setQueue(shuffledTracks));
      dispatch(setCurrentTrack(shuffledTracks[0]));
    } else {
      dispatch(setQueue(formattedTracks));
      dispatch(setCurrentTrack(formattedTracks[0]));
    }
    dispatch(setIsPlaying(true));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-48 w-48 bg-gray-700 animate-pulse rounded-lg"></div>
        <div className="h-12 w-64 bg-gray-700 animate-pulse rounded"></div>
      </div>
    );
  }

  const TrackRow = ({ track, index }) => {
    const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;

    return (
      <tr className="group hover:bg-white/10 transition-colors">
        <td className="py-3 pl-4">
          <div className="flex items-center justify-center w-8 group">
            <span className="group-hover:hidden">{index + 1}</span>
            <button
              className="hidden group-hover:flex p-1 hover:text-white text-gray-400"
              onClick={() => handlePlayTrack(track, index)}
            >
              {isCurrentlyPlaying ? (
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
              src={track.cover_photo || "/api/placeholder/40/40"}
              alt={track.name}
              className="w-10 h-10 rounded-md"
            />
            <span className="font-medium">{track.name}</span>
          </div>
        </td>
        <td className="py-3 pl-3 hidden md:table-cell text-gray-400">
          {track.artist.full_name}
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

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      <div className="flex flex-col md:flex-row items-end gap-6 p-6">
        <div className={`w-48 h-48 flex-shrink-0 rounded-lg ${genreData?.color || 'bg-gray-700'} flex items-center justify-center`}>
          {genreData?.icon}
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

      <div className="flex items-center gap-4 p-6">
        <button
          className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors"
          onClick={handlePlayGenre}
        >
          <Play className="h-6 w-6 text-black ml-1" />
        </button>

        <button
          className={`p-2 text-gray-400 hover:text-white transition-colors ${
            isShuffling ? "text-green-500" : ""
          }`}
          onClick={handleShuffle}
        >
          <Shuffle className="h-6 w-6" />
        </button>

        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <Share2 className="h-6 w-6" />
        </button>
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
      </div>
    </div>
  );
};

export default GenrePage;