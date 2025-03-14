import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  setIsPlaying, 
  playNext, 
  playPrevious
} from '../../../../../slices/user/musicPlayerSlice';

const MediaSessionControl = ({ currentTrack, audioRef }) => {
  const { isPlaying } = useSelector((state) => state.musicPlayer);
  const dispatch = useDispatch();

  // Set up media session handlers
  useEffect(() => {
    if ('mediaSession' in navigator) {
      // Set metadata whenever track changes or component mounts
      if (currentTrack) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.name,
          artist: currentTrack.artist,
          album: currentTrack.album || '',
          artwork: currentTrack.cover_photo 
            ? [{ src: currentTrack.cover_photo, sizes: '512x512', type: 'image/jpeg' }]
            : []
        });
      }

      // Always update playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Set up handlers
      navigator.mediaSession.setActionHandler('play', () => {
        dispatch(setIsPlaying(true));
        audioRef.current?.play().catch(error => {
          console.warn('Playback failed:', error);
          dispatch(setIsPlaying(false));
        });
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        dispatch(setIsPlaying(false));
        audioRef.current?.pause();
        // Keep the media session active when paused
        navigator.mediaSession.playbackState = 'paused';
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        dispatch(playPrevious());
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        dispatch(playNext());
      });

      // Update position state if supported
      if ('setPositionState' in navigator.mediaSession && currentTrack) {
        navigator.mediaSession.setPositionState({
          duration: audioRef.current?.duration || 0,
          position: audioRef.current?.currentTime || 0,
          playbackRate: audioRef.current?.playbackRate || 1
        });
      }
    }

    // Modified cleanup function to preserve metadata
    return () => {
      // Only clear handlers if the component is unmounting AND there's no current track
      if ('mediaSession' in navigator && !currentTrack) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        // Clear metadata only when there's no track
        navigator.mediaSession.metadata = null;
      }
    };
  }, [currentTrack, isPlaying, dispatch]);

  // Update position state periodically while track exists
  useEffect(() => {
    let positionUpdateInterval;
    
    if ('mediaSession' in navigator && 
        'setPositionState' in navigator.mediaSession && 
        currentTrack) {
      positionUpdateInterval = setInterval(() => {
        navigator.mediaSession.setPositionState({
          duration: audioRef.current?.duration || 0,
          position: audioRef.current?.currentTime || 0,
          playbackRate: audioRef.current?.playbackRate || 1
        });
      }, 1000);
    }

    return () => {
      if (positionUpdateInterval) {
        clearInterval(positionUpdateInterval);
      }
    };
  }, [currentTrack]);

  return null;
};

export default MediaSessionControl;