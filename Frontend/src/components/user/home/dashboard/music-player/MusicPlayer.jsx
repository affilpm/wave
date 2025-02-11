import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, SkipBack, SkipForward, Volume1, Music2, List, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import api from "../../../../../api";

const musicId = 8;

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(100);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);

  console.log(musicId)
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const { data } = await api.get(`/api/music/metadata/${musicId}/`);
        setMetadata(data);
        console.log(data)
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
                onClick={() => {
                  const audio = audioRef.current;
                  if (audio) audio.currentTime -= 10;
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipBack size={20} />
              </button>

              <button
                onClick={togglePlay}
                className="bg-white rounded-full p-2 hover:scale-105 transition-all hover:bg-green-400"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-black rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause size={24} className="text-black" />
                ) : (
                  <Play size={24} className="text-black" />
                )}
              </button>

              <button
                onClick={() => {
                  const audio = audioRef.current;
                  if (audio) audio.currentTime += 10;
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipForward size={20} />
              </button>
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
            
            <div className="space-y-2">
              {/* Example queue item - you can map through actual queue data here */}
              <div className="flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-white/5">
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                  <Music2 size={20} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-white truncate">{metadata?.title}</h3>
                  <p className="text-xs text-gray-400 truncate">{metadata?.artist}</p>
                </div>
                {isPlaying && (
                  <div className="flex-shrink-0">
                    <span className="bg-green-500 rounded-full p-1">
                      <Play size={16} className="text-white" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <audio ref={audioRef} />
    </div>
  );
};

export default MusicPlayer;


