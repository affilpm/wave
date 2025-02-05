import React, { useState, useEffect } from "react";
import { Play, Pause, Clock, Share2, Shuffle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { 
  setQueue, 
  setCurrentTrack, 
  setIsPlaying,
  reorderQueue 
} from "../../../../slices/user/playerSlice";
import api from "../../../../api";
import {
  formatDuration,
  convertToSeconds,
  convertToHrMinFormat,
} from "../../../../utils/formatters";




const AlbumPage = () => {
  const dispatch = useDispatch();
  const { currentTrack, isPlaying, queue } = useSelector((state) => state.player);
  
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const { albumId } = useParams();
  const navigate = useNavigate();
  const [totalDuration, setTotalDuration] = useState("");

  const isCurrentTrackFromAlbum = () => {
    if (!album?.tracks || !currentTrack) return false;
    
    // Check if current track exists in album
    const trackExistsInAlbum = album.tracks.some(track => track.id === currentTrack.id);
    
    // Check if current queue matches album tracks
    const isQueueFromAlbum = queue.length === album.tracks.length && 
      queue.every(queueTrack => 
        album.tracks.some(albumTrack => albumTrack.id === queueTrack.id)
      );
    
    return trackExistsInAlbum && isQueueFromAlbum;
  };

  useEffect(() => {
    const calculateTotalDuration = () => {
      if (album?.tracks?.length) {
        const totalSeconds = album.tracks.reduce((acc, track) => {
          const trackDuration = track.music_details?.duration || "00:00:00";
          return acc + convertToSeconds(trackDuration);
        }, 0);
        const combinedDuration = convertToHrMinFormat(totalSeconds);
        setTotalDuration(combinedDuration);
      }
    };

    calculateTotalDuration();
  }, [album]);

  // Transform track data for player
  const prepareTrackForPlayer = (track) => ({
    id: track.id,
    name: track.music_details.name,
    artist: track.music_details.artist_username,
    artist_full: track.music_details.artist_full_name,
    cover_photo: track.music_details.cover_photo,
    audio_file: track.music_details.audio_file,
    duration: track.music_details.duration
  });

  // Handle playing entire album
  const handlePlayAlbum = () => {
    if (album?.tracks?.length) {
      const formattedTracks = album.tracks.map(prepareTrackForPlayer);
      
      // If already playing from this album, just toggle play state
      if (isCurrentTrackFromAlbum()) {
        dispatch(setIsPlaying(!isPlaying));
        return;
      }
      
      // Otherwise, set new queue and start playing
      dispatch(setQueue(formattedTracks));
      dispatch(setCurrentTrack(formattedTracks[0]));
      dispatch(setIsPlaying(true));
    }
  };

  // Handle playing individual track
  const handlePlayTrack = (track, index) => {
    const formattedTrack = prepareTrackForPlayer(track);
    
    // If clicking the current track, just toggle play state
    if (currentTrack?.id === formattedTrack.id) {
      dispatch(setIsPlaying(!isPlaying));
      return;
    }

    // If the queue is not this album, set it first
    const formattedTracks = album.tracks.map(prepareTrackForPlayer);
    if (queue.length !== formattedTracks.length || 
        queue[0].id !== formattedTracks[0].id) {
      dispatch(setQueue(formattedTracks));
    }
    
    // Start playing from the clicked track
    dispatch(reorderQueue({ startIndex: index }));
    dispatch(setIsPlaying(true));
  };

  // Handle shuffle
  const handleShuffle = () => {
    if (!album?.tracks?.length) return;
    
    setIsShuffling(!isShuffling);
    const formattedTracks = [...album.tracks].map(prepareTrackForPlayer);
    
    if (!isShuffling) {
      // Shuffle the tracks
      const shuffledTracks = [...formattedTracks].sort(() => Math.random() - 0.5);
      dispatch(setQueue(shuffledTracks));
      dispatch(setCurrentTrack(shuffledTracks[0]));
    } else {
      // Restore original order
      dispatch(setQueue(formattedTracks));
      dispatch(setCurrentTrack(formattedTracks[0]));
    }
    dispatch(setIsPlaying(true));
  };

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const response = await api.get(`/api/album/album_data/${albumId}/`);
        setAlbum(response.data);
      } catch (err) {
        setError("Failed to load album");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbum();
  }, [albumId]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-48 w-48 bg-gray-700 animate-pulse rounded-lg"></div>
        <div className="h-12 w-64 bg-gray-700 animate-pulse rounded"></div>
        <div className="h-8 w-32 bg-gray-700 animate-pulse rounded"></div>
      </div>
    );
  }

  const TrackRow = ({ track, index }) => {
    const isThisTrackPlaying = currentTrack?.id === track.id && isCurrentTrackFromAlbum();

    return (
      <tr
        className={`group hover:bg-white/10 transition-colors ${
          isThisTrackPlaying ? "bg-white/20" : ""
        }`}
      >
        <td className="py-3 pl-4">
          <div className="flex items-center justify-center w-8 group">
            <span className="group-hover:hidden">{index + 1}</span>
            <button
              className="hidden group-hover:flex p-1 hover:text-white text-gray-400"
              onClick={() => handlePlayTrack(track, index)}
            >
              {isThisTrackPlaying && isPlaying ? (
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
                      src={track.music_details.cover_photo || "/api/placeholder/40/40"}
                      alt={track.music_details.name}
                      className="w-10 h-10 rounded-md"
                    />
                    <span className="font-medium">
                      {track.music_details.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 pl-3 hidden md:table-cell text-gray-400">
                  {track.music_details.artist_full_name}
                </td>
                <td className="py-3 pl-3 hidden md:table-cell text-gray-400">
                  {new Date(track.music_details.release_date).toLocaleDateString()}
                </td>
                <td className="py-3 text-center text-gray-400 w-20">
                  {formatDuration(track.music_details.duration)}
          </td>
      </tr>
    );
  };
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-end gap-6 p-6">
        <div className="w-48 h-48 flex-shrink-0">
          <img
            src={album.cover_photo || "/api/placeholder/192/192"}
            alt={album.name}
            className="w-full h-full object-cover rounded-lg shadow-2xl"
          />
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-sm font-medium uppercase tracking-wider text-gray-400">
            Album
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            {album.name}
          </h1>
          <div className="flex items-center gap-4 text-gray-300">
            <span className="text-sm">
              Created by{" "}
              <span className="text-white">
                {album.artist_username}
              </span>{" "}
              • {album.tracks?.length || 0} songs • {totalDuration}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 p-6">
        <button
          className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors"
          onClick={handlePlayAlbum}
        >
          {isPlaying && isCurrentTrackFromAlbum() ? (
            <Pause className="h-6 w-6 text-black" />
          ) : (
            <Play className="h-6 w-6 text-black ml-1" />
          )}
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

      {/* Track List */}
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
            {album.tracks?.map((track, index) => (
              <TrackRow key={track.id} track={track} index={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlbumPage;