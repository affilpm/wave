import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertCircle } from 'lucide-react';

const SimpleVerificationPlayer = ({ audioUrl, isPlaying, onPlayToggle, musicId }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const audioRef = useRef(null);
  const secureUrlRef = useRef(null);

  // Create a secure URL for the audio file
  const createSecureMediaUrl = (url) => {
    return new Promise((resolve, reject) => {
      // Check if URL is already a blob URL
      if (url.startsWith('blob:')) {
        resolve(url);
        return;
      }
      
      // Create a proxy URL that works with our backend
      let proxyUrl;
      
      if (url.includes('s3.amazonaws.com')) {
        // Extract the path after the bucket name
        const s3UrlParts = url.split('s3.amazonaws.com/');
        if (s3UrlParts.length > 1) {
          // Use the path after the bucket name
          proxyUrl = `/s3-media/${s3UrlParts[1]}`;
        } else {
          // Fallback - use the original URL but with the /s3-media prefix
          const urlParts = url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          proxyUrl = `/s3-media/media/music/${fileName}`;
        }
      } else if (url.startsWith('/')) {
        // If it's already a relative URL, use it as is
        proxyUrl = url;
      } else {
        // Default case - if it's not an S3 URL and not a relative URL
        proxyUrl = `/s3-media/${url}`;
      }
      
      console.log('Fetching audio from:', proxyUrl);
      
      fetch(proxyUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          // Create a blob URL for the audio
          const secureUrl = URL.createObjectURL(blob);
          resolve(secureUrl);
        })
        .catch(error => {
          console.error('Error creating secure URL:', error);
          reject(error);
        });
    });
  };

  // Load and secure the audio URL
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    const loadSecureAudio = async () => {
      try {
        const secureUrl = await createSecureMediaUrl(audioUrl);
        
        if (isMounted) {
          secureUrlRef.current = secureUrl;
          if (audioRef.current) {
            audioRef.current.src = secureUrl;
            audioRef.current.load();
          }
        }
      } catch (err) {
        console.error('Failed to load audio:', err);
        if (isMounted) {
          setError(`Failed to load audio: ${err.message}`);
          setLoading(false);
        }
      }
    };

    if (audioUrl) {
      loadSecureAudio();
    }

    return () => {
      isMounted = false;
      // Clean up blob URL when component unmounts
      if (secureUrlRef.current) {
        URL.revokeObjectURL(secureUrlRef.current);
      }
    };
  }, [audioUrl, retryCount]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!audioRef.current || loading || error) return;

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing audio:', error);
          setError(`Playback failed: ${error.message}`);
          // Update the UI state to reflect playback failure
          onPlayToggle(musicId, audioUrl);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, loading, error, audioUrl, musicId, onPlayToggle]);

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
    // When the audio ends, notify the parent to update playing state
    onPlayToggle(musicId, audioUrl);
    setCurrentTime(0);
  };

  const handleError = (e) => {
    console.error("Audio error:", e);
    
    // Extract detailed error information if available
    let errorMessage = 'Failed to play audio file';
    
    if (audioRef.current && audioRef.current.error) {
      const mediaError = audioRef.current.error;
      switch (mediaError.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Playback aborted';
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
    // Increment retry count to trigger the useEffect
    setRetryCount(prevCount => prevCount + 1);
    
    // Reset state
    setError(null);
    setLoading(true);
    
    // Clean up any existing blob URL
    if (secureUrlRef.current) {
      URL.revokeObjectURL(secureUrlRef.current);
      secureUrlRef.current = null;
    }
    
    // Clear the audio source
    if (audioRef.current) {
      audioRef.current.src = "";
      audioRef.current.load();
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
        <button 
          onClick={handleRetry}
          className="text-xs bg-red-100 dark:bg-red-800 px-2 py-1 rounded text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-700 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3 flex items-center gap-3">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onCanPlay={() => setLoading(false)}
        onError={handleError}
        crossOrigin="anonymous"
      />

      <button
        type="button"
        onClick={() => onPlayToggle(musicId, audioUrl)}
        className={`p-2 rounded-full ${
          isPlaying ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'
        } hover:bg-blue-200 dark:hover:bg-blue-900/50 focus:outline-none transition-colors`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        disabled={loading}
      >
        {loading ? (
          <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        ) : isPlaying ? (
          <Pause className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <Play className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        )}
      </button>

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
  );
};

export default SimpleVerificationPlayer;