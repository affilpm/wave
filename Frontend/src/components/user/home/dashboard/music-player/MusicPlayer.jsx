import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, SkipBack, Shuffle, SkipForward, Volume1, Music2, List, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import api from "../../../../../api";
import {   
  setMusicId,
  setIsPlaying,
  setChangeComplete,
  setQueue,
  addToQueue,
  removeFromQueue,
  clearQueue,
  playNext,
  playPrevious,
  toggleShuffle,
  setRepeat,
  moveTrack,
  markAsPlayed 
} from "../../../../../slices/user/musicPlayerSlice";
 
const MusicPlayer = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(100);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isSourceLoaded, setIsSourceLoaded] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [currentBlobUrl, setCurrentBlobUrl] = useState(null);
  const dispatch = useDispatch();
  const audioRef = useRef(null);
  const loadingRef = useRef(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const MAX_RETRY_ATTEMPTS = 3;
  const [sourceLoadingState, setSourceLoadingState] = useState('idle'); // 'idle' | 'loading' | 'loaded' | 'error'
  
  const { musicId, isPlaying, isChanging, queue, currentIndex, repeat, shuffle, playedTracks } = useSelector((state) => state.musicPlayer);
  
  
  const handleError = async (error) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (loadAttempts < MAX_RETRY_ATTEMPTS) {
      setLoadAttempts(prev => prev + 1);
      setError(`Retrying... Attempt ${loadAttempts + 1}/${MAX_RETRY_ATTEMPTS}`);
      
      // Reset audio element
      audio.pause();
      audio.src = '';
      audio.load();
      
      // Clean up the current blob URL
      cleanupBlobUrl();

      // Trigger a new load attempt
      setSourceLoadingState('idle');
    } else {
      setError('Failed to load audio after multiple attempts');
      setIsLoading(false);
      setIsAudioReady(false);
      setSourceLoadingState('error');
      dispatch(setIsPlaying(false));
      setLoadAttempts(0);
    }
  };


  const handleEnded = () => {
      console.log("Queue before handleEnded:", queue, "Current Index:", currentIndex);
    
      if (!queue || queue.length === 0) {
        console.warn("Queue is empty in handleEnded.");
        // Remove setting isPlaying to false
        return;
      }
    
      if (currentIndex < 0 || currentIndex >= queue.length) {
        console.warn("Invalid queue state in handleEnded:", { queue, currentIndex });
        // Remove setting isPlaying to false
        return;
      }
    
      const currentTrack = queue[currentIndex];
      if (!currentTrack?.id) {
        console.warn("Invalid track data in handleEnded:", currentTrack);
        // Remove setting isPlaying to false
        return;
      }
    
      dispatch(markAsPlayed(currentTrack.id));
    
      if (repeat === "one") {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(err => {
            console.error("Error replaying track:", err);
            // Only set isPlaying to false on actual playback error
            dispatch(setIsPlaying(false));
          });
        }
      } else {
        dispatch(playNext());
    
        // Ensure audio starts playing after state update
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(err => {
              console.error("Error playing next track:", err);
              // Only set isPlaying to false on actual playback error
              dispatch(setIsPlaying(false));
            });
          }
        }, 200);
      }
  };

  useEffect(() => {
    if (isChanging) {
      setIsSourceLoaded(false);
      setIsAudioReady(false);
      loadingRef.current = false;
      
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
      }
      
      // Clean up blob URL
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        setCurrentBlobUrl(null);
      }
      
      dispatch(setChangeComplete());
    }
  }, [isChanging, dispatch, currentBlobUrl]);
  



  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.removeAttribute('src');
        audio.load();
      }
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, []);




  const blobUrlRef = useRef(null);
  const setupInProgressRef = useRef(false);

  // Improved blob URL cleanup
  const cleanupBlobUrl = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };




  // Fetch metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!musicId) return;
      
      try {
        const { data } = await api.get(`/api/music/metadata/${musicId}/`);
        setMetadata(data);
        setDuration(data.duration);
      } catch (err) {
        console.error("Metadata fetch error:", err);
        setError("Failed to load track information");
      }
    };

    fetchMetadata();
  }, [musicId]);




  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !musicId || sourceLoadingState !== 'idle' || setupInProgressRef.current) return;

    const setupAudioSource = async () => {
      setupInProgressRef.current = true;
      const wasPlaying = isPlaying; // Store play state before changing source
      
      try {
        setSourceLoadingState('loading');
        setIsLoading(true);
        setIsAudioReady(false);

        // Pause any current playback
        audio.pause();
        
        // Clean up existing blob URL before creating new one
        cleanupBlobUrl();

        const response = await api.get(`/api/music/stream/${musicId}/`, {
          responseType: 'blob',
          timeout: 15000
        });

        if (!response?.data) {
          throw new Error('No audio data received');
        }

        const blob = new Blob([response.data], { type: 'audio/mpeg' });
        const newBlobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = newBlobUrl;

        // Create a promise to handle audio loading
        const loadingPromise = new Promise((resolve, reject) => {
          const loadTimeout = setTimeout(() => {
            reject(new Error('Audio loading timeout'));
          }, 10000);

          const handleCanPlay = () => {
            clearTimeout(loadTimeout);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleLoadError);
            resolve();
          };

          const handleLoadError = (error) => {
            clearTimeout(loadTimeout);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleLoadError);
            reject(error);
          };

          audio.addEventListener('canplay', handleCanPlay);
          audio.addEventListener('error', handleLoadError);
        });

        // Set the source and load
        audio.src = blobUrlRef.current;
        await audio.load();
        
        // Wait for the audio to be ready
        await loadingPromise;

        setIsAudioReady(true);
        setIsLoading(false);
        setSourceLoadingState('loaded');
        setError(null);

        // Resume playback if it was playing before
        if (wasPlaying) {
          try {
            await audio.play();
            dispatch(setIsPlaying(true));
          } catch (playError) {
            console.error("Playback start error:", playError);
            dispatch(setIsPlaying(false));
          }
        }

      } catch (error) {
        console.error("Audio setup error:", error);
        handleError(error);
      } finally {
        setupInProgressRef.current = false;
      }
    };

    setupAudioSource();

    // Cleanup function
    return () => {
      if (audio) {
        audio.pause();
        if (audio.src !== blobUrlRef.current) {
          audio.src = '';
          audio.load();
        }
      }
    };
  }, [musicId, sourceLoadingState]);


  // Handle component unmount and cleanup
  useEffect(() => {
    return () => {
      cleanupBlobUrl();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.load();
      }
    };  }, []);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsLoading(false);
    };
    


    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };








    const handleError = (e) => {
      // console.error('Audio error:', e);
      setError('Failed to load audio. Please try again.');
      setIsLoading(false);
      dispatch(setIsPlaying(false));
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', () => handleEnded());
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', () => handleEnded());
      audio.removeEventListener('error', handleError);
    };
  }, [dispatch]);





  // Handle play/pause state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isAudioReady) return;

    const handlePlay = () => {
      if (!audioRef.current) return;
      if (!audioRef.current.src || audioRef.current.src === "blob:") {
        console.error("Audio source is empty or invalid.");
        return;
      }
      audioRef.current.play().catch((err) => console.error("Playback error:", err));
    };




    const handlePause = () => {
      if (!isPlaying && audio.paused) return;
      audio.pause();
    };

    if (isPlaying) {
      handlePlay();
    } else {
      handlePause();
    }
  }, [isPlaying, isAudioReady, dispatch]);






  const togglePlay = async () => {
    if (!audioRef.current || !isAudioReady) {
      setError("Audio is not ready to play.");
      return;
    }

    try {
      if (!isPlaying) {
        await audioRef.current.play();
        dispatch(setIsPlaying(true));
      } else {
        audioRef.current.pause();
        dispatch(setIsPlaying(false));
      }
    } catch (err) {
      console.error("Playback toggle error:", err);
      setError("Failed to toggle playback");
      dispatch(setIsPlaying(false));
    }
  };





  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };





  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX size={20} />;
    if (volume < 50) return <Volume1 size={20} />;
    return <Volume2 size={20} />;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 backdrop-blur-lg bg-black/30 border-t border-white/10">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between p-3 relative">
          {/* Track Info */}
          <div className="flex items-center space-x-4 w-1/4">
            {metadata ? (
              <>
                <div className="relative group">
                  {metadata?.cover_photo ? (
                    <img
                      src={metadata.cover_photo}
                      alt={metadata.title}
                      className="w-14 h-14 rounded-xl shadow-lg group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center">
                      <Music2 size={24} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="font-medium text-sm text-white hover:underline cursor-pointer">
                    {metadata.title}
                  </h3>
                  <p className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
                    {metadata.artist}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2 text-gray-400">
                <Music2 size={24} />
                <span className="text-sm">No track selected</span>
              </div>
            )}
          </div>

          {/* Player Controls */}
          <div className="flex flex-col items-center flex-1 max-w-2xl px-4">
            <div className="flex items-center space-x-6 mb-3">
                <button
                  onClick={() => dispatch(toggleShuffle())}
                  className={`p-2 rounded-full ${shuffle ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Shuffle size={16} />
                </button>
                <button
                onClick={() => dispatch(playPrevious())}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipBack size={20} />
              </button>
              <button
      onClick={togglePlay}
      className="bg-white rounded-full p-2 hover:scale-105 transition-all hover:bg-green-400"
      disabled={!isAudioReady}
    >
      {isLoading || isBuffering ? (
        <div className="w-6 h-6 border-2 border-black rounded-full animate-spin" />
      ) : isPlaying || (!audioRef.current?.paused && isAudioReady) ? (
        <Pause size={24} className="text-black" />
      ) : (
        <Play size={24} className="text-black" />
      )}
    </button>


              <button
                onClick={() => dispatch(playNext())}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipForward size={20} />
              </button>

              <button
                onClick={() => {
                  const nextRepeat = repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none';
                  dispatch(setRepeat(nextRepeat));
                }}
                className={`p-2 rounded-full ${repeat !== 'none' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <RotateCcw size={16} />
              </button>
              {/* <button 
                onClick={() => setIsPlaylistOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button> */}

            </div>

            {/* Progress Bar */}
            <div className="w-full flex items-center space-x-3 text-xs">
              <span className="text-gray-400">{formatTime(currentTime)}</span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={(e) => {
                    const audio = audioRef.current;
                    if (!audio) return;
                    const time = Number(e.target.value);
                    audio.currentTime = time;
                    setCurrentTime(time);
                  }}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white hover:accent-green-400"
                />
              </div>
              <span className="text-gray-400">{formatTime(duration)}</span>
            </div>
          </div>


          {/* Volume and Additional Controls */}
          <div className="flex items-center justify-end space-x-4 w-1/4">
            <div className="group relative flex items-center">
              <button 
                onClick={() => {
                  const newVolume = volume === 0 ? 100 : 0;
                  setVolume(newVolume);
                  if (audioRef.current) {
                    audioRef.current.volume = newVolume / 100;
                  }
                }}
                className="text-gray-400 group-hover:text-white transition-colors"
              >
                {getVolumeIcon()}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => {
                  const newVolume = Number(e.target.value);
                  setVolume(newVolume);
                  if (audioRef.current) {
                    audioRef.current.volume = newVolume / 100;
                  }
                }}
                className="w-0 group-hover:w-20 origin-right transition-all duration-200 h-1 mx-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white hover:accent-green-400"
              />
            </div>
            <button
              onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {/* Playlist Panel */}
      {/* Updated Playlist Panel */}
      {isPlaylistOpen && (
        <div className="absolute bottom-full right-0 w-96 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-t-xl p-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Queue</h2>
            <button 
              onClick={() => setIsPlaylistOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Currently Playing */}
          {queue[currentIndex] && (
            <div className="mb-4">
              <h3 className="text-sm text-gray-400 mb-2">Now Playing</h3>
              <div className="flex items-center space-x-3 p-2 rounded-lg bg-white/10">
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                  <img
                    src={queue[currentIndex].cover_photo || "/api/placeholder/40/40"}
                    alt={queue[currentIndex].name}
                    className="w-full h-full rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-white truncate">{queue[currentIndex].name}</h3>
                  <p className="text-xs text-gray-400 truncate">{queue[currentIndex].artist}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className="bg-green-500 rounded-full p-1">
                    <Play size={16} className="text-white" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Up Next */}
          {queue.slice(currentIndex + 1).length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm text-gray-400 mb-2">Up Next</h3>
              <div className="space-y-2">
                {queue.slice(currentIndex + 1).map((track, index) => (
                  <div 
                    key={`queue-${track.id}-${index}`}
                    className="flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-white/5"
                    onClick={() => {
                      dispatch(setMusicId(track.id));
                      dispatch(setIsPlaying(true));
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                      <img
                        src={track.cover_photo || "/api/placeholder/40/40"}
                        alt={track.name}
                        className="w-full h-full rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-white truncate">{track.name}</h3>
                      <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(removeFromQueue(track.id));
                      }}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previously Played */}
          {currentIndex > 0 && (
            <div>
              <h3 className="text-sm text-gray-400 mb-2">Previously Played</h3>
              <div className="space-y-2">
                {queue.slice(0, currentIndex).reverse().map((track, index) => (
                  <div 
                    key={`played-${track.id}-${index}`}
                    className="flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-white/5 opacity-75"
                    onClick={() => {
                      dispatch(setMusicId(track.id));
                      dispatch(setIsPlaying(true));
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                      <img
                        src={track.cover_photo || "/api/placeholder/40/40"}
                        alt={track.name}
                        className="w-full h-full rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-white truncate">{track.name}</h3>
                      <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
      <audio ref={audioRef} onError={handleError} onLoadStart={() => setLoadAttempts(0)} onEnded={handleEnded}/>
    </div>
  );
};

export default MusicPlayer;