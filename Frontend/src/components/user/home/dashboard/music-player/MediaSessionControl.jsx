import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  setIsPlaying, 
  nextTrack, 
  previousTrack,
  setUserHasInteracted 
} from '../../../../../slices/user/playerSlice';

const MediaSessionControl = ({ currentTrack, audioRef }) => {
  const { isPlaying, userHasInteracted } = useSelector((state) => state.player);
  const dispatch = useDispatch();

  // Handle initial user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!userHasInteracted) {
        dispatch(setUserHasInteracted(true));
      }
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };

    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, [dispatch, userHasInteracted]);

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
        if (userHasInteracted && currentTrack) {
          dispatch(setIsPlaying(true));
          audioRef.current?.play().catch(error => {
            console.warn('Playback failed:', error);
            dispatch(setIsPlaying(false));
          });
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        dispatch(setIsPlaying(false));
        audioRef.current?.pause();
        // Keep the media session active when paused
        navigator.mediaSession.playbackState = 'paused';
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (userHasInteracted && currentTrack) {
          dispatch(previousTrack());
        }
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (userHasInteracted && currentTrack) {
          dispatch(nextTrack());
        }
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
  }, [currentTrack, isPlaying, userHasInteracted, dispatch]);

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