import React, { useState, useRef, useEffect } from 'react';

const ProgressBar = ({ audioRef, duration, currentTime, isPlaying }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const progressBarRef = useRef(null);

  const formatTime = (time) => {
    if (!time) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeekStart = (e) => {
    setIsDragging(true);
    handleSeekChange(e);
  };

  const handleSeekChange = (e) => {
    if (!duration) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(pos * duration, duration));
    setSeekTime(newTime);
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
    if (audioRef.current && typeof seekTime === 'number') {
      audioRef.current.currentTime = seekTime;
      if (isPlaying) {
        setIsBuffering(true);
        audioRef.current.play()
          .then(() => setIsBuffering(false))
          .catch(error => {
            console.warn('Playback failed:', error);
            setIsBuffering(false);
          });
      }
    }
  };

  // Reset seekTime when currentTime changes (if not dragging)
  useEffect(() => {
    if (!isDragging) {
      setSeekTime(currentTime);
    }
  }, [currentTime, isDragging]);

  return (
    <div className="w-full flex items-center space-x-3 text-xs">
      <span className="text-gray-400 min-w-[40px] text-right">
        {formatTime(currentTime)}
      </span>
      <div className="flex-1 relative group" ref={progressBarRef}>
        <div 
          className="absolute w-full h-1 bg-gray-600 rounded-lg overflow-hidden"
          onMouseDown={handleSeekStart}
          onMouseMove={isDragging ? handleSeekChange : undefined}
          onMouseUp={handleSeekEnd}
          onMouseLeave={isDragging ? handleSeekEnd : undefined}
        >
          <div 
            className="h-full bg-white group-hover:bg-green-400 transition-colors"
            style={{ 
              width: `${((isDragging ? seekTime : currentTime) / (duration || 1)) * 100}%`,
              transition: isDragging ? 'none' : 'width 0.1s linear'
            }}
          />
        </div>
        {isBuffering && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-1 h-1 bg-white rounded-full animate-ping" />
          </div>
        )}
      </div>
      <span className="text-gray-400 min-w-[40px]">
        {formatTime(duration)}
      </span>
    </div>
  );
};

export default ProgressBar;