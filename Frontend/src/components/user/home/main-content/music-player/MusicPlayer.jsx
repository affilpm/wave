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
} from '../../../../../slices/user/musicPlayerSlice';


const MusicPlayer = () => {
  const dispatch = useDispatch();
  const {
    musicId,
    isPlaying,
    isChanging,
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
    retryCount: 0
  });
  
  const [metadata, setMetadata] = useState(null);
  const [signedToken, setSignedToken] = useState(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const howlRef = useRef(null);
  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0); // Track last UI update time
  const [isLiked, setIsLiked] = useState(false);
  const playStartTimeRef = useRef(null);
  const reportedPlayRef = useRef(false);
  const [playId, setPlayId] = useState(null);
  const tokenMusicIdRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const MAX_RETRIES = 3;
  const mediaSessionInitializedRef = useRef(false);
  const seekPositionRef = useRef(null); // Track pending seek position

  // Format current track for MediaSessionControl
  const currentTrack = metadata ? {
    name: metadata.title,
    artist: metadata.artist,
    album: metadata.album || '',
    cover_photo: metadata.cover_photo || null,
    duration: metadata.duration || 0
  } : null;

  // Initialize Media Session with debouncing for position updates
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      return; // Media Session API not supported
    }

    if (!currentTrack || !howlRef.current) {
      return; // No track information or player yet
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
        console.log('Media Session Seek:', details);
        
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


  const handleSeek = (position) => {
    console.log('Handle Seek Called:', {
      position, 
      currentHowl: !!howlRef.current,
      duration: howlRef.current?.duration()
    });
  
    if (!howlRef.current) return;
    
    const safePosition = Math.max(0, Math.min(position, howlRef.current.duration() || 0));
    
    try {
      howlRef.current.seek(safePosition);
      
      setPlayerState(prev => ({ ...prev, progress: safePosition }));
      
      console.log('Seek successful:', safePosition);
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
        !isSeeking) { // Don't update during seeking
      
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
      // Create a proxy object that adapts Howl methods to standard HTMLAudioElement methods
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
        setPlayerState(prev => ({ ...prev, loading: true, error: null }));
        const response = await api.get(`/api/music/metadata/${musicId}/`);
        setMetadata(response.data);

        const liked_response = await api.get(`/api/playlist/playlists/is_liked/?music_id=${musicId}`)
        setIsLiked(liked_response.data.liked);
        setPlayerState(prev => ({ 
          ...prev, 
          loading: false,
          duration: response.data.duration,
          progress: 0, // Reset progress when changing tracks
          error: null,
          retryCount: 0
        }));

        // Reset Media Session initialized flag when metadata changes
        mediaSessionInitializedRef.current = false;
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
        setPlayerState(prev => ({
          ...prev, 
          loading: false,  
          error: "Failed to load track information",
          retryCount: 0
        }));
      }
    };

    fetchMetadata();
  }, [musicId]);

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
  }, [queue, currentIndex]);

  // Fetch signed token with retry logic
  useEffect(() => {
    const fetchSignedToken = async () => {
      if (!musicId) return;
      
      try {
        reportedPlayRef.current = false;
        
        const response = await api.get(`/api/music/token/${musicId}/`);
      console.log(response.data, "Play reported successfully");

        setSignedToken(response.data.token);
        setPlayId(response.data.play_id);
        tokenMusicIdRef.current = musicId;
        setPlayerState(prev => ({ ...prev, retryCount: 0 }));
      } catch (error) {
        console.error("Failed to fetch signed token:", error);
        setPlayerState(prev => ({
          ...prev,
          error: "Authentication error. Please try again.",
          loading: false
        }));
      }
    };

    fetchSignedToken();
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [musicId]);

  // Initialize audio stream with enhanced error handling and retries
  useEffect(() => {
    if (!musicId || !signedToken || !metadata || tokenMusicIdRef.current !== musicId) return;
  
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
        setPlayerState(prev => ({ ...prev, loading: true, error: null, progress: 0 }));
        
        const audioUrl = `${api.defaults.baseURL}/api/music/stream/${musicId}/?token=${signedToken}`;
        const sound = new Howl({
          src: [audioUrl],
          format: [metadata.format],
          html5: true,
          preload: true,
          xhr: {
            // Add timeout for Howler XHR requests
            timeout: 15000
          },
          onload: () => {
            // Set accurate duration from loaded audio
            const actualDuration = sound.duration();
            
            setPlayerState(prev => ({
              ...prev,
              duration: actualDuration,
              loading: false,
              error: null,
              retryCount: 0,
              progress: 0 // Reset progress on load
            }));
            
            dispatch(setChangeComplete());
            
            if (isPlaying) {
              sound.play();
            }
          },
          onloaderror: (id, error) => {
            console.error('Audio loading error:', error);
            
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
                      initializeAudio(); // Retry initialization
                    })
                    .catch(tokenError => {
                      console.error("Failed to refresh token for retry:", tokenError);
                      setPlayerState(prevState => ({
                        ...prevState,
                        loading: false,
                        error: "Stream unavailable after multiple attempts. Please try again later."
                      }));
                    });
                }, retryDelay);
                
                return {
                  ...prev,
                  retryCount: newRetryCount,
                  loading: true,
                  error: `Loading audio... (Attempt ${newRetryCount}/${MAX_RETRIES})`
                };
              }
              
              return {
                ...prev,
                loading: false,
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
          error: 'Failed to initialize audio player',
          retryCount: 0
        }));
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
  console.log('Seek Change:', {
    value, 
    isSeeking, 
    isPlaying, 
    currentProgress: playerState.progress
  });
  
  setPlayerState(prev => ({
    ...prev,
    progress: value
  }));
};

  
const handleSeekMouseUp = (e) => {
  const value = parseFloat(e.target.value);
  
  console.log('Seek Mouse Up:', {
    value, 
    isPlaying, 
    currentHowl: !!howlRef.current
  });

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
  if (isPlaying) {
    howlRef.current?.play();
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
    setPlayerState(prev => ({ ...prev, retryCount: 0, loading: true, error: null }));
    
    // Refresh token and reinitialize
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
          error: "Could not refresh audio session. Please try again later."
        }));
      });
  };

  const handleNext = () => {
    // Stop current playback tracking
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Move to next track
    dispatch(playNext());
  };

  const handlePrevious = () => {
    // Stop current playback tracking
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Move to previous track
    dispatch(playPrevious());
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

  // Enhanced isPlaying effect with proper cleanup
  useEffect(() => {
    if (!howlRef.current) return;
    
    let playTimeout;
    
    if (isPlaying) {
      // Small timeout to avoid rapid play/pause toggling issues
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
  }, [isPlaying]);
  
  const togglePlayPause = () => {
    if (!howlRef.current || playerState.loading) return;
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
        <div className="flex flex-col md:hidden space-y-2">
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
                className="text-gray-300"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button 
                onClick={playerState.loading ? handleRetry : togglePlayPause}
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
        <div className="hidden md:grid md:grid-cols-3 md:items-center md:gap-4">
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