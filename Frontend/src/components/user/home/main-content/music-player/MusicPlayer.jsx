import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import Hls from 'hls.js';
import { debounce } from 'lodash'; 
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
  setCurrentMusic,
  selectCurrentTrack,
  selectQueueLength,
  selectNextTrack,
  selectPreviousTrack
} from "../../../../../slices/user/playerSlice";
import ProgressBar from './ProgressBar';
import QualityInfo from './QualityInfo';
import QueueOverlay from './QueueOverlay';
import VolumeControls from './VolumeControls';
import MusicInfo from './MusicInfo';
import ControlButton from './ControlButton';
import ErrorDisplay from './ErrorDisplay';
import DeviceAudioControl from './DeviceAudioControl';

const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentMusicId: player?.currentMusicId,
    isPlaying: player?.isPlaying || false,
    volume: player?.volume || 1,
    isMuted: player?.isMuted || false,
    isShuffled: player?.isShuffled || false,
    streamUrl: player?.streamUrl,
    isLoading: player?.isLoading || false,
    error: player?.error,
    currentTime: player?.currentTime || 0,
    duration: player?.duration || 0,
    queue: player?.queue || [],
    musicDetails: player?.musicDetails || {},
    qualityInfo: player?.qualityInfo || {}
  })
);

const MusicPlayer = () => {
  const dispatch = useDispatch();
  const playerState = useSelector(selectPlayerState);
  const {
    currentMusicId,
    queue,
    isPlaying,
    volume,
    isMuted,
    isShuffled,
    streamUrl,
    musicDetails,
    qualityInfo,
    isLoading,
    error,
    currentTime,
    duration
  } = playerState;

  const currentTrack = useSelector(selectCurrentTrack);
  const queueLength = useSelector(selectQueueLength);
  const nextTrack = useSelector(selectNextTrack);
  const previousTrack = useSelector(selectPreviousTrack);

  const audioRef = useRef(null);
  const hlsRef = useRef(null);
  const progressRef = useRef(null);
  const [showQueue, setShowQueue] = useState(false);

  const progressPercent = useMemo(() => {
    if (!duration || duration <= 0 || !isFinite(currentTime)) return 0;
    return Math.max(0, Math.min(100, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  const canPlayNext = Boolean(nextTrack);
  const canPlayPrevious = Boolean(previousTrack);

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
    console.log('Track ended, checking for next track...');
    dispatch(playNext());
  }, [dispatch]);

  const handlePlay = useCallback(() => dispatch(setIsPlaying(true)), [dispatch]);
  const handlePause = useCallback(() => dispatch(setIsPlaying(false)), [dispatch]);
  const handleError = useCallback((e) => {
    console.error('Audio error:', e.target?.error);
    dispatch(setIsPlaying(false));
  }, [dispatch]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!streamUrl || !audio) return;

    let hasRecordedComplete = false;

    audio.pause();
    audio.currentTime = 0;
    audio.src = '';

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

    const handleTimeUpdateWithComplete = () => {
      handleTimeUpdate();
      if (!hasRecordedComplete && audio.currentTime >= 30) {
        dispatch({ type: "player/trackCompleted" });
        hasRecordedComplete = true;
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdateWithComplete);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdateWithComplete);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
      audio.currentTime = 0;
      cleanup();
    };
  }, [streamUrl, currentMusicId, handleLoadedMetadata, handleTimeUpdate, handleEnded, handlePlay, handlePause, handleError, dispatch, cleanup]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.volume = volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

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

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

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

  const togglePlay = useCallback(() => {
    if (!currentMusicId) return;
    dispatch(setIsPlaying(!isPlaying));
  }, [currentMusicId, isPlaying, dispatch]);

  const debouncedHandleNext = useCallback(
    debounce(() => {
      if (canPlayNext) {
        dispatch(playNext());
      } else {
        dispatch(playNext());
      }
    }, 300),
    [canPlayNext, dispatch]
  );

  const debouncedHandlePrevious = useCallback(
    debounce(() => {
      if (canPlayPrevious) {
        dispatch(playPrevious());
      }
    }, 300),
    [canPlayPrevious, dispatch]
  );

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

  const handleRefreshStream = useCallback(() => {
    dispatch(refreshStream());
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const toggleQueueVisibility = useCallback(() => {
    setShowQueue(prev => !prev);
  }, []);

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
        <audio ref={audioRef} preload="metadata" onEnded={() => dispatch({ type: "player/trackCompleted" })}/>

        <DeviceAudioControl
          audioRef={audioRef}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          volume={volume}
          isMuted={isMuted}
          currentTime={currentTime}
          duration={duration}
        />
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

            <div className="flex items-center space-x-2 md:space-x-3">
              <ControlButton
                onClick={toggleQueueVisibility}
                className={`p-2 rounded transition-colors duration-200 ${
                  showQueue 
                    ? 'text-blue-400 bg-blue-400/20' 
                    : 'text-gray-400 hover:text-white'
                }`}
                title={`${showQueue ? 'Hide' : 'Show'} Queue (${queueLength} tracks)`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                </svg>
              </ControlButton>

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
                onClick={debouncedHandlePrevious}
                className="p-2 text-gray-400 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canPlayPrevious}
                title={canPlayPrevious ? 'Previous' : 'No previous track'}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18V6h2v12H6zm3-4.5V18l8-6-8-6v4.5z"/>
                </svg>
              </ControlButton>

              <ControlButton
                onClick={togglePlay}
                disabled={isLoading && !streamUrl}
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
                onClick={debouncedHandleNext}
                className="p-2 text-gray-400 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={false}
                title={canPlayNext ? `Next: ${nextTrack?.name}` : 'Go to first track'}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 18V6h-2v12h2zm-3-4.5V18l-8-6 8-6v4.5z"/>
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

          {queueLength > 1 && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              {isShuffled ? 'Shuffled' : 'Linear'} playback • 
              Track {queue.findIndex(t => t.id === currentMusicId) + 1} of {queueLength}
              {nextTrack && (
                <>
                  {' '} • Next: <span className="text-gray-400">{nextTrack.name}</span>
                </>
              )}
              {!nextTrack && queueLength > 0 && (
                <span className="text-orange-400">
                  {' '} • {isPlaying ? 'Last track - next will restart queue' : 'At start of queue'}
                </span>
              )}
            </div>
          )}

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

