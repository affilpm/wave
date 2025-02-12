import React, { useEffect, useState } from 'react';
import { Play, Pause } from "lucide-react";
import { useDispatch, useSelector } from 'react-redux';
import { 
  setMusicId,
  setIsPlaying,
  setQueue,
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
    queue, 
    currentPlaylistId 
  } = useSelector((state) => state.musicPlayer);

  const handlePlayClick = (e) => {
    e.stopPropagation();
  
    // If switching to a new playlist
    if (currentPlaylistId !== playlist.id) {
      dispatch(setCurrentPlaylistId(playlist.id));
      dispatch(setQueue(playlist.tracks)); // Ensure queue is updated
      dispatch(setMusicId(playlist.tracks[0]?.id || null)); // Set the first track
      dispatch(setIsPlaying(true));
    } else {
      // If same playlist, toggle play state
      dispatch(setIsPlaying(!isPlaying));
    }
  };
console.log('ew', playlist.id)
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