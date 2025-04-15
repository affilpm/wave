import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const SimpleSongVerificationPlayer = ({ 
  audioUrl, 
  songName = "Untitled", 
  artistName = "Unknown Artist", 
  onApprove, 
  onReject 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Error playing audio:', error);
            setError(`Playback failed: ${error.message || 'Please try again'}`);
            setIsPlaying(false);
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setLoading(false);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleError = (e) => {
    console.error("Audio error:", e);
    
    let errorMessage = 'Failed to play audio file';
    
    if (audioRef.current && audioRef.current.error) {
      const mediaError = audioRef.current.error;
      switch (mediaError.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Playback aborted by the user';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error while loading audio';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Audio decoding failed';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Audio format not supported';
          break;
        default:
          errorMessage = `Playback error: ${mediaError.message || 'Unknown error'}`;
      }
    }
    
    setError(errorMessage);
    setLoading(false);
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    
    if (audioRef.current) {
      audioRef.current.load();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onCanPlay={() => setLoading(false)}
        onError={handleError}
        crossOrigin="anonymous"
      />

      {/* Song Information */}
      <div className="mb-4">
        <h3 className="font-medium text-gray-900 dark:text-white">{songName}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{artistName}</p>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 rounded p-3 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
          <button 
            onClick={handleRetry}
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-500 font-medium"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePlayPause}
              className={`p-2 rounded-full ${
                isPlaying ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'
              } hover:bg-blue-200 dark:hover:bg-blue-900/50 focus:outline-none transition-colors`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              disabled={loading}
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <Pause className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <Play className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>

            {/* Time and Progress Bar */}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 min-w-8">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 appearance-none rounded-full bg-gray-200 dark:bg-gray-700 focus:outline-none cursor-pointer"
                disabled={loading || !duration}
                style={{
                  background: duration > 0 
                    ? `linear-gradient(to right, #3b82f6 ${(currentTime / duration) * 100}%, #e5e7eb ${(currentTime / duration) * 100}%)`
                    : undefined
                }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 min-w-8">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Verification Actions */}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onApprove}
          className="px-3 py-1.5 rounded-md flex items-center gap-1.5 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          disabled={loading || error}
        >
          <CheckCircle className="h-4 w-4" />
          <span>Approve</span>
        </button>
        <button
          type="button"
          onClick={onReject}
          className="px-3 py-1.5 rounded-md flex items-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          disabled={loading || error}
        >
          <XCircle className="h-4 w-4" />
          <span>Reject</span>
        </button>
      </div>
    </div>
  );
};

export default SimpleSongVerificationPlayer;