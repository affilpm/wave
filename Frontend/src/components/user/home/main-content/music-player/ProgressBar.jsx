import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { formatTime } from '../../../../../utils/formatters';


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


export default ProgressBar