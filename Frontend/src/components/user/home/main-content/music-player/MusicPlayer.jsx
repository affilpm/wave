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
    initializationComplete: false,
    firstLoad: true
  });

  const [metadata, setMetadata] = useState(null);
  const [signedToken, setSignedToken] = useState(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [playId, setPlayId] = useState(null);
  const [isRequestingToken, setIsRequestingToken] = useState(false);
  const [isHandlingTrackChange, setIsHandlingTrackChange] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const howlRef = useRef(null);
  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const playStartTimeRef = useRef(null);
  const reportedPlayRef = useRef(false);
  const tokenMusicIdRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const mediaSessionInitializedRef = useRef(false);
  const seekPositionRef = useRef(null);
  const initialPlayRequestRef = useRef(false);
  const previousMusicIdRef = useRef(null);
  const savedProgressRef = useRef(0);
  const tokenExpiryTimeRef = useRef(null);

  const MAX_RETRIES = 2; // Reduced from 3
  const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000;
  const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry

  const currentTrack = metadata ? {
    name: metadata.title,
    artist: metadata.artist,
    album: metadata.album || '',
    cover_photo: metadata.cover_photo || null,
    duration: metadata.duration || 0
  } : null;

  // OPTIMIZATION 1: Streamlined token refresh function
  const refreshTokenIfNeeded = async (force = false) => {
    if (!musicId || isRequestingToken) return null;
    
    // Check if we have a valid token that isn't about to expire
    if (!force && signedToken && tokenMusicIdRef.current === musicId && 
        tokenExpiryTimeRef.current && Date.now() < tokenExpiryTimeRef.current - TOKEN_EXPIRY_BUFFER) {
      return signedToken;
    }

    setIsRequestingToken(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await api.get(`/api/music/token/${musicId}/`, {
        signal: abortControllerRef.current.signal,
        timeout: 5000 // Reduced timeout
      });

      setSignedToken(response.data.token);
      setPlayId(response.data.play_id);
      tokenMusicIdRef.current = musicId;
      
      // Set token expiry time (assume 1 hour validity if not specified)
      tokenExpiryTimeRef.current = Date.now() + TOKEN_REFRESH_INTERVAL;
      
      return response.data.token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    } finally {
      setIsRequestingToken(false);
    }
  };

  useEffect(() => {
    return () => {
      cleanupAudio();
      dispatch(setActionLock(false));
    };
  }, [dispatch]);

  // OPTIMIZATION 2: Simplified periodic token refresh
  useEffect(() => {
    if (!isPlaying || !musicId) return;

    const tokenRefreshInterval = setInterval(() => {
      if (tokenExpiryTimeRef.current && Date.now() > tokenExpiryTimeRef.current - TOKEN_EXPIRY_BUFFER) {
        refreshTokenIfNeeded(true);
      }
    }, 60000); // Check once per minute instead of refreshing on fixed schedule

    return () => clearInterval(tokenRefreshInterval);
  }, [isPlaying, musicId]);

  useEffect(() => {
    if (queue.length > 0 && currentIndex === 0 && queue[currentIndex]?.id === musicId) {
      if (howlRef.current && playerState.initializationComplete) {
        if (isChanging || isHandlingTrackChange) {
          dispatch(setChangeComplete());
          setIsHandlingTrackChange(false);
          if (isPlaying && !howlRef.current.playing()) {
            setTimeout(() => {
              howlRef.current.seek(savedProgressRef.current);
              howlRef.current.play();
            }, 100);
          }
        }
      }
    }
  }, [queue, currentIndex, musicId, isChanging, isHandlingTrackChange, playerState.initializationComplete, dispatch, isPlaying]);

  // OPTIMIZATION 3: Faster lock release on error
  useEffect(() => {
    if (playerState.error && actionLock) {
      const lockReleaseTimeout = setTimeout(() => {
        dispatch(setActionLock(false));
      }, 2000); // Reduced from 5000
      return () => clearTimeout(lockReleaseTimeout);
    }
  }, [playerState.error, actionLock, dispatch]);

  // Media session handling
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack || !howlRef.current) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.name,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork: currentTrack.cover_photo ? [
        { src: currentTrack.cover_photo, sizes: '512x512', type: 'image/jpeg' }
      ] : []
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    const actionHandlers = {
      play: () => dispatch(setIsPlaying(true)),
      pause: () => dispatch(setIsPlaying(false)),
      previoustrack: handlePrevious,
      nexttrack: handleNext,
      seekto: (details) => {
        if (details.seekTime && howlRef.current) {
          seekPositionRef.current = details.seekTime;
          handleSeek(details.seekTime);
        }
      },
      seekbackward: (details) => {
        const skipTime = details.seekOffset || 10;
        const newTime = Math.max(0, playerState.progress - skipTime);
        seekPositionRef.current = newTime;
        handleSeek(newTime);
      },
      seekforward: (details) => {
        const skipTime = details.seekOffset || 10;
        const newTime = Math.min(playerState.duration, playerState.progress + skipTime);
        seekPositionRef.current = newTime;
        handleSeek(newTime);
      }
    };

    Object.entries(actionHandlers).forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.warn(`Media Session "${action}" action not supported`);
      }
    });

    mediaSessionInitializedRef.current = true;

    return () => {
      if ('mediaSession' in navigator) {
        Object.keys(actionHandlers).forEach(action => {
          try {
            navigator.mediaSession.setActionHandler(action, null);
          } catch (error) {
            console.warn(`Error clearing media session handler for ${action}`);
          }
        });
      }
    };
  }, [currentTrack, isPlaying, dispatch]);

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
      savedProgressRef.current = safePosition;
      setPlayerState(prev => ({ ...prev, progress: safePosition }));
    } catch (error) {
      console.error('Seek failed:', error);
    }
  };

  useEffect(() => {
    if ('mediaSession' in navigator && mediaSessionInitializedRef.current) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !mediaSessionInitializedRef.current || !howlRef.current || !playerState.duration || isSeeking) return;

    const now = Date.now();
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
  }, [playerState.progress, playerState.duration, isSeeking]);

  useEffect(() => {
    if (howlRef.current) {
      audioRef.current = {
        play: () => {
          howlRef.current.seek(savedProgressRef.current);
          howlRef.current.play();
        },
        pause: () => howlRef.current.pause(),
        duration: howlRef.current.duration(),
        currentTime: howlRef.current.seek(),
        playbackRate: 1
      };
    }
  }, [howlRef.current]);

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
      } else {
        reportedPlayRef.current = false;
      }
      return response.data;
    } catch (error) {
      console.error('Failed to report play completion:', error);
      return null;
    }
  };

  // OPTIMIZATION 4: Parallel metadata and token fetching
  useEffect(() => {
    if (!musicId) return;

    const fetchData = async () => {
      setPlayerState(prev => ({ ...prev, loading: true, error: null, initializationComplete: false }));
      dispatch(setActionLock(true));

      try {
        // Fetch metadata and token in parallel
        const [metadataResponse, tokenResponse, likedResponse] = await Promise.all([
          api.get(`/api/music/metadata/${musicId}/`),
          api.get(`/api/music/token/${musicId}/`),
          api.get(`/api/playlist/playlists/is_liked/?music_id=${musicId}`)
        ]);

        setMetadata(metadataResponse.data);
        setIsLiked(likedResponse.data.liked);
        setSignedToken(tokenResponse.data.token);
        setPlayId(tokenResponse.data.play_id);
        tokenMusicIdRef.current = musicId;
        tokenExpiryTimeRef.current = Date.now() + TOKEN_REFRESH_INTERVAL;

        setPlayerState(prev => ({
          ...prev,
          loading: true,
          duration: metadataResponse.data.duration,
          progress: 0,
          error: null,
          retryCount: 0
        }));

        mediaSessionInitializedRef.current = false;
        
        // Initialize audio immediately after getting both token and metadata
        initializeAudio(tokenResponse.data.token, metadataResponse.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setPlayerState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load track information',
          retryCount: 0,
          initializationComplete: false
        }));
        dispatch(setActionLock(false));
      }
    };

    fetchData();
  }, [musicId, dispatch]);

  const handleLike = async () => {
    try {
      const response = await api.post(`/api/playlist/playlists/like_songs/`, { music_id: musicId });
      setIsLiked(response.data.liked);
    } catch (error) {
      console.error('Failed to toggle like status:', error);
    }
  };

  useEffect(() => {
    if (!queue.length) return;

    const currentTrack = queue[currentIndex];
    if (currentTrack && currentTrack.id !== musicId) {
      dispatch(setMusicId(currentTrack.id));
    }
  }, [queue, currentIndex, dispatch, musicId]);

  const cleanupAudio = () => {
    if (howlRef.current) {
      if (playStartTimeRef.current && !reportedPlayRef.current) {
        const playedDuration = (Date.now() - playStartTimeRef.current) / 1000;
        const percentage = howlRef.current ? howlRef.current.seek() / howlRef.current.duration() : null;
        reportPlayCompletion(playedDuration, percentage);
      }
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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // OPTIMIZATION 5: Streamlined audio initialization
  const initializeAudio = (token, meta) => {
    try {
      cleanupAudio();
      setPlayerState(prev => ({ ...prev, loading: true, error: null, progress: 0, initializationComplete: false }));

      const audioUrl = `${api.defaults.baseURL}/api/music/stream/${musicId}/?token=${token}`;
      const sound = new Howl({
        src: [audioUrl],
        format: [meta.format],
        html5: true,
        preload: true,
        volume: playerState.isMuted ? 0 : playerState.volume,
        xhr: {
          timeout: 10000, // Reduced from 15000
          headers: { 'X-Client-ID': 'music-player-v1' }
        },
        onload: () => {
          const actualDuration = sound.duration();
          setPlayerState(prev => ({
            ...prev,
            duration: actualDuration,
            loading: false,
            error: null,
            retryCount: 0,
            progress: 0,
            initializationComplete: true
          }));
          dispatch(setChangeComplete());
          dispatch(setActionLock(false));
          setIsInitializing(false);

          if (savedProgressRef.current > 0) {
            sound.seek(savedProgressRef.current);
            setPlayerState(prev => ({ ...prev, progress: savedProgressRef.current }));
          }
          
          // Auto-play if needed
          if (isPlaying && !sound.playing()) {
            sound.play();
          }
        },
        onloaderror: (id, error) => {
          console.error('Audio load error:', error);
          const isTokenError = error && (error.includes('401') || error.includes('403') || error.includes('Unauthorized'));
          
          setPlayerState(prev => {
            const newRetryCount = prev.retryCount + 1;
            if (newRetryCount <= MAX_RETRIES) {
              // Retry with a fresh token if it's a token error
              if (isTokenError) {
                refreshTokenIfNeeded(true).then(newToken => {
                  if (newToken && meta) {
                    setTimeout(() => initializeAudio(newToken, meta), 500);
                  }
                });
              } else {
                // Regular retry
                const retryDelay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 5000);
                retryTimeoutRef.current = setTimeout(() => {
                  refreshTokenIfNeeded(true).then(newToken => {
                    if (newToken && meta) {
                      initializeAudio(newToken, meta);
                    }
                  });
                }, retryDelay);
              }
              
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
              error: 'Failed to load audio after multiple attempts.',
              retryCount: 0
            };
          });
        },
        onplayerror: (id, error) => {
          console.error('Audio playback error:', error);
          sound.once('unlock', () => {
            sound.seek(savedProgressRef.current);
            sound.play();
          });
        },
        onplay: () => {
          dispatch(setIsPlaying(true));
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
          playStartTimeRef.current = Date.now();
          if (tokenMusicIdRef.current !== musicId) {
            reportedPlayRef.current = false;
          }
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          updateSeeker();
        },
        onpause: () => {
          dispatch(setIsPlaying(false));
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
          }
          if (playStartTimeRef.current) {
            const playDuration = (Date.now() - playStartTimeRef.current) / 1000;
            const percentage = sound ? sound.seek() / sound.duration() : null;
            reportPlayCompletion(playDuration, percentage);
            playStartTimeRef.current = null;
          }
          savedProgressRef.current = sound.seek();
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
        },
        onstop: () => {
          dispatch(setIsPlaying(false));
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
          }
          if (playStartTimeRef.current) {
            const playedDuration = (Date.now() - playStartTimeRef.current) / 1000;
            reportPlayCompletion(playedDuration);
            playStartTimeRef.current = null;
          }
          setPlayerState(prev => ({ ...prev, progress: 0 }));
          savedProgressRef.current = 0;
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
        },
        onend: () => {
          if (meta && meta.duration) {
            reportPlayCompletion(meta.duration, 1.0);
          }
          dispatch(markAsPlayed(musicId));
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          dispatch(playNext());
          savedProgressRef.current = 0;
        },
        onseek: () => {
          const actualPosition = sound.seek();
          savedProgressRef.current = actualPosition;
          setPlayerState(prev => ({ ...prev, progress: actualPosition }));
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

  const updateSeeker = () => {
    if (!howlRef.current || isSeeking) {
      animationFrameRef.current = null;
      return;
    }

    let currentTime;
    try {
      currentTime = howlRef.current.seek() || 0;
    } catch (error) {
      console.warn('Error getting current time:', error);
      currentTime = playerState.progress;
    }

    if (Math.abs(currentTime - playerState.progress) > 0.1) {
      setPlayerState(prev => ({
        ...prev,
        progress: currentTime
      }));
      savedProgressRef.current = currentTime;
    }

    animationFrameRef.current = requestAnimationFrame(updateSeeker);
  };

  const handleSeekChange = (e) => {
    const value = parseFloat(e.target.value);
    setPlayerState(prev => ({ ...prev, progress: value }));
  };

  const handleSeekMouseUp = (e) => {
    const value = parseFloat(e.target.value);
    setIsSeeking(false);

    if (howlRef.current) {
      howlRef.current.seek(value);
      savedProgressRef.current = value;
      setPlayerState(prev => ({ ...prev, progress: value }));
    }

    if (isPlaying && howlRef.current) {
      howlRef.current.play();
    }

    if (!animationFrameRef.current) {
      updateSeeker();
    }
  };

  const handleSeekMouseDown = () => {
    setIsSeeking(true);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleRetry = () => {
    setPlayerState(prev => ({ ...prev, retryCount: 0, loading: true, error: null, initializationComplete: false }));
    dispatch(setActionLock(true));

    refreshTokenIfNeeded(true).then(token => {
      if (token && metadata) {
        initializeAudio(token, metadata);
      } else {
        setIsInitializing(false);
        dispatch(setActionLock(false));
      }
    });
  };

  const handleNext = () => {
    if (isHandlingTrackChange || actionLock) return;

    setIsHandlingTrackChange(true);
    savedProgressRef.current = 0;
    cleanupAudio();
    dispatch(playNext());

    setTimeout(() => setIsHandlingTrackChange(false), 500);
  };

  const handlePrevious = () => {
    if (isHandlingTrackChange || actionLock) return;

    setIsHandlingTrackChange(true);
    savedProgressRef.current = 0;
    cleanupAudio();
    dispatch(playPrevious());

    setTimeout(() => setIsHandlingTrackChange(false), 500);
  };

  const handleToggleShuffle = () => {
    if (actionLock) return;
    dispatch(toggleShuffle());
  };

  const handleRepeatMode = () => {
    if (actionLock) return;
    const modes = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeat);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    dispatch(setRepeat(nextMode));
  };

  const toggleVolume = () => {
    if (!howlRef.current) return;
    const newMutedState = !playerState.isMuted;
    howlRef.current.volume(newMutedState ? 0 : playerState.volume);
    setPlayerState(prev => ({ ...prev, isMuted: newMutedState }));
  };

  const handleVolumeChange = (e) => {
    if (!howlRef.current) return;
    const value = parseFloat(e.target.value);
    howlRef.current.volume(value);
    setPlayerState(prev => ({
      ...prev,
      volume: value,
      isMuted: value === 0
    }));
  };

  // OPTIMIZATION 6: Simplified play/pause toggle
  const togglePlayPause = () => {
    if (!playerState.initializationComplete || playerState.loading || isChanging || actionLock) return;

    const newPlayingState = !isPlaying;
    dispatch(setIsPlaying(newPlayingState));

    if (howlRef.current) {
      if (newPlayingState) {
        howlRef.current.seek(savedProgressRef.current);
        howlRef.current.play();
      } else {
        howlRef.current.pause();
        savedProgressRef.current = howlRef.current.seek();
      }
    }
  };

  useEffect(() => {
    if (!howlRef.current || !playerState.initializationComplete) return;

    if (playerState.firstLoad) {
      setPlayerState(prev => ({ ...prev, firstLoad: false }));
      return;
    }

    if (isPlaying) {
      // Play immediately without delay
      if (howlRef.current && !howlRef.current.playing()) {
        howlRef.current.seek(savedProgressRef.current);
        howlRef.current.play();
      }
    } else {
      if (howlRef.current) {
        howlRef.current.pause();
        savedProgressRef.current = howlRef.current.seek();
      }
    }
  }, [isPlaying, playerState.initializationComplete, playerState.firstLoad]);

  useEffect(() => {
    if (playerState.initializationComplete && initialPlayRequestRef.current) {
      initialPlayRequestRef.current = false;
    }
  }, [playerState.initializationComplete]);

  useEffect(() => {
    if (!musicId) {
      dispatch(setIsPlaying(false));
    }
  }, [musicId, dispatch]);

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const toggleQueue = () => {
    setIsQueueOpen(!isQueueOpen);
  };

  const isLoading = playerState.loading || isLoadingTrack || isChanging || isInitializing || !playerState.initializationComplete;

  const progressPercentage = playerState.duration ? (playerState.progress / playerState.duration) * 100 : 0;
  

  return (
    <div className="relative">
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
      
      <div className="bg-black bg-opacity-90 text-white border-t border-gray-900 backdrop-blur-lg p-1 sm:p-2 shadow-lg">
        <div className="flex flex-col md:hidden space-y-3 pt-2 pb-2 pl-2 pr-2">
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
                onClick={handleLike}
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
          
          {playerState.loading && (
            <div className="flex items-center justify-center py-1">
              <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
                <div className="bg-indigo-500 h-1 rounded-full animate-pulse w-full"></div>
              </div>
            </div>
          )}

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
          
          <div className="flex items-center justify-between px-2">
            <button 
              onClick={handleToggleShuffle}
              className={`${shuffle ? 'text-indigo-400' : 'text-gray-500'}`}
              disabled={actionLock}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={handlePrevious}
                className="text-gray-300 disabled:opacity-50"
                disabled={playerState.loading || isChanging || isHandlingTrackChange || actionLock}
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button 
                onClick={togglePlayPause}
                disabled={isLoading || actionLock || !musicId}
                className="play-button disabled:opacity-50"
              >
                {isLoading ? (
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
                disabled={playerState.loading || isChanging || isHandlingTrackChange || actionLock}
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
            
            <button 
              onClick={handleRepeatMode}
              className={`${repeat !== 'none' ? 'text-indigo-400' : 'text-gray-500'}`}
              disabled={actionLock}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="hidden md:grid md:grid-cols-3 md:items-center md:gap-4 pr-2 pl-2 pt-1 pb-1">
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
              onClick={handleLike}
              disabled={!musicId || playerState.loading}
              className={`p-1 ${isLiked ? 'text-pink-500' : 'text-gray-400'}`}
            >
              <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
            </button>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center space-x-4 mb-1">
              <button 
                onClick={handleToggleShuffle}
                className={`${shuffle ? 'text-indigo-400' : 'text-gray-500'}`}
                disabled={actionLock}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              
              <button 
                onClick={handlePrevious}
                className="text-gray-300"
                disabled={playerState.loading || isChanging || isHandlingTrackChange || actionLock}
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button 
                onClick={playerState.loading && playerState.retryCount > 0 ? handleRetry : togglePlayPause}
                className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-md disabled:opacity-50"
                disabled={isLoading || actionLock}
              >
                {isLoading ? (
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
                disabled={playerState.loading || isChanging || isHandlingTrackChange || actionLock}
              >
                <SkipForward className="w-5 h-5" />
              </button>
              
              <button 
                onClick={handleRepeatMode}
                className={`${repeat !== 'none' ? 'text-indigo-400' : 'text-gray-500'}`}
                disabled={actionLock}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {playerState.loading && (
              <div className="w-full px-4 mb-1">
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-1 rounded-full animate-pulse w-full"></div>
                </div>
              </div>
            )}

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

      {isQueueOpen && (
        <div className="fixed z-50 inset-x-0 bottom-0 md:absolute md:bottom-full md:right-0 w-full md:w-80 max-h-72 md:max-h-80 bg-black bg-opacity-95 border border-gray-900 rounded-t-lg md:rounded-lg shadow-xl">
          <div className="p-3 border-b border-gray-800 flex justify-between items-center sticky top-0 z-10">
            <h3 className="text-sm font-medium text-indigo-400">Play Queue</h3>
            <button onClick={() => setIsQueueOpen(false)} className="text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-64">
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