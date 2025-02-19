import React from 'react';
import { Play, Pause } from "lucide-react";
import { useDispatch, useSelector } from 'react-redux';
import { 
  setMusicId,
  setIsPlaying,
  setQueue,
  clearQueue,
  setCurrentPlaylistId,
} from "../../../../slices/user/musicPlayerSlice";

const PlaylistPlayButton = ({ 
  playlist,
  size = 'large',
  className = ''
}) => {
  const dispatch = useDispatch();
  const { 
    musicId, 
    isPlaying, 
    currentPlaylistId 
  } = useSelector((state) => state.musicPlayer);

  // Transform track data for player
  const prepareTrackForPlayer = (track) => ({
    id: track.music_details.id,
    name: track.music_details.name,
    artist: track.music_details.artist_username,
    artist_full: track.music_details.artist_full_name,
    cover_photo: track.music_details.cover_photo,
    audio_file: track.music_details.audio_file,
    duration: track.music_details.duration
  });

  const handlePlayClick = (e) => {
    e.stopPropagation();
    
    if (!playlist?.tracks?.length) return;
    
    // Check if we're already playing this playlist
    const isCurrentPlaylist = currentPlaylistId === playlist.id;
    
    if (isCurrentPlaylist) {
      // Just toggle play state if it's the same playlist
      dispatch(setIsPlaying(!isPlaying));
    } else {
      // This is a new playlist - load it
      const formattedTracks = playlist.tracks.map(prepareTrackForPlayer);
      
      // Clear existing queue and set new one
      dispatch(clearQueue());
      dispatch(setQueue({ 
        tracks: formattedTracks,
        playlistId: playlist.id 
      }));
      
      // Set the first track and start playing
      if (formattedTracks.length > 0) {
        dispatch(setMusicId(formattedTracks[0].id));
        dispatch(setIsPlaying(true));
      }
    }
  };

  const buttonClasses = size === 'large' 
    ? 'w-14 h-14 bg-green-500 hover:bg-green-400'
    : 'w-12 h-12 bg-green-500 hover:scale-105';

  const isCurrentAndPlaying = currentPlaylistId === playlist.id && isPlaying;

  return (
    <button
      className={`rounded-full flex items-center justify-center shadow-xl transition-all ${buttonClasses} ${className}`}
      onClick={handlePlayClick}
    >
      {isCurrentAndPlaying ? (
        <Pause className={`${size === 'large' ? 'h-6 w-6' : 'h-5 w-5'} text-black`} />
      ) : (
        <Play className={`${size === 'large' ? 'h-6 w-6' : 'h-5 w-5'} text-black ml-1`} />
      )}
    </button>
  );
};

export default PlaylistPlayButton;