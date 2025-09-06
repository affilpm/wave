import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  setIsPlaying, 
  setVolume, 
  setIsMuted, 
  setCurrentTime,
  playNext,
  playPrevious
} from '../../../../../slices/user/playerSlice';

const DeviceAudioControl = ({ audioRef, currentTrack, isPlaying, volume, isMuted, currentTime, duration }) => {
  const dispatch = useDispatch();
  const mediaSessionInitialized = useRef(false);
  const lastUpdateTime = useRef(0);

  // Get queue info to determine if next/previous are available
  const { queue, currentMusicId } = useSelector(state => ({
    queue: state.player.queue,
    currentMusicId: state.player.currentMusicId
  }));

  const hasNext = queue.length > 1;
  const hasPrevious = queue.length > 1;

  // Throttled position update to prevent excessive calls
  const updatePositionState = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateTime.current < 1000) return; // Update max once per second
    lastUpdateTime.current = now;

    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(duration || 0, 0),
          playbackRate: audioRef.current?.playbackRate || 1,
          position: Math.max(Math.min(currentTime || 0, duration || 0), 0),
        });
      } catch (error) {
        console.warn('Failed to set position state:', error);
      }
    }
  }, [currentTime, duration, audioRef]);

  // Setup Media Session API for device controls
  const setupMediaSession = useCallback(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    try {
        // Helper function to validate URL
        const isValidUrl = (url) => {
        if (typeof url !== 'string' || !url) return false;
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
        };

        // Select a valid artwork URL, prioritizing cover_photo
        let artworkSrc = null;
        const possibleArtwork = [
        currentTrack.cover_photo,
        currentTrack.artwork,
        currentTrack.cover,
        currentTrack.thumbnail,
        ];
        for (const src of possibleArtwork) {
        if (isValidUrl(src)) {
            artworkSrc = src;
            break;
        }
        }

        // Set metadata with fallbacks
        navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || currentTrack.name || 'Unknown Title',
        artist: currentTrack.artist || currentTrack.artistName || 'Unknown Artist',
        album: currentTrack.album || currentTrack.albumName || 'Unknown Album',
        artwork: artworkSrc
            ? [{
                src: artworkSrc,
                sizes: '512x512',
                type: artworkSrc.includes('svg') ? 'image/svg+xml' : 'image/jpeg',
            }]
            : [{
                src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiBmaWxsPSIjMzMzIi8+CjxwYXRoIGQ9Im0xOTIgMTI4IDEyOCA5NiAtMTI4IDk2eiIgZmlsbD0iIzY2NiIvPgo8L3N2Zz4=',
                sizes: '512x512',
                type: 'image/svg+xml',
            }],
        });

        // Log for debugging
        console.log('Media Session metadata set with artwork:', artworkSrc || 'default SVG');

        // Play/Pause handlers
        navigator.mediaSession.setActionHandler('play', () => {
        console.log('Media Session: Play requested');
        dispatch(setIsPlaying(true));
        });

        navigator.mediaSession.setActionHandler('pause', () => {
        console.log('Media Session: Pause requested');
        dispatch(setIsPlaying(false));
        });

        // Seek handler
        navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && audioRef.current && duration > 0) {
            const seekTime = Math.max(0, Math.min(details.seekTime, duration));
            console.log('Media Session: Seek to', seekTime);
            audioRef.current.currentTime = seekTime;
            dispatch(setCurrentTime(seekTime));
        }
        });

        // Skip forward/backward
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current && duration > 0) {
            const skipTime = details.seekOffset || 10;
            const newTime = Math.min(audioRef.current.currentTime + skipTime, duration);
            console.log('Media Session: Skip forward', skipTime);
            audioRef.current.currentTime = newTime;
            dispatch(setCurrentTime(newTime));
        }
        });

        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current) {
            const skipTime = details.seekOffset || 10;
            const newTime = Math.max(audioRef.current.currentTime - skipTime, 0);
            console.log('Media Session: Skip backward', skipTime);
            audioRef.current.currentTime = newTime;
            dispatch(setCurrentTime(newTime));
        }
        });

        // Navigation handlers
        if (hasNext) {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            console.log('Media Session: Next track requested');
            dispatch(playNext());
        });
        } else {
        navigator.mediaSession.setActionHandler('nexttrack', null);
        }

        if (hasPrevious) {
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            console.log('Media Session: Previous track requested');
            dispatch(playPrevious());
        });
        } else {
        navigator.mediaSession.setActionHandler('previoustrack', null);
        }

        // Stop handler
        navigator.mediaSession.setActionHandler('stop', () => {
        console.log('Media Session: Stop requested');
        dispatch(setIsPlaying(false));
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            dispatch(setCurrentTime(0));
        }
        });

        // Update playback state
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        
        mediaSessionInitialized.current = true;
        console.log('Media Session initialized for:', currentTrack.title || currentTrack.name);

    } catch (error) {
        console.error('Error setting up media session:', error);
    }
    }, [currentTrack, dispatch, isPlaying, hasNext, hasPrevious, audioRef, duration]);

  // Clean up media session
  const cleanupMediaSession = useCallback(() => {
    if ('mediaSession' in navigator && mediaSessionInitialized.current) {
      try {
        // Clear all action handlers
        const actions = ['play', 'pause', 'seekto', 'seekforward', 'seekbackward', 'previoustrack', 'nexttrack', 'stop'];
        actions.forEach(action => {
          navigator.mediaSession.setActionHandler(action, null);
        });
        
        navigator.mediaSession.metadata = null;
        mediaSessionInitialized.current = false;
        console.log('Media Session cleaned up');
      } catch (error) {
        console.warn('Error cleaning up media session:', error);
      }
    }
  }, []);

  // Handle device volume changes (prevent feedback loops)
  const handleDeviceVolumeChange = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    const newVolume = audio.volume;
    const newMuted = audio.muted;
    
    // Only update if there's a significant difference to avoid loops
    if (Math.abs(newVolume - volume) > 0.01) {
      console.log('Device volume changed to:', newVolume);
      dispatch(setVolume(newVolume));
    }
    
    if (newMuted !== isMuted) {
      console.log('Device mute changed to:', newMuted);
      dispatch(setIsMuted(newMuted));
    }
  }, [audioRef, volume, isMuted, dispatch]);

  // Setup media session when track changes
  useEffect(() => {
    if (currentTrack && currentMusicId) {
      setupMediaSession();
    } else {
      cleanupMediaSession();
    }

    return cleanupMediaSession;
  }, [currentTrack, currentMusicId, setupMediaSession, cleanupMediaSession]);

  // Update media session playback state when playing state changes
  useEffect(() => {
    if ('mediaSession' in navigator && mediaSessionInitialized.current) {
      try {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        console.log('Media Session playback state:', isPlaying ? 'playing' : 'paused');
      } catch (error) {
        console.warn('Error updating playback state:', error);
      }
    }
  }, [isPlaying]);

  // Update position state when time or duration changes (throttled)
  useEffect(() => {
    if (mediaSessionInitialized.current && duration > 0) {
      updatePositionState();
    }
  }, [currentTime, duration, updatePositionState]);

  // Setup audio event listeners for synchronization
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    
    // Volume change listener
    audio.addEventListener('volumechange', handleDeviceVolumeChange);

    // Play/pause synchronization
    const handlePlay = () => {
      if (!isPlaying) {
        console.log('Audio play event detected, syncing state');
        dispatch(setIsPlaying(true));
      }
    };

    const handlePause = () => {
      if (isPlaying) {
        console.log('Audio pause event detected, syncing state');
        dispatch(setIsPlaying(false));
      }
    };

    // Ended event for auto-next
    const handleEnded = () => {
      console.log('Audio ended, playing next track');
      dispatch(playNext());
    };

    // Loading states
    const handleLoadStart = () => {
      if ('mediaSession' in navigator && mediaSessionInitialized.current) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const handleCanPlay = () => {
      if ('mediaSession' in navigator && mediaSessionInitialized.current) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      }
    };

    // Add all listeners
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      // Cleanup listeners
      audio.removeEventListener('volumechange', handleDeviceVolumeChange);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioRef, handleDeviceVolumeChange, isPlaying, dispatch]);

  // Update next/previous handlers when queue changes
  useEffect(() => {
    if ('mediaSession' in navigator && mediaSessionInitialized.current) {
      if (hasNext) {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          console.log('Media Session: Next track requested');
          dispatch(playNext());
        });
      } else {
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }

      if (hasPrevious) {
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          console.log('Media Session: Previous track requested');
          dispatch(playPrevious());
        });
      } else {
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    }
  }, [hasNext, hasPrevious, dispatch]);

  // Handle page visibility changes (important for PWAs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentTrack) {
        // Re-setup media session when page becomes visible
        setTimeout(() => {
          setupMediaSession();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setupMediaSession, currentTrack]);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupMediaSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cleanupMediaSession]);

  // Handle focus/blur for better control retention
  useEffect(() => {
    const handleFocus = () => {
      if (currentTrack && !mediaSessionInitialized.current) {
        setupMediaSession();
      }
    };

    const handleBlur = () => {
      // Don't cleanup on blur - keep controls active in background
      // This is industry standard behavior
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [currentTrack, setupMediaSession]);

  return null; // This component doesn't render anything - pure logic component
};

export default DeviceAudioControl;