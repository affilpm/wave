import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  isMini?: boolean;
}

const formatTime = (time: number) => {
  if (!isFinite(time) || isNaN(time)) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  onSeek,
  isMini = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const currentProgress = isDragging 
    ? dragProgress 
    : duration > 0 ? (currentTime / duration) : 0;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    setIsDragging(true);
    updateProgressFromEvent(e);
    containerRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    updateProgressFromEvent(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    setIsDragging(false);
    containerRef.current.releasePointerCapture(e.pointerId);
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    onSeek(percent * duration);
  };

  const updateProgressFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setDragProgress(x / rect.width);
  };

  if (isMini) {
    return (
      <div 
        ref={containerRef}
        className="absolute top-0 left-0 right-0 h-[2px] cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute inset-0 bg-white/10" />
        <div 
          className="absolute inset-y-0 left-0 bg-[var(--player-accent)] pointer-events-none"
          style={{ width: `${currentProgress * 100}%` }}
        />
        <motion.div
          animate={{ scale: isHovered || isDragging ? 1 : 0 }}
          className="absolute top-1/2 -mt-[5px] w-[10px] h-[10px] bg-white rounded-full shadow pointer-events-none"
          style={{ left: `calc(${currentProgress * 100}% - 5px)` }}
          transition={{ duration: 0.15 }}
        />
      </div>
    );
  }

  // Full Player Progress
  return (
    <div className="w-full flex flex-col space-y-2 mt-2">
      <div 
        ref={containerRef}
        className="relative w-full py-2 cursor-pointer touch-none flex items-center"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Track */}
        <motion.div 
          className="w-full bg-white/15 rounded-full"
          animate={{ height: isHovered || isDragging ? 6 : 4 }}
          transition={{ duration: 0.15 }}
        >
          {/* Fill */}
          <div 
            className="h-full bg-[var(--player-accent)] rounded-full transition-colors duration-600 pointer-events-none relative"
            style={{ width: `${currentProgress * 100}%` }}
          >
            {/* Thumb */}
            <motion.div
              animate={{ opacity: isHovered || isDragging ? 1 : 0 }}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow pointer-events-none"
              transition={{ duration: 0.15 }}
            />
          </div>
        </motion.div>
      </div>

      <div className="flex justify-between text-[12px] font-mono text-white/40 px-1 pointer-events-none">
        <span>{formatTime(isDragging ? dragProgress * duration : currentTime)}</span>
        <span>-{formatTime(duration - (isDragging ? dragProgress * duration : currentTime))}</span>
      </div>
    </div>
  );
};
