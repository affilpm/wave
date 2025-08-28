import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Hls from 'hls.js';
import { 
  setIsPlaying, 
  setVolume, 
  setIsMuted, 
  playNext, 
  playPrevious,
  setCurrentTime,
  setDuration,
  clearError,
  refreshStream,
  toggleShuffle,
  setRepeatMode,
  setCurrentMusic,
  fetchStreamUrl,
  selectCurrentTrack,
  selectQueueLength
} from '../../../../../slices/user/playerSlice';

// Utility function for time formatting
const formatTime = (time) => {
  if (!time || isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Enhanced ProgressBar with drag support
const ProgressBar = React.memo(({ 
  progressPercent, 
  onProgressClick, 
  progressRef,
  currentTime,
  duration 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState(0);
  
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    onProgressClick(e);
  }, [onProgressClick]);
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !progressRef.current || !duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setDragPercent(percent);
  }, [isDragging, duration]);
  
  const handleMouseUp = useCallback((e) => {
    if (isDragging) {
      setIsDragging(false);
      onProgressClick(e);
    }
  }, [isDragging, onProgressClick]);
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  const displayPercent = isDragging ? dragPercent : progressPercent;
  
  return (
    <div 
      className="w-full bg-gray-800 h-1 cursor-pointer group hover:h-2 transition-all duration-200" 
      ref={progressRef}
      onMouseDown={handleMouseDown}
    >
      <div 
        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 relative transition-all duration-100"
        style={{ width: `${displayPercent}%` }}
      >
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg" />
      </div>
      {/* Time tooltip on hover */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div 
          className="absolute top-0 transform -translate-x-1/2 -translate-y-8 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10"
          style={{ left: `${displayPercent}%` }}
        >
          {formatTime((displayPercent / 100) * duration)}
        </div>
      </div>
    </div>
  );
});

const QueueOverlay = React.memo(({ 
  showQueue, 
  queue, 
  currentMusicId, 
  isPlaying, 
  onClose, 
  onTrackSelect 
}) => {
  if (!showQueue) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-t-lg shadow-2xl max-h-64 overflow-hidden z-50">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-white font-semibold">Queue ({queue.length})</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto max-h-48">
        {queue.map((track, index) => (
          <QueueItem
            key={track.id}
            track={track}
            index={index}
            isCurrentTrack={track.id === currentMusicId}
            isPlaying={isPlaying}
            onSelect={onTrackSelect}
          />
        ))}
      </div>
    </div>
  );
});

const QueueItem = React.memo(({ 
  track, 
  index, 
  isCurrentTrack, 
  isPlaying, 
  onSelect 
}) => (
  <div 
    onClick={() => onSelect(track)}
    className={`p-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800 last:border-b-0 flex items-center space-x-3 ${
      isCurrentTrack ? 'bg-gray-800 border-l-4 border-blue-500' : ''
    }`}
  >
    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
      {isCurrentTrack && isPlaying ? (
        <div className="flex items-center space-x-0.5">
          <div className="w-1 h-3 bg-white rounded animate-pulse"></div>
          <div className="w-1 h-4 bg-white rounded animate-pulse" style={{animationDelay: '0.1s'}}></div>
          <div className="w-1 h-2 bg-white rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
        </div>
      ) : (
        <span className="text-xs text-white font-bold">{index + 1}</span>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white text-sm font-medium truncate">
        {track.name}
      </p>
      <p className="text-gray-400 text-xs truncate">
        {track.artist}
        {track.album && (
          <>
            <span className="mx-1">•</span>
            {track.album}
          </>
        )}
      </p>
      {track.duration > 0 && (
        <p className="text-gray-500 text-xs">
          {formatTime(track.duration)}
        </p>
      )}
    </div>
    {isCurrentTrack && (
      <div className="text-blue-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
    )}
  </div>
));

const ControlButton = React.memo(({ 
  onClick, 
  disabled, 
  className, 
  title, 
  children 
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={className}
    title={title}
  >
    {children}
  </button>
));

const MusicInfo = React.memo(({ 
  isLoading, 
  musicDetails, 
  currentTrack 
}) => (
  <div className="flex items-center space-x-3 min-w-0 flex-1">
    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 relative">
      {isLoading ? (
        <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <h3 className="text-sm font-semibold text-white truncate">
        {musicDetails.name || currentTrack?.name || 'Unknown Track'}
      </h3>
      <p className="text-xs text-gray-400 truncate">
        {musicDetails.artist || currentTrack?.artist || 'Unknown Artist'}
        {currentTrack?.album && (
          <>
            <span className="mx-1">•</span>
            {currentTrack.album}
          </>
        )}
      </p>
      {isLoading && (
        <p className="text-xs text-blue-400">Loading stream...</p>
      )}
    </div>
  </div>
));

const VolumeControls = React.memo(({ 
  currentTime, 
  duration, 
  isMuted, 
  volume, 
  isLoading, 
  onToggleMute, 
  onVolumeChange, 
  onRefreshStream 
}) => (
  <div className="hidden md:flex items-center space-x-3 min-w-0 flex-1 justify-end">
    <div className="flex items-center space-x-2">
      <span className="text-xs text-gray-400 tabular-nums min-w-[2.5rem] text-right">
        {formatTime(currentTime)}
      </span>
      <span className="text-xs text-gray-500">/</span>
      <span className="text-xs text-gray-400 tabular-nums min-w-[2.5rem]">
        {formatTime(duration)}
      </span>
    </div>
    
    <div className="flex items-center space-x-2">
      <button
        onClick={onToggleMute}
        className="p-1 text-gray-400 hover:text-white transition-colors duration-200"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted || volume === 0 ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.23 2.63-.76 3.74-1.58L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        )}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={isMuted ? 0 : volume}
        onChange={onVolumeChange}
        className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        title={`Volume: ${Math.round(volume * 100)}%`}
      />
      <button
        onClick={onRefreshStream}
        disabled={isLoading}
        className="p-1 text-gray-400 hover:text-white transition-colors duration-200 disabled:opacity-50"
        title="Refresh Stream"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
      </button>
    </div>
  </div>
));

const ErrorDisplay = React.memo(({ error, onClearError }) => {
  if (!error) return null;

  return (
    <div className="mt-2 flex items-center justify-center">
      <div className="flex items-center space-x-2 px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg max-w-md">
        <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span className="text-sm text-red-300 truncate">{error}</span>
        <button
          onClick={onClearError}
          className="ml-2 text-red-400 hover:text-red-300 flex-shrink-0"
          title="Dismiss"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>
  );
});

const QualityInfo = React.memo(({ qualityInfo }) => {
  if (!qualityInfo.served) return null;

  return (
    <div className="mt-2 flex items-center justify-center">
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <span>Quality:</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          qualityInfo.matched 
            ? 'bg-green-900/50 text-green-300 border border-green-700' 
            : 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
        }`}>
          {qualityInfo.served}
        </span>
        {qualityInfo.preferred && qualityInfo.served !== qualityInfo.preferred && (
          <>
            <span className="text-gray-600">•</span>
            <span>Preferred: {qualityInfo.preferred}</span>
          </>
        )}
      </div>
    </div>
  );
});

const MusicPlayer = () => {
  const dispatch = useDispatch();
  
  // Memoized selector to prevent unnecessary re-renders
  const playerState = useSelector(state => state.player, (prev, next) => {
    // Custom equality check for performance
    return (
      prev.currentMusicId === next.currentMusicId &&
      prev.isPlaying === next.isPlaying &&
      prev.volume === next.volume &&
      prev.isMuted === next.isMuted &&
      prev.isShuffled === next.isShuffled &&
      prev.repeatMode === next.repeatMode &&
      prev.streamUrl === next.streamUrl &&
      prev.isLoading === next.isLoading &&
      prev.error === next.error &&
      prev.currentTime === next.currentTime &&
      prev.duration === next.duration &&
      JSON.stringify(prev.queue) === JSON.stringify(next.queue) &&
      JSON.stringify(prev.musicDetails) === JSON.stringify(next.musicDetails) &&
      JSON.stringify(prev.qualityInfo) === JSON.stringify(next.qualityInfo)
    );
  });
  
  const {
    currentMusicId,
    queue,
    isPlaying,
    volume,
    isMuted,
    isShuffled,
    repeatMode,
    streamUrl,
    musicDetails,
    qualityInfo,
    isLoading,
    error,
    currentTime,
    duration
  } = playerState;

  // Get current track from selector
  const currentTrack = useSelector(selectCurrentTrack);
  const queueLength = useSelector(selectQueueLength);

  const audioRef = useRef(null);
  const hlsRef = useRef(null);
  const progressRef = useRef(null);
  const [showQueue, setShowQueue] = useState(false);

  // Memoized calculations
  const progressPercent = useMemo(() => {
    if (!duration || duration <= 0 || !isFinite(currentTime)) return 0;
    return Math.max(0, Math.min(100, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  const repeatModes = useMemo(() => ['none', 'all', 'single'], []);

  // Fetch stream URL when music changes
  useEffect(() => {
    if (currentMusicId && !streamUrl && !isLoading) {
      dispatch(fetchStreamUrl(currentMusicId));
    }
  }, [currentMusicId, streamUrl, isLoading, dispatch]);

  // Cleanup HLS instance
  const cleanup = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying HLS:', e);
      }
      hlsRef.current = null;
    }
  }, []);

  // Memoized event handlers
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      dispatch(setDuration(audioRef.current.duration || 0));
    }
  }, [dispatch]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current && !audioRef.current.seeking) {
      const currentTime = audioRef.current.currentTime || 0;
      dispatch(setCurrentTime(currentTime));
    }
  }, [dispatch]);

  const handleEnded = useCallback(() => {
    dispatch(setIsPlaying(false));
    
    if (repeatMode === 'single' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        dispatch(setIsPlaying(true));
      }).catch(err => {
        console.error('Repeat play error:', err);
      });
    } else {
      dispatch(playNext());
    }
  }, [dispatch, repeatMode]);

  const handlePlay = useCallback(() => dispatch(setIsPlaying(true)), [dispatch]);
  const handlePause = useCallback(() => dispatch(setIsPlaying(false)), [dispatch]);
  const handleError = useCallback((e) => {
    console.error('Audio error:', e.target?.error);
    dispatch(setIsPlaying(false));
  }, [dispatch]);

  // Setup audio stream - FIXED: Only runs when streamUrl or currentMusicId changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!streamUrl || !audio) return;

    console.log('Setting up audio stream:', streamUrl);
    
    cleanup();

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(audio);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS Manifest parsed successfully');
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        if (data.fatal) {
          if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR && 
              data.response?.code === 403) {
            dispatch(refreshStream());
          } else {
            dispatch(setIsPlaying(false));
          }
        }
      });
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = streamUrl;
    }

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      // Cleanup listeners only - don't cleanup HLS here
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [streamUrl, currentMusicId]); // FIXED: Removed isPlaying from dependencies

  // Handle volume and mute changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.volume = volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  // Handle play/pause from Redux state - FIXED: Separated from stream setup
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !streamUrl) return;

    if (isPlaying && audio.paused) {
      audio.play().catch((err) => {
        console.warn('Play failed:', err);
        if (err.name !== 'AbortError') {
          dispatch(setIsPlaying(false));
        }
      });
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying, streamUrl, dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Progress click handler
  const handleProgressClick = useCallback((e) => {
    if (!progressRef.current || !duration || duration <= 0) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percent * duration;
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      dispatch(setCurrentTime(newTime));
    }
  }, [duration, dispatch]);

  // Control handlers
  const togglePlay = useCallback(() => {
    if (!currentMusicId) return;
    dispatch(setIsPlaying(!isPlaying));
  }, [currentMusicId, isPlaying, dispatch]);

  const handleNext = useCallback(() => {
    if (queueLength > 1) {
      dispatch(playNext());
    }
  }, [queueLength, dispatch]);

  const handlePrevious = useCallback(() => {
    if (queueLength > 1) {
      dispatch(playPrevious());
    }
  }, [queueLength, dispatch]);

  const toggleMute = useCallback(() => {
    dispatch(setIsMuted(!isMuted));
  }, [isMuted, dispatch]);

  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    dispatch(setVolume(newVolume));
  }, [dispatch]);

  const handleTrackSelect = useCallback((track) => {
    dispatch(setCurrentMusic(track));
    setShowQueue(false);
  }, [dispatch]);

  const handleQueueClose = useCallback(() => {
    setShowQueue(false);
  }, []);

  const toggleShuffle_ = useCallback(() => {
    dispatch(toggleShuffle());
  }, [dispatch]);

  const handleRepeatModeChange = useCallback(() => {
    const currentIndex = repeatModes.indexOf(repeatMode);
    const nextMode = repeatModes[(currentIndex + 1) % repeatModes.length];
    dispatch(setRepeatMode(nextMode));
  }, [repeatMode, repeatModes, dispatch]);

  const handleRefreshStream = useCallback(() => {
    dispatch(refreshStream());
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const toggleQueueVisibility = useCallback(() => {
    setShowQueue(prev => !prev);
  }, []);

  // Don't render if no music is selected
  if (!currentMusicId) {
    return (
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-t border-gray-700">
        <div className="px-4 py-4 text-center">
          <p className="text-gray-400 text-sm">Select a track to start playing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <QueueOverlay
        showQueue={showQueue}
        queue={queue}
        currentMusicId={currentMusicId}
        isPlaying={isPlaying}
        onClose={handleQueueClose}
        onTrackSelect={handleTrackSelect}
      />

      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-t border-gray-700 backdrop-blur-sm">
        <audio ref={audioRef} preload="metadata" />
        
        <ProgressBar
          progressPercent={progressPercent}
          onProgressClick={handleProgressClick}
          progressRef={progressRef}
          currentTime={currentTime}
          duration={duration}
        />

        <div className="px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <MusicInfo
              isLoading={isLoading}
              musicDetails={musicDetails}
              currentTrack={currentTrack}
            />

            {/* Control Buttons */}
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Queue Button */}
              <ControlButton
                onClick={toggleQueueVisibility}
                className={`p-2 rounded transition-colors duration-200 ${
                  showQueue 
                    ? 'text-blue-400 bg-blue-400/20' 
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Show Queue"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                </svg>
              </ControlButton>

              {/* Shuffle Button */}
              <ControlButton
                onClick={toggleShuffle_}
                className={`p-2 rounded transition-colors duration-200 ${
                  isShuffled 
                    ? 'text-blue-400 bg-blue-400/20' 
                    : 'text-gray-400 hover:text-white'
                }`}
                title={isShuffled ? 'Shuffle On' : 'Shuffle Off'}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                </svg>
              </ControlButton>

              <ControlButton
                onClick={handlePrevious}
                className="p-2 text-gray-400 hover:text-white transition-colors duration-200 disabled:opacity-50"
                disabled={queueLength <= 1}
                title="Previous"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18V6h2v12H6zm3-4.5V18l8-6-8-6v4.5z"/>
                </svg>
              </ControlButton>

              <ControlButton
                onClick={togglePlay}
                disabled={!streamUrl && isLoading}
                className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </ControlButton>

              <ControlButton
                onClick={handleNext}
                className="p-2 text-gray-400 hover:text-white transition-colors duration-200 disabled:opacity-50"
                disabled={queueLength <= 1}
                title="Next"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 18V6h-2v12h2zm-3-4.5V18l-8-6 8-6v4.5z"/>
                </svg>
              </ControlButton>

              {/* Repeat Button */}
              <ControlButton
                onClick={handleRepeatModeChange}
                className={`p-2 rounded transition-colors duration-200 ${
                  repeatMode !== 'none' 
                    ? 'text-blue-400 bg-blue-400/20' 
                    : 'text-gray-400 hover:text-white'
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  {repeatMode === 'single' ? (
                    <>
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7z"/>
                      <path d="M17 17H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                      <text x="12" y="16" fontSize="8" textAnchor="middle" fill="currentColor">1</text>
                    </>
                  ) : (
                    <>
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7z"/>
                      <path d="M17 17H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                    </>
                  )}
                </svg>
              </ControlButton>
            </div>

            <VolumeControls
              currentTime={currentTime}
              duration={duration}
              isMuted={isMuted}
              volume={volume}
              isLoading={isLoading}
              onToggleMute={toggleMute}
              onVolumeChange={handleVolumeChange}
              onRefreshStream={handleRefreshStream}
            />
          </div>

          <QualityInfo qualityInfo={qualityInfo} />
          <ErrorDisplay error={error} onClearError={handleClearError} />
        </div>
        
        <style>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          .slider::-moz-range-thumb {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}</style>
      </div>
    </div>
  );
};

export default MusicPlayer;