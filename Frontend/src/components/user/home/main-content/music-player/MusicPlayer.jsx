import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Howl } from 'howler';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Shuffle, 
  Repeat,
  Heart,
  ListMusic,
  X,
  Music,
  RefreshCw
} from 'lucide-react';
import api from '../../../../../api';
import {
  setIsPlaying,
  setChangeComplete,
  playNext,
  playPrevious,
  toggleShuffle,
  setRepeat,
  markAsPlayed,
  setMusicId,
  setActionLock
} from '../../../../../slices/user/musicPlayerSlice';


const MusicPlayer = () => {
  const dispatch = useDispatch();
  const {
    musicId,
    isPlaying,
    isChanging,
    isLoadingTrack,
    actionLock,
    queue,
    currentIndex,
    repeat,
    shuffle,
    playedTracks,
  } = useSelector(state => state.musicPlayer);
  

  const [playerState, setPlayerState] = useState({
    progress: 0,
    duration: 0,
    loading: false,
    error: null,
    volume: 1,
    isMuted: false,
    retryCount: 0,
    initializationComplete: false // Add a flag to track complete initialization
  });
  
  const [metadata, setMetadata] = useState(null);
  const [signedToken, setSignedToken] = useState(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const howlRef = useRef(null);
  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const [isLiked, setIsLiked] = useState(false);
  const playStartTimeRef = useRef(null);
  const reportedPlayRef = useRef(false);
  const [playId, setPlayId] = useState(null);
  const tokenMusicIdRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const MAX_RETRIES = 3;
  const mediaSessionInitializedRef = useRef(false);
  const seekPositionRef = useRef(null);
  const [isRequestingToken, setIsRequestingToken] = useState(false);
  const [isHandlingTrackChange, setIsHandlingTrackChange] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false); 
  const pageLoadRef = useRef(true);


  // Current track for MediaSessionControl
  const currentTrack = metadata ? {
    name: metadata.title,
    artist: metadata.artist,
    album: metadata.album || '',
    cover_photo: metadata.cover_photo || null,
    duration: metadata.duration || 0
  } : null;

  // When component unmounts or changes track
  useEffect(() => {
    return () => {
      dispatch(setActionLock(false));
    };
  }, [dispatch]);



// Improve refreshTokenIfNeeded function
const refreshTokenIfNeeded = async (retryOnCancel = true) => {
  if (!musicId || isRequestingToken) return null;
  
  try {
    setIsRequestingToken(true);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await api.get(`/api/music/token/${musicId}/`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    setSignedToken(response.data.token);
    setPlayId(response.data.play_id);
    tokenMusicIdRef.current = musicId;
    return response.data.token;
  } catch (error) {
    // More specific error handling
    const isCancelled = error.name === 'AbortError' || 
                       error.name === 'CanceledError' || 
                       error.message?.includes('cancel');
    
    if (isCancelled && retryOnCancel) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsRequestingToken(false);
      return refreshTokenIfNeeded(false);
    }
    
    return null;
  } finally {
    setIsRequestingToken(false);
  }
};


// Add this useEffect to refresh the token periodically during playback
useEffect(() => {
  if (!isPlaying || !musicId) return;
  
  // Refresh token every 45 minutes (3/4 of the 1hr expiry)
  const tokenRefreshInterval = setInterval(() => {
    refreshTokenIfNeeded();
  }, 45 * 60 * 1000);
  
  return () => {
    clearInterval(tokenRefreshInterval);
  };
}, [isPlaying, musicId]);


// Add this useEffect to release action lock if stuck in error state
useEffect(() => {
  if (playerState.error && actionLock) {
    // Release action lock after 5 seconds if we're in an error state
    const lockReleaseTimeout = setTimeout(() => {
      dispatch(setActionLock(false));
    }, 5000);
    
    return () => clearTimeout(lockReleaseTimeout);
  }
}, [playerState.error, actionLock, dispatch]);

  // Initialize Media Session with debouncing for position updates
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      return;
    }

    if (!currentTrack || !howlRef.current) {
      return;
    }

    // Configure Media Session metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.name,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork: currentTrack.cover_photo ? [
        { src: currentTrack.cover_photo, sizes: '512x512', type: 'image/jpeg' }
      ] : []
    });

    // Set playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    // Set up Media Session actions
    navigator.mediaSession.setActionHandler('play', () => {
      dispatch(setIsPlaying(true));
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      dispatch(setIsPlaying(false));
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      handlePrevious();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      handleNext();
    });

    // Add seekto handler if supported
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && howlRef.current) {
          seekPositionRef.current = details.seekTime;
          handleSeek(details.seekTime);
        }
      });
    } catch (error) {
      console.warn('Media Session "seekto" action is not supported');
    }

    // Add seekbackward/seekforward handlers if supported
    try {
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        const newTime = Math.max(0, playerState.progress - skipTime);
        seekPositionRef.current = newTime;
        handleSeek(newTime);
      });
    } catch (error) {
      console.warn('Media Session "seekbackward" action is not supported');
    }

    try {
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        const newTime = Math.min(playerState.duration, playerState.progress + skipTime);
        seekPositionRef.current = newTime;
        handleSeek(newTime);
      });
    } catch (error) {
      console.warn('Media Session "seekforward" action is not supported');
    }

    mediaSessionInitializedRef.current = true;
  }, [currentTrack, howlRef.current, dispatch]);

  // Track when Redux isChanging state changes
  useEffect(() => {
    if (isChanging) {
      setIsHandlingTrackChange(true);
    } else {
      const timeout = setTimeout(() => setIsHandlingTrackChange(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isChanging]);

  const handleSeek = (position) => {
    if (!howlRef.current) return;
    
    const safePosition = Math.max(0, Math.min(position, howlRef.current.duration() || 0));
    
    try {
      howlRef.current.seek(safePosition);
      setPlayerState(prev => ({ ...prev, progress: safePosition }));
    } catch (error) {
      console.error('Seek failed:', error);
    }
  };

  // Update Media Session playback state when isPlaying changes
  useEffect(() => {
    if ('mediaSession' in navigator && mediaSessionInitializedRef.current) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Debounced Media Session position state updates
  useEffect(() => {
    if ('mediaSession' in navigator && 
        mediaSessionInitializedRef.current && 
        howlRef.current && 
        playerState.duration > 0 &&
        !isSeeking) {
      
      const now = Date.now();
      // Only update if it's been at least 250ms since last update
      if (now - lastUpdateTimeRef.current >= 250) {
        try {
          navigator.mediaSession.setPositionState({
            duration: playerState.duration,
            playbackRate: 1.0,
            position: playerState.progress
          });
          lastUpdateTimeRef.current = now;
        } catch (error) {
          console.warn('Error updating position state:', error);
        }
      }
    }
  }, [playerState.progress, playerState.duration, isSeeking]);

  // Sync howlRef with audioRef for Media controls
  useEffect(() => {
    if (howlRef.current) {
      audioRef.current = {
        play: () => howlRef.current.play(),
        pause: () => howlRef.current.pause(),
        duration: howlRef.current ? howlRef.current.duration() : 0,
        currentTime: howlRef.current ? howlRef.current.seek() : 0,
        playbackRate: 1
      };
    }
  }, [howlRef.current]);

  // Update audioRef when progress changes
  useEffect(() => {
    if (audioRef.current && howlRef.current) {
      audioRef.current.currentTime = playerState.progress;
      audioRef.current.duration = playerState.duration;
    }
  }, [playerState.progress, playerState.duration]);

  const reportPlayCompletion = async (duration, percentage = null) => {
    if (!musicId || !playId) return;
    
    try {
      const response = await api.post('api/music/record_play_completion/', {
        music_id: musicId,
        played_duration: duration,
        play_percentage: percentage,
        play_id: playId
      });

      if (response.data.counted_as_play) {
        reportedPlayRef.current = true;
        console.log("Play counted successfully");
      } else {
        reportedPlayRef.current = false;
        console.log(`Play progress: ${response.data.accumulated_duration}s accumulated`);
      }
      
      return response.data;
    } catch (error) {
      console.error("Failed to report play completion", error);
      return null;
    }
  };
  
  // Fetch music metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!musicId) return;
      
      try {
        // Set loading state both in component and Redux
        setPlayerState(prev => ({ ...prev, loading: true, error: null, initializationComplete: false }));
        dispatch(setActionLock(true)); // Lock actions during metadata fetch
        
        const response = await api.get(`/api/music/metadata/${musicId}/`);
        setMetadata(response.data);

        const liked_response = await api.get(`/api/playlist/playlists/is_liked/?music_id=${musicId}`)
        setIsLiked(liked_response.data.liked);
        
        setPlayerState(prev => ({ 
          ...prev, 
          loading: true, // Keep loading true until full initialization
          duration: response.data.duration,
          progress: 0,
          error: null,
          retryCount: 0
        }));

        mediaSessionInitializedRef.current = false;
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
        setPlayerState(prev => ({
          ...prev, 
          loading: false,  
          error: "Failed to load track information",
          retryCount: 0,
          initializationComplete: false
        }));
        dispatch(setActionLock(false));
      }
    };

    fetchMetadata();
  }, [musicId, dispatch]);

  const handlelike = async () => {
    try {
      const response = await api.post(`/api/playlist/playlists/like_songs/`, { music_id: musicId });
      setIsLiked(response.data.liked);
    } catch (error) {
      console.error("Failed to toggle like status:", error);
    }
  };
  
  useEffect(() => {
    if (!queue.length) return;
    
    const currentTrack = queue[currentIndex];
    if (currentTrack && currentTrack.id !== musicId) {
      dispatch(setMusicId(currentTrack.id));
    }
  }, [queue, currentIndex, dispatch, musicId]);

  // Fetch signed token with retry logic
  useEffect(() => {
    if (!musicId || isRequestingToken || !metadata) return;
  
    const fetchSignedToken = async () => {
      try {
        setIsRequestingToken(true);
        reportedPlayRef.current = false;
        
        // Add AbortController to manage the request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await api.get(`/api/music/token/${musicId}/`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        setSignedToken(response.data.token);
        setPlayId(response.data.play_id);
        tokenMusicIdRef.current = musicId;
        setPlayerState(prev => ({ ...prev, retryCount: 0 }));
      } catch (error) {
        // Check if the request was cancelled
        const isCancelled = error.name === 'AbortError' || 
                           error.name === 'CanceledError' || 
                           error.message?.includes('cancel') ||
                           error.message?.includes('abort');
        
        console.error(`Token fetch ${isCancelled ? 'cancelled' : 'failed'}:`, error);
        
        if (isCancelled) {
          // If cancelled, retry after a short delay
          retryTimeoutRef.current = setTimeout(() => {
            setIsRequestingToken(false); // Reset flag to allow retry
          }, 1000);
        } else {
          setPlayerState(prev => ({
            ...prev,
            error: "Authentication error. Please try again.",
            loading: false,
            initializationComplete: false
          }));
          dispatch(setActionLock(false));
        }
      } finally {
        setIsRequestingToken(false);
      }
    };
  
    fetchSignedToken();
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [musicId, metadata, dispatch]);

  // Initialize audio stream with enhanced error handling and retries
  useEffect(() => {
    if (!musicId || !signedToken || !metadata || tokenMusicIdRef.current !== musicId || isInitializing) return;
  
    // Set initializing flag to prevent multiple initializations
    setIsInitializing(true);
    
    // Clear any previous timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    if (howlRef.current) {
      howlRef.current.unload();
    }

    // Cancel any ongoing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  
    const initializeAudio = () => {
      try {
        setPlayerState(prev => ({ ...prev, loading: true, error: null, progress: 0, initializationComplete: false }));
        
        // Create a cancel token that will expire after 15 seconds (same as Howl's XHR timeout)
        const cancelTimeout = setTimeout(() => {
          console.log("Audio loading taking too long, preemptively refreshing token...");
          refreshTokenIfNeeded().then(() => {
            // Continue with initialization process on next cycle
            setIsInitializing(false);
          });
        }, 14000); // Slightly shorter than Howl's timeout to ensure we can refresh before it fails
        
        const audioUrl = `${api.defaults.baseURL}/api/music/stream/${musicId}/?token=${signedToken}`;
        const sound = new Howl({
          src: [audioUrl],
          format: [metadata.format],
          html5: true,
          preload: true,
          xhr: {
            timeout: 15000,
            headers: {
              // Add a custom header to help identify our requests in case of debugging
              'X-Client-ID': 'music-player-v1'
            }
          },
          onload: () => {

            clearTimeout(cancelTimeout);

            // Audio has loaded successfully
            const actualDuration = sound.duration();
            
            setPlayerState(prev => ({
              ...prev,
              duration: actualDuration,
              loading: false,
              error: null,
              retryCount: 0,
              progress: 0,
              initializationComplete: true // Mark initialization as complete
            }));
            
            dispatch(setChangeComplete());
            dispatch(setActionLock(false));
            setIsInitializing(false);
            
            // Don't auto-play here, let the isPlaying effect handle it
          },
          onloaderror: (id, error) => {
            console.error('Audio loading error:', error);
            
            // Check if the error might be token-related or a cancellation
            const isTokenError = error && (
              error.includes('401') || 
              error.includes('403') || 
              error.includes('Unauthorized')
            );
            
            const isCancellation = error && (
              error.includes('cancel') || 
              error.includes('abort') ||
              error.includes('timeout')
            );
            
            if (isTokenError || isCancellation) {
              console.log(`${isTokenError ? "Token likely expired" : "Request cancelled"}, attempting refresh...`);
              
              // If it's a cancellation, we'll force a retry with backoff
              const retryDelay = isCancellation ? 2000 : 500;
              
              setTimeout(() => {
                refreshTokenIfNeeded().then(newToken => {
                  if (newToken) {
                    // Token refreshed successfully, will retry on next cycle
                    setIsInitializing(false); // Allow reinitializing
                  }
                });
              }, retryDelay);
              
              return;
            }
          
            
            // Implement retry logic
            setPlayerState(prev => {
              const newRetryCount = prev.retryCount + 1;
              
              if (newRetryCount <= MAX_RETRIES) {
                console.log(`Retry attempt ${newRetryCount}/${MAX_RETRIES}...`);
                
                // Exponential backoff for retries
                const retryDelay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 10000);
                
                retryTimeoutRef.current = setTimeout(() => {
                  // Get fresh token and retry
                  api.get(`/api/music/token/${musicId}/`)
                    .then(response => {
                      setSignedToken(response.data.token);
                      setPlayId(response.data.play_id);
                      setIsInitializing(false); // Reset initializing flag to allow retry
                    })
                    .catch(tokenError => {
                      console.error("Failed to refresh token for retry:", tokenError);
                      setPlayerState(prevState => ({
                        ...prevState,
                        loading: false,
                        error: "Stream unavailable after multiple attempts. Please try again later.",
                        initializationComplete: false
                      }));
                      dispatch(setActionLock(false));
                      setIsInitializing(false);
                    });
                }, retryDelay);
                
                return {
                  ...prev,
                  retryCount: newRetryCount,
                  loading: true,
                  initializationComplete: false,
                  error: `Loading audio... (Attempt ${newRetryCount}/${MAX_RETRIES})`
                };
              }
              
              dispatch(setActionLock(false));
              setIsInitializing(false);
              
              return {
                ...prev,
                loading: false,
                initializationComplete: false,
                error: "Failed to load audio after multiple attempts. Please try a different track or check your connection.",
                retryCount: 0
              };
            });
          },
          onplayerror: (id, error) => {
            console.error('Audio playback error:', error);
            
            // Try to recover from playback errors
            sound.once('unlock', function() {
              sound.play();
            });
          },
          onplay: () => {
            // Update Media Session playback state
            if ('mediaSession' in navigator) {
              navigator.mediaSession.playbackState = 'playing';
            }
            
            playStartTimeRef.current = Date.now();
  
            if (tokenMusicIdRef.current !== musicId) {
              reportedPlayRef.current = false;
            }
          
            // Start progress tracking with throttling
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
            }
            updateSeeker();
          },
          onpause: () => {
            // Update Media Session playback state
            if ('mediaSession' in navigator) {
              navigator.mediaSession.playbackState = 'paused';
            }
            
            if (playStartTimeRef.current) {
              const playDuration = (Date.now() - playStartTimeRef.current) / 1000;
              const percentage = sound ? sound.seek() / sound.duration() : null;
              
              reportPlayCompletion(playDuration, percentage)
              .then(() => {
                playStartTimeRef.current = null;
              });
            }

            // Stop progress tracking
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
          },
          onstop: () => {
            // Update Media Session playback state
            if ('mediaSession' in navigator) {
              navigator.mediaSession.playbackState = 'paused';
            }
            
            if (playStartTimeRef.current) {
              const playedDuration = (Date.now() - playStartTimeRef.current) / 1000;
              reportPlayCompletion(playedDuration);
              playStartTimeRef.current = null;
            }
            
            setPlayerState(prev => ({ ...prev, progress: 0 }));
            
            // Stop progress tracking
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
          },
          onend: () => {
            // Report full play completion
            if (metadata && metadata.duration){
              reportPlayCompletion(metadata.duration, 1.0);
            }

            dispatch(markAsPlayed(musicId));
            
            // Stop progress tracking
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
            
            // Move to next track
            dispatch(playNext());
          },
          onseek: () => {
            // Get actual position after seek completed
            const actualPosition = sound.seek();
            
            // Update UI state with actual position
            setPlayerState(prev => ({ ...prev, progress: actualPosition }));
            
            // Update Media Session position state with debouncing
            if ('mediaSession' in navigator && sound && sound.duration()) {
              const now = Date.now();
              if (now - lastUpdateTimeRef.current >= 250) {
                try {
                  navigator.mediaSession.setPositionState({
                    duration: sound.duration(),
                    playbackRate: 1.0,
                    position: actualPosition
                  });
                  lastUpdateTimeRef.current = now;
                } catch (error) {
                  console.warn('Error updating position state:', error);
                }
              }
            }
            
            // Resume progress tracking if playing
            if (isPlaying && !animationFrameRef.current) {
              updateSeeker();
            }
          }
        });
        
        howlRef.current = sound;
      } catch (error) {
        console.error('Error initializing audio:', error);
        setPlayerState(prev => ({
          ...prev,
          loading: false,
          initializationComplete: false,
          error: 'Failed to initialize audio player',
          retryCount: 0
        }));
        dispatch(setActionLock(false));
        setIsInitializing(false);
      }
    };
  
    initializeAudio();
    
    return () => {
      if (howlRef.current && playStartTimeRef.current && !reportedPlayRef.current) {
        const playedDuration = (Date.now() - playStartTimeRef.current) / 1000;
        const percentage = howlRef.current ? howlRef.current.seek() / howlRef.current.duration() : null;
        reportPlayCompletion(playedDuration, percentage);
      }

      if (howlRef.current) {
        howlRef.current.unload();
        howlRef.current = null;
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Clear media session handlers when component unmounts
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        try {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('previoustrack', null);
          navigator.mediaSession.setActionHandler('nexttrack', null);
          navigator.mediaSession.setActionHandler('seekto', null);
          navigator.mediaSession.setActionHandler('seekbackward', null);
          navigator.mediaSession.setActionHandler('seekforward', null);
        } catch (error) {
          console.warn('Error clearing media session handlers:', error);
        }
      }
      
      setIsInitializing(false);
    };
  }, [musicId, signedToken, metadata, dispatch]);
  
  // Improved updateSeeker with throttling to prevent excessive updates
  const updateSeeker = () => {
    if (!howlRef.current || isSeeking) {
      animationFrameRef.current = null;
      return;
    }
  
    // Get current time directly from Howl
    let currentTime;
    try {
      currentTime = howlRef.current.seek() || 0;
    } catch (error) {
      console.warn('Error getting current time from Howl:', error);
      currentTime = playerState.progress;
    }
    
    // Avoid unnecessary updates if value hasn't changed significantly (> 0.1s)
    if (Math.abs(currentTime - playerState.progress) > 0.1) {
      setPlayerState(prev => ({
        ...prev,
        progress: currentTime
      }));
    }
    
    // Schedule next update (aim for ~30fps for UI updates = ~33ms)
    animationFrameRef.current = requestAnimationFrame(updateSeeker);
  };

  const handleSeekChange = (e) => {
    const value = parseFloat(e.target.value);
    
    setPlayerState(prev => ({
      ...prev,
      progress: value
    }));
  };

  const handleSeekMouseUp = (e) => {
    const value = parseFloat(e.target.value);
    
    setIsSeeking(false);
    
    // Force seek even if not playing
    if (howlRef.current) {
      howlRef.current.seek(value);
      
      setPlayerState(prev => ({ 
        ...prev, 
        progress: value 
      }));
    }
    
    // Optionally restart playing if it was playing before
    if (isPlaying && howlRef.current) {
      howlRef.current.play();
    }
    
    // Resume progress tracking
    if (!animationFrameRef.current) {
      updateSeeker();
    }
  };

  const handleSeekMouseDown = () => {
    setIsSeeking(true);
    
    // Pause updates during seeking
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleRetry = () => {
    // Manual retry function
    setPlayerState(prev => ({ ...prev, retryCount: 0, loading: true, error: null, initializationComplete: false }));
    dispatch(setActionLock(true));
    
    refreshTokenIfNeeded().then(() => {
      // Reset initializing flag to allow retry regardless of token result
      setIsInitializing(false);
    });

    api.get(`/api/music/token/${musicId}/`)
      .then(response => {
        setSignedToken(response.data.token);
        setPlayId(response.data.play_id);
      })
      .catch(error => {
        console.error("Failed to refresh token for manual retry:", error);
        setPlayerState(prev => ({
          ...prev,
          loading: false,
          initializationComplete: false,
          error: "Could not refresh audio session. Please try again later."
        }));
        dispatch(setActionLock(false));
      });
  };

  const handleNext = () => {
    if (isHandlingTrackChange) return;
    
    setIsHandlingTrackChange(true);
    
    // Stop current playback tracking
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Move to next track
    dispatch(playNext());
    
    // Reset handling flag after a short delay to prevent multiple clicks
    setTimeout(() => setIsHandlingTrackChange(false), 500);
  };
  
  const handlePrevious = () => {
    if (isHandlingTrackChange) return;
    
    setIsHandlingTrackChange(true);
    
    // Stop current playback tracking
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Move to previous track
    dispatch(playPrevious());
    
    // Reset handling flag after a short delay to prevent multiple clicks
    setTimeout(() => setIsHandlingTrackChange(false), 500);
  };

  const handleToggleShuffle = () => {
    dispatch(toggleShuffle());
  };

  const handleRepeatMode = () => {
    const modes = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeat);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    dispatch(setRepeat(nextMode));
  };

  const toggleVolume = () => {
    if (howlRef.current) {
      if (playerState.isMuted) {
        howlRef.current.volume(playerState.volume);
      } else {
        howlRef.current.volume(0);
      }
      setPlayerState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }
  };

  
  useEffect(() => {
    if (!howlRef.current || !playerState.initializationComplete) return;
    
    let playTimeout;
    
    if (isPlaying) {
      // Don't auto-play on initial page load
      if (pageLoadRef.current) {
        pageLoadRef.current = false;
        // Only dispatch this if you want to sync the Redux state with our desired behavior
        dispatch(setIsPlaying(false));
        return;
      }
      
      // Only play when initialization is complete and not initial page load
      playTimeout = setTimeout(() => {
        if (howlRef.current) {
          howlRef.current.play();
        }
      }, 10);
    } else {
      if (howlRef.current) {
        howlRef.current.pause();
      }
    }
    
    return () => {
      if (playTimeout) {
        clearTimeout(playTimeout);
      }
    };
  }, [isPlaying, playerState.initializationComplete, dispatch]);
  
  
  const togglePlayPause = () => {
    // Prevent toggling if initialization not complete or loading
    if (!playerState.initializationComplete || playerState.loading || isChanging) return;
    dispatch(setIsPlaying(!isPlaying));
  };

  const handleVolumeChange = (e) => {
    const value = parseFloat(e.target.value);
    if (howlRef.current) {
      howlRef.current.volume(value);
    }
    setPlayerState(prev => ({
      ...prev,
      volume: value,
      isMuted: value === 0
    }));
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const toggleQueue = () => {
    setIsQueueOpen(!isQueueOpen);
  };

  // Calculate loading state for UI (combines local and Redux states)
  const isLoading = playerState.loading || isLoadingTrack || isChanging || isInitializing || !playerState.initializationComplete;

  // Calculate progress percentage for custom progress bar
  const progressPercentage = playerState.duration 
    ? (playerState.progress / playerState.duration) * 100 
    : 0;

  return (
    <div className="relative">
      {/* Error Message Banner */}
      {playerState.error && !playerState.loading && (
        <div className="bg-red-900 text-white p-2 flex items-center justify-between">
          <span className="text-sm">{playerState.error}</span>
          <button 
            onClick={handleRetry} 
            className="bg-red-700 hover:bg-red-600 rounded-full p-1 flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Main Player - Slimmer design */}
      <div className="bg-black bg-opacity-90 text-white border-t border-gray-900 backdrop-blur-lg p-1 sm:p-2 shadow-lg">
        {/* Mobile view - Vertical compact layout */}
        <div className="flex flex-col md:hidden space-y-3 pt-2 pb-2 pl-2 pr-2">
          {/* Song info and mini controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {metadata?.cover_photo ? (
                <div className="w-10 h-10 rounded-md overflow-hidden">
                  <img 
                    src={metadata.cover_photo}
                    alt={metadata.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-md bg-gray-800 flex items-center justify-center">
                  <Music className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="overflow-hidden">
              <h3 className="text-sm font-medium truncate">{metadata?.title}</h3>
                <p className="text-xs text-gray-400 truncate">{metadata?.artist}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button 
                onClick={handlelike}
                disabled={!musicId || playerState.loading}
                className={`p-1 rounded-full ${
                  isLiked ? 'text-pink-500' : 'text-gray-400'
                } ${!musicId || playerState.loading ? 'opacity-50' : ''}`}
              >
                <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
              </button>
              <button onClick={toggleQueue} className="p-1 text-gray-400">
                <ListMusic className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Loading Indicator */}
          {playerState.loading && (
            <div className="flex items-center justify-center py-1">
              <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
                <div className="bg-indigo-500 h-1 rounded-full animate-pulse w-full"></div>
              </div>
            </div>
          )}

          
          {/* Slim progress bar */}
          {!playerState.loading && (
            <div className="px-1">
              <div className="relative h-1 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-indigo-500"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
                <input
                  type="range"
                  min="0"
                  max={playerState.duration || 100}
                  value={playerState.progress || 0}
                  onChange={handleSeekChange}
                  onMouseDown={handleSeekMouseDown}
                  onTouchStart={handleSeekMouseDown}
                  onMouseUp={handleSeekMouseUp}
                  onTouchEnd={handleSeekMouseUp}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  {formatTime(playerState.progress)}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTime(playerState.duration)}
                </span>
              </div>
            </div>
          )}
          
          {/* Compact playback controls */}
          <div className="flex items-center justify-between px-2">
            <button 
              onClick={handleToggleShuffle}
              className={`${shuffle ? 'text-indigo-400' : 'text-gray-500'}`}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-4">
            <button 
              onClick={handlePrevious}
              className="text-gray-300 disabled:opacity-50"
              disabled={playerState.loading || isChanging || isHandlingTrackChange}
            >
              <SkipBack className="w-5 h-5" />
            </button>
              
            <button 
              onClick={togglePlayPause}
              disabled={isLoadingTrack || isChanging || actionLock || !musicId}
              className="play-button disabled:opacity-50"
            >
              {isLoadingTrack || isChanging ? (
                <RefreshCw className="w-5 h-5 text-white animate-spin" />
              ) : isPlaying ? (
                <Pause />
              ) : (
                <Play />
              )}
            </button>

                          
            <button 
              onClick={handleNext}
              className="text-gray-300 disabled:opacity-50"
              disabled={playerState.loading || isChanging || isHandlingTrackChange}
            >
              <SkipForward className="w-5 h-5" />
            </button>

            </div>
            
            <button 
              onClick={handleRepeatMode}
              className={`${repeat !== 'none' ? 'text-indigo-400' : 'text-gray-500'}`}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop view - Sleek horizontal layout */}
        <div className="hidden md:grid md:grid-cols-3 md:items-center md:gap-4 pr-2 pl-2 pt-1 pb-1">
          {/* Track info - Left */}
          <div className="flex items-center space-x-3">
            {metadata?.cover_photo ? (
              <div className="w-12 h-12 rounded-md overflow-hidden">
                <img 
                  src={metadata.cover_photo}
                  alt={metadata.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-md bg-gray-800 flex items-center justify-center">
                <Music className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div className="overflow-hidden">
              <h3 className="text-sm font-medium truncate">{metadata?.title}</h3>
              <p className="text-xs text-gray-400 truncate">{metadata?.artist}</p>
            </div>
            <button 
              onClick={handlelike}
              disabled={!musicId || playerState.loading}
              className={`p-1 ${isLiked ? 'text-pink-500' : 'text-gray-400'}`}
            >
              <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
            </button>
          </div>
            
          {/* Playback Controls - Center */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center space-x-4 mb-1">
              <button 
                onClick={handleToggleShuffle}
                className={`${shuffle ? 'text-indigo-400' : 'text-gray-500'}`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              
              <button 
                onClick={handlePrevious}
                className="text-gray-300"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button 
                onClick={playerState.loading && playerState.retryCount > 0 ? handleRetry : togglePlayPause}
                className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-md disabled:opacity-50"
                disabled={playerState.loading && playerState.retryCount === 0}
              >
                {playerState.loading ? (
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </button>
              
              <button 
                onClick={handleNext}
                className="text-gray-300"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              
              <button 
                onClick={handleRepeatMode}
                className={`${repeat !== 'none' ? 'text-indigo-400' : 'text-gray-500'}`}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Loading Indicator */}
            {playerState.loading && (
              <div className="w-full px-4 mb-1">
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-1 rounded-full animate-pulse w-full"></div>
                </div>
              </div>
            )}

            {/* Slim Progress Bar */}
            {!playerState.loading && (
              <div className="w-full px-4 space-y-1">
                <div className="relative h-1 bg-gray-800 rounded-full overflow-hidden group">
                  <div 
                    className="absolute top-0 left-0 h-full bg-indigo-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                  <input
                    type="range"
                    min="0"
                    max={playerState.duration || 100}
                    value={playerState.progress || 0}
                    onChange={handleSeekChange}
                    onMouseDown={handleSeekMouseDown}
                    onMouseUp={handleSeekMouseUp}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatTime(playerState.progress)}</span>
                  <span>{formatTime(playerState.duration)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Volume and Queue - Right */}
          <div className="flex items-center justify-end space-x-4">
            <div className="hidden lg:flex items-center space-x-2">
              <button onClick={toggleVolume} className="text-gray-400">
                {playerState.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div className="relative w-20 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-indigo-500"
                  style={{ width: `${playerState.isMuted ? 0 : playerState.volume * 100}%` }}
                ></div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={playerState.isMuted ? 0 : playerState.volume}
                  onChange={handleVolumeChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                />
              </div>
            </div>
            
            <button onClick={toggleVolume} className="lg:hidden text-gray-400">
              {playerState.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            
            <button onClick={toggleQueue} className="text-gray-400">
              <ListMusic className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>


      {/* Queue Panel - Minimal Design */}
      {isQueueOpen && (
        <div className="fixed z-50 inset-x-0 bottom-0 md:absolute md:bottom-full md:right-0 w-full md:w-80 max-h-72 md:max-h-80 bg-black bg-opacity-95 border border-gray-900 rounded-t-lg md:rounded-lg shadow-xl">
          <div className="p-3 border-b border-gray-800 flex justify-between items-center sticky top-0 z-10">
            <h3 className="text-sm font-medium text-indigo-400">Play Queue</h3>
            <button onClick={() => setIsQueueOpen(false)} className="text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-64">
            {/* Now Playing */}
            {queue[currentIndex] && (
              <div className="p-3 border-b border-gray-800/30 bg-indigo-900/20">
                <h4 className="text-xs text-gray-400 mb-2">Now Playing</h4>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center">
                    {queue[currentIndex].coverPhoto ? (
                      <img src={queue[currentIndex].coverPhoto} alt="" className="w-full h-full object-cover rounded" />
                    ) : (
                      <Music className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-sm truncate text-white">{queue[currentIndex].name}</p>
                    <p className="text-xs text-gray-400 truncate">{queue[currentIndex].artist}</p>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-indigo-500/30 flex items-center justify-center">
                    <div className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Up Next - Minimal list */}
            <div className="p-3">
              <h4 className="text-xs text-gray-400 mb-2">Up Next</h4>
              {queue.slice(currentIndex + 1).length > 0 ? (
                queue.slice(currentIndex + 1).map((track, index) => (
                  <div 
                    key={track.id} 
                    className="flex items-center space-x-2 py-2 hover:bg-gray-800/30 rounded cursor-pointer"
                    onClick={() => {
                      dispatch(setMusicId(track.id));
                      setIsQueueOpen(false);
                    }}
                  >
                    <span className="text-xs text-gray-500 w-4">{index + 1}</span>
                    <div className="w-7 h-7 rounded bg-gray-800 flex items-center justify-center">
                      {track.coverPhoto ? (
                        <img src={track.coverPhoto} alt="" className="w-full h-full object-cover rounded" />
                      ) : (
                        <Music className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs truncate text-white">{track.name}</p>
                      <p className="text-xs text-gray-500 truncate">{track.artist}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <ListMusic className="w-8 h-8 text-gray-700 mb-2" />
                  <p className="text-sm text-gray-500">Queue is empty</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicPlayer;