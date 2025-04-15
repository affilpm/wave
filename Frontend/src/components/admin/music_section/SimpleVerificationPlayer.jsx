import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertCircle } from 'lucide-react';

const SimpleVerificationPlayer = ({ audioUrl, isPlaying, onPlayToggle, musicId }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const secureUrlRef = useRef(null);

  // Modified function to work with your CSP
  const createSecureMediaUrl = (url) => {
    return new Promise((resolve, reject) => {
      // Check if URL is already a blob URL
      if (url.startsWith('blob:')) {
        resolve(url);
        return;
      }
      
      // If the URL is from S3, use the proxy or direct connection based on CSP
      try {
        // Option 1: Use proxy path if set up
        const proxyUrl = url.replace('https://wavebuckt12.s3.amazonaws.com', '/s3-media');
        
        fetch(proxyUrl, {
          credentials: 'omit',
          mode: 'cors',
        })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch audio: ${response.status}`);
            }
            return response.blob();
          })
          .then(blob => {
            const secureUrl = URL.createObjectURL(blob);
            resolve(secureUrl);
          })
          .catch(error => {
            console.error('Error creating secure URL:', error);
            reject(error);
          });
      } catch (error) {
        console.error('Error in createSecureMediaUrl:', error);
        reject(error);
      }
    });
  };

  // Load and secure the audio URL
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    const loadSecureAudio = async () => {
      try {
        // Use the modified createSecureMediaUrl function
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
          setError('Failed to load audio file');
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
  }, [audioUrl]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!audioRef.current || loading || error) return;

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing audio:', error);
          setError('Playback failed. Please try again.');
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
    setError('Failed to play audio file');
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
    
    // Force reload of audio
    if (audioRef.current) {
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
          className="text-xs text-red-600 dark:text-red-400 hover:text-red-500 font-medium"
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