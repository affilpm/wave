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
  MoreHorizontal,
  GripHorizontal
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
    isMuted: false
  });
  
  const [metadata, setMetadata] = useState(null);
  const [signedToken, setSignedToken] = useState(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const howlRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isLiked, setIsLiked] = useState(false);
  
  // Fetch music metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!musicId) return;
      
      try {
        setPlayerState(prev => ({ ...prev, loading: true }));
        const response = await api.get(`/api/music/metadata/${musicId}/`);
        setMetadata(response.data);

        const liked_response = await api.get(`/api/playlist/playlists/is_liked/?music_id=${musicId}`)
        setIsLiked(liked_response.data.liked);
        setPlayerState(prev => ({ 
          ...prev, 
          loading: false,
          duration: response.data.duration,
          error: null
        }));
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
        setPlayerState(prev => ({
          ...prev,
          loading: false,
          error: "Failed to load track information"
        }));
      }
    };

    fetchMetadata();
  }, [musicId]);

  const handlelike = async () => {
    try {
      const response = await api.post(`/api/playlist/playlists/like_songs/`, { music_id: musicId });
      console.log(response.data)
      setIsLiked(response.data.liked);
    } catch (error) {
      console.error("Failed to toggle like status:", error);
    }
  }
  
  useEffect(() => {
    if (!queue.length) return;
    
    // Ensure musicId is synced with current queue position
    const currentTrack = queue[currentIndex];
    if (currentTrack && currentTrack.id !== musicId) {
      dispatch(setMusicId(currentTrack.id));
    }
  }, [queue, currentIndex]);

  // Fetch signed token for streaming
  useEffect(() => {
    const fetchSignedToken = async () => {
      if (!musicId) return;
      
      try {
        const response = await api.get(`/api/music/token/${musicId}/`);
        setSignedToken(response.data.token);
      } catch (error) {
        console.error("Failed to fetch signed token:", error);
        setPlayerState(prev => ({
          ...prev,
          error: "Authentication error. Please try again."
        }));
      }
    };

    fetchSignedToken();
  }, [musicId]);

  // Initialize audio stream
  useEffect(() => {
    if (!musicId || !signedToken || !metadata) return;
  
    if (howlRef.current) {
      howlRef.current.unload();
    }
  
    const initializeAudio = () => {
      try {
        const audioUrl = `${api.defaults.baseURL}/api/music/stream/${musicId}/?token=${signedToken}`;
        const sound = new Howl({
          src: [audioUrl],
          format: [metadata.format],
          html5: true,
          preload: true,
          onload: () => {
            setPlayerState(prev => ({
              ...prev,
              duration: sound.duration(),
              loading: false,
              error: null
            }));
            dispatch(setChangeComplete());
            
            if (isPlaying) {
              sound.play();
            }
          },
          onloaderror: (id, error) => {
            console.error('Audio loading error:', error);
            setPlayerState(prev => ({
              ...prev,
              loading: false,
              error: 'Failed to load audio. Please try again.'
            }));
          },
          onplay: () => {
            updateSeeker();
          },
          onpause: () => {
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
            }
          },
          onstop: () => {
            setPlayerState(prev => ({ ...prev, progress: 0 }));
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
            }
          },
          onend: () => {
            dispatch(markAsPlayed(musicId));
            dispatch(playNext());
          },
          onseek: () => {
            updateSeeker();
          }
        });
        howlRef.current = sound;
      } catch (error) {
        console.error('Error initializing audio:', error);
        setPlayerState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to initialize audio player'
        }));
      }
    };
  
    initializeAudio();
    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [musicId, signedToken, metadata, dispatch]);
  
  const updateSeeker = () => {
    if (!howlRef.current || isSeeking) return;
  
    setPlayerState(prev => ({
      ...prev,
      progress: howlRef.current.seek()
    }));
  
    animationFrameRef.current = requestAnimationFrame(updateSeeker);
  };

  const handleSeekChange = (e) => {
    const value = parseFloat(e.target.value);
    setPlayerState(prev => ({
      ...prev,
      progress: value
    }));
  
    if (howlRef.current && isSeeking) {
      howlRef.current.seek(value);
    }
  };

  const handleSeekMouseDown = () => {
    setIsSeeking(true);
    cancelAnimationFrame(animationFrameRef.current);
  };

  const handleSeekMouseUp = (e) => {
    const value = parseFloat(e.target.value);
    if (howlRef.current) {
      howlRef.current.seek(value);
    }
    setIsSeeking(false);
    cancelAnimationFrame(animationFrameRef.current);
    updateSeeker();
  };

  const handleNext = () => {
    dispatch(playNext());
  };

  const handlePrevious = () => {
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

  useEffect(() => {
    if (howlRef.current) {
      if (isPlaying) {
        howlRef.current.play();
      } else {
        howlRef.current.pause();
      }
    }
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
          
          {/* Slim progress bar */}
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
                onClick={togglePlayPause}
                className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-md disabled:opacity-50"
                disabled={playerState.loading}
              >
                {isPlaying ? (
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
                onClick={togglePlayPause}
                className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-md disabled:opacity-50"
                disabled={playerState.loading}
              >
                {isPlaying ? (
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

            {/* Slim Progress Bar */}
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