import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

import api from "../../../../../api";

const musicId = 2;

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    // Fetch metadata first
    const fetchMetadata = async () => {
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
    if (!audio || !musicId) return;

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

    const handleError = async (e) => {
      console.error('Audio error:', e);
      setError('Failed to load audio. Please try again.');
      setIsLoading(false);
      setIsPlaying(false);
      
      // Attempt to refresh the audio source
      try {
        const response = await api.get(`/api/music/stream/${musicId}/`, {
          responseType: 'blob'
        });
        
        const blob = new Blob([response.data], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        audio.src = url;
      } catch (err) {
        console.error("Stream fetch error:", err);
        setError("Failed to load audio stream");
      }
    };

    // Set up event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);
    // Initial setup of audio source using API instance
    const setupAudioSource = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/music/stream/${musicId}/`, {
          responseType: 'blob'
        });
    
        if (!response.data) {
          setError("Failed to load audio stream");
          return;
        }
    
        const blob = new Blob([response.data], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        audioRef.current.src = url;
    
        audioRef.current.load();
        setIsLoading(false);
      } catch (err) {
        console.error("Initial stream setup error:", err);
        setError("Failed to initialize audio stream");
        setIsLoading(false);
      }
    };

    setupAudioSource();

    return () => {
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();  // Ensures previous instance is properly reset
      }
      // Cleanup event listeners
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
    
      // Cleanup blob URL
      if (audio.src && audio.src.startsWith("blob:")) {
        URL.revokeObjectURL(audio.src);
      }
    };
  }, [musicId]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || isNaN(audio.duration) || !isFinite(audio.duration)) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * audio.duration;
    
    if (isFinite(newTime)) {
      audio.currentTime = newTime;
      setProgress(pos * 100);
    }
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) {
      setError("Audio source is not loaded.");
      return;
    }
  
    try {
      if (isPlaying) {
        await audio.pause();
      } else {
        await audio.play();
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.error("Playback error:", err);
      setError("Error controlling playback");
    }
  };
  console.log('Audio Duration:', audioRef.current?.duration);

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow p-6">
      <div className="space-y-4">
        {/* Title and Artist */}
        {metadata && (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">{metadata.title}</h3>
            <p className="text-sm text-gray-500">{metadata.artist}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-red-500 text-sm text-center py-2">
            {error}
          </div>
        )}

        {/* Progress Bar */}
        <div className="relative">
          <div 
            ref={progressRef}
            className="h-2 bg-gray-200 rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="absolute h-full bg-blue-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Time Display */}
        <div className="flex justify-between text-sm text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4">
          <button 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            onClick={() => {
              const audio = audioRef.current;
              if (audio) audio.currentTime -= 10;
            }}
          >
            <SkipBack className="w-6 h-6 text-gray-700" />
          </button>

          <button 
            className="p-3 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors"
            onClick={togglePlay}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white" />
            )}
          </button>

          <button 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            onClick={() => {
              const audio = audioRef.current;
              if (audio) audio.currentTime += 10;
            }}
          >
            <SkipForward className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            onClick={() => {
              const audio = audioRef.current;
              if (audio) {
                setIsMuted(!isMuted);
                audio.muted = !isMuted;
              }
            }}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-gray-700" />
            ) : (
              <Volume2 className="w-5 h-5 text-gray-700" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            className="w-full"
            onChange={(e) => {
              const audio = audioRef.current;
              if (audio) {
                const newVolume = parseFloat(e.target.value);
                setVolume(newVolume);
                audio.volume = newVolume;
                setIsMuted(newVolume === 0);
              }
            }}
          />
        </div>
      </div>

      <audio ref={audioRef} />
    </div>
  );
};


export default MusicPlayer;