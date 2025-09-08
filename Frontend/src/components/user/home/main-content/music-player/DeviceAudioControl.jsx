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
import { debounce } from 'lodash';

const DeviceAudioControl = ({ audioRef, currentTrack, isPlaying, volume, isMuted, currentTime, duration }) => {
  const dispatch = useDispatch();
  const mediaSessionInitialized = useRef(false);
  const lastUpdateTime = useRef(0);
  const skipTimeoutRef = useRef(null);
  const isSkipping = useRef(false);
  const syncTimeoutRef = useRef(null);

  // Get queue info to determine if next/previous are available
  const { queue, currentMusicId } = useSelector(state => ({
    queue: state.player.queue,
    currentMusicId: state.player.currentMusicId
  }));

  const hasNext = queue.length > 1;
  const hasPrevious = queue.length > 1;

  // Debounced skip handler to prevent rapid skipping issues
  const debouncedSkip = useCallback((action) => {
    if (isSkipping.current) {
      console.log('Skip already in progress, ignoring');
      return;
    }

    // Clear any existing skip timeout
    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current);
    }

    isSkipping.current = true;
    console.log('Executing skip action:', action);

    // Execute the skip action
    if (action === 'next') {
      dispatch(playNext());
    } else if (action === 'previous') {
      dispatch(playPrevious());
    }

    // Reset skip flag after a delay to allow track change to complete
    skipTimeoutRef.current = setTimeout(() => {
      isSkipping.current = false;
      console.log('Skip cooldown ended');
    }, 1000); // 1 second cooldown
  }, [dispatch]);

  const syncAudioState = useCallback((forceSync = false) => {
    if (!audioRef.current || isSkipping.current) return;

    const audio = audioRef.current;
    
    try {
      // Clear any existing sync timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Debounce sync operations to prevent conflicts
      syncTimeoutRef.current = setTimeout(() => {
        // Only sync if values have actually changed significantly
        const volumeDiff = Math.abs(audio.volume - volume);
        const muteDiff = audio.muted !== isMuted;
        const playStateDiff = audio.paused === isPlaying;

        if (volumeDiff > 0.01 || forceSync) {
          console.log('Syncing volume:', volume);
          audio.volume = Math.max(0, Math.min(1, volume));
        }

        if (muteDiff || forceSync) {
          console.log('Syncing mute state:', isMuted);
          audio.muted = isMuted;
        }

        if (playStateDiff || forceSync) {
          console.log('Syncing play state:', isPlaying);
          if (isPlaying && audio.paused) {
            audio.play().catch(err => {
              console.warn('Auto-play failed during sync:', err);
              if (err.name !== 'AbortError') {
                dispatch(setIsPlaying(false));
              }
            });
          } else if (!isPlaying && !audio.paused) {
            audio.pause();
          }
        }
      }, 50); // Small delay to batch sync operations
    } catch (error) {
      console.error('Error syncing audio state:', error);
    }
  }, [audioRef, volume, isMuted, isPlaying, dispatch]);

  // Throttled position update to prevent excessive calls
  const updatePositionState = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateTime.current < 1000 || isSkipping.current) return;
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

  const setupMediaSession = useCallback(() => {
    if (!('mediaSession' in navigator) || !currentTrack || isSkipping.current) return;

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

      // Play/Pause handlers with sync
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('Media Session: Play requested');
        dispatch(setIsPlaying(true));
        syncAudioState();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('Media Session: Pause requested');
        dispatch(setIsPlaying(false));
        syncAudioState();
      });

      // Enhanced seek handler
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && audioRef.current && duration > 0 && !isSkipping.current) {
          const seekTime = Math.max(0, Math.min(details.seekTime, duration));
          console.log('Media Session: Seek to', seekTime);
          audioRef.current.currentTime = seekTime;
          dispatch(setCurrentTime(seekTime));
        }
      });

      // Skip forward/backward with debouncing
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current && duration > 0 && !isSkipping.current) {
          const skipTime = details.seekOffset || 10;
          const newTime = Math.min(audioRef.current.currentTime + skipTime, duration);
          console.log('Media Session: Skip forward', skipTime);
          audioRef.current.currentTime = newTime;
          dispatch(setCurrentTime(newTime));
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current && !isSkipping.current) {
          const skipTime = details.seekOffset || 10;
          const newTime = Math.max(audioRef.current.currentTime - skipTime, 0);
          console.log('Media Session: Skip backward', skipTime);
          audioRef.current.currentTime = newTime;
          dispatch(setCurrentTime(newTime));
        }
      });

      // Navigation handlers with debouncing
      if (hasNext) {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          console.log('Media Session: Next track requested');
          debouncedSkip('next');
        });
      } else {
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }

      if (hasPrevious) {
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          console.log('Media Session: Previous track requested');
          debouncedSkip('previous');
        });
      } else {
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }

      // Stop handler with sync
      navigator.mediaSession.setActionHandler('stop', () => {
        console.log('Media Session: Stop requested');
        dispatch(setIsPlaying(false));
        if (audioRef.current && !isSkipping.current) {
          audioRef.current.currentTime = 0;
          dispatch(setCurrentTime(0));
        }
        syncAudioState();
      });

      // Update playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      
      mediaSessionInitialized.current = true;
      console.log('Media Session initialized for:', currentTrack.title || currentTrack.name);

    } catch (error) {
      console.error('Error setting up media session:', error);
    }
  }, [currentTrack, dispatch, isPlaying, hasNext, hasPrevious, audioRef, duration, debouncedSkip, syncAudioState]);

  // Clean up media session
  const cleanupMediaSession = useCallback(() => {
    if ('mediaSession' in navigator && mediaSessionInitialized.current) {
      try {
        const actions = ['play', 'pause', 'seekto', 'seekforward', 'seekbackward', 'previoustrack', 'nexttrack', 'stop'];
        actions.forEach(action => {
          navigator.mediaSession.setActionHandler(action, null);
        });
        
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
        mediaSessionInitialized.current = false;
        console.log('Media Session cleaned up');
      } catch (error) {
        console.warn('Error cleaning up media session:', error);
      }
    }
  }, []);

  const handleDeviceVolumeChange = useCallback(
    debounce(() => {
      if (!audioRef.current || isSkipping.current) return;
      const audio = audioRef.current;
      const newVolume = audio.volume;
      const newMuted = audio.muted;
      if (Math.abs(newVolume - volume) > 0.01) {
        console.log('Device volume changed to:', newVolume);
        dispatch(setVolume(newVolume));
      }
      if (newMuted !== isMuted) {
        console.log('Device mute changed to:', newMuted);
        dispatch(setIsMuted(newMuted));
      }
    }, 100),
    [audioRef, volume, isMuted, dispatch]
  );

  // Setup media session when track changes with delay for skip operations
  useEffect(() => {
    const setupWithDelay = () => {
      if (isSkipping.current) {
        // Wait for skip to complete before setting up
        setTimeout(setupWithDelay, 200);
        return;
      }
      
      if (currentTrack && currentMusicId) {
        setupMediaSession();
        syncAudioState(true); // Force sync on track change
      } else {
        cleanupMediaSession();
      }
    };

    setupWithDelay();

    return cleanupMediaSession;
  }, [currentTrack, currentMusicId, setupMediaSession, cleanupMediaSession, syncAudioState]);

  // Update media session playback state when playing state changes
  useEffect(() => {
    if ('mediaSession' in navigator && mediaSessionInitialized.current && !isSkipping.current) {
      try {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        console.log('Media Session playback state:', isPlaying ? 'playing' : 'paused');
      } catch (error) {
        console.warn('Error updating playback state:', error);
      }
    }
  }, [isPlaying]);

  // Sync audio state when volume/mute changes
  useEffect(() => {
    syncAudioState();
  }, [volume, isMuted, syncAudioState]);

  useEffect(() => {
    if (mediaSessionInitialized.current && duration > 0) {
      updatePositionState();
    }
  }, [currentTime, duration, updatePositionState]);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    
    // Volume change listener
    audio.addEventListener('volumechange', handleDeviceVolumeChange);

    const handlePlay = () => {
      if (!isPlaying && !isSkipping.current) {
        console.log('Audio play event detected, syncing state');
        dispatch(setIsPlaying(true));
      }
    };

    const handlePause = () => {
      if (isPlaying && !isSkipping.current) {
        console.log('Audio pause event detected, syncing state');
        dispatch(setIsPlaying(false));
      }
    };

    // Ended event for auto-next with debouncing
    const handleEnded = () => {
      console.log('Audio ended, playing next track');
      debouncedSkip('next');
    };

    // Loading states with skip awareness
    const handleLoadStart = () => {
      if ('mediaSession' in navigator && mediaSessionInitialized.current && !isSkipping.current) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const handleCanPlay = () => {
      if ('mediaSession' in navigator && mediaSessionInitialized.current && !isSkipping.current) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        syncAudioState(); // Sync state when audio is ready
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
  }, [audioRef, handleDeviceVolumeChange, isPlaying, dispatch, debouncedSkip, syncAudioState]);

  // Update next/previous handlers when queue changes
  useEffect(() => {
    if ('mediaSession' in navigator && mediaSessionInitialized.current && !isSkipping.current) {
      if (hasNext) {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          console.log('Media Session: Next track requested');
          debouncedSkip('next');
        });
      } else {
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }

      if (hasPrevious) {
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          console.log('Media Session: Previous track requested');
          debouncedSkip('previous');
        });
      } else {
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    }
  }, [hasNext, hasPrevious, debouncedSkip]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (skipTimeoutRef.current) {
        clearTimeout(skipTimeoutRef.current);
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Handle page visibility changes with skip awareness
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentTrack && !isSkipping.current) {
        setTimeout(() => {
          setupMediaSession();
          syncAudioState(true);
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setupMediaSession, currentTrack, syncAudioState]);

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
      if (currentTrack && !mediaSessionInitialized.current && !isSkipping.current) {
        setupMediaSession();
        syncAudioState(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentTrack, setupMediaSession, syncAudioState]);

  return null;
};

export default DeviceAudioControl;