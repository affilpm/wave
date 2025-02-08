import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, Settings } from "lucide-react";
import apiInstance from "../../../../../api";

const musicId = 8
const MusicPlayer = ({  onError }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [audioSource, setAudioSource] = useState('');
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);

  const handleError = useCallback((errorMessage) => {
    setError(errorMessage);
    setIsLoading(false);
    if (onError) onError(errorMessage);
  }, [onError]);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      setProgress((currentTime / duration) * 100);
    }
  }, []);

  // Separate effect for audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedData = () => {
      console.log('Audio loaded successfully');
      setIsLoading(false);
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handleError = (e) => {
      console.error('Audio element error:', {
        error: e.target.error,
        currentSrc: audio.currentSrc,
        readyState: audio.readyState,
        networkState: audio.networkState,
        errorCode: audio.error?.code,
        errorMessage: audio.error?.message
      });
      handleError("Audio playback error occurred");
    };

    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('error', handleError);
    };
  }, [updateProgress, handleError]);

  // Separate effect for fetching audio source
  useEffect(() => {
    if (!musicId) {
      handleError("No music ID provided");
      return;
    }

    const fetchMusic = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiInstance.get(`/api/music/stream/${musicId}/`, {
          responseType: 'blob',
          headers: {
            'Range': 'bytes=0-',
            'Accept': '*/*'
          }
        });

        // Revoke previous object URL if it exists
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }

        // Create and store new object URL
        const newObjectUrl = URL.createObjectURL(response.data);
        objectUrlRef.current = newObjectUrl;
        setAudioSource(newObjectUrl);

      } catch (err) {
        console.error("Music fetch error:", err);
        handleError(err.response?.data?.error || err.message || "Failed to fetch music");
      }
    };

    fetchMusic();

    // Cleanup function
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setAudioSource('');
    };
  }, [musicId, handleError]);

  // Effect for handling audio source changes
  useEffect(() => {
    if (audioRef.current && audioSource) {
      audioRef.current.src = audioSource;
      audioRef.current.load();
    }
  }, [audioSource]);

  const togglePlay = async () => {
    if (!audioRef.current || isLoading || !audioSource) return;

    try {
      if (isPlaying) {
        await audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Playback error:', err);
      handleError("Playback failed. User interaction may be required.");
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || isLoading || !audioSource) return;

    const seekPosition = (e.nativeEvent.offsetX / e.target.offsetWidth) * 100;
    const seekTime = (seekPosition / 100) * audioRef.current.duration;
    
    audioRef.current.currentTime = seekTime;
    setProgress(seekPosition);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-md p-4 bg-white rounded-lg shadow">
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-600 rounded">
          {error}
          <button 
            onClick={() => window.location.reload()} 
            className="ml-2 text-red-800 hover:text-red-900"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={togglePlay} 
            disabled={isLoading || !audioSource} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-6 h-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            ) : (
              isPlaying ? <Pause size={24} /> : <Play size={24} />
            )}
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              disabled={!audioSource}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
            <button 
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              disabled={!audioSource}
            >
              <Settings size={24} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div 
            className="h-2 bg-gray-200 rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm text-gray-500">
            <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        muted={isMuted}
        className="hidden"
      />
    </div>
  );
};

export default MusicPlayer;