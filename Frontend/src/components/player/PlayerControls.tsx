import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { RepeatMode } from '../../types/player';
import { Shuffle, Repeat, SkipBack, SkipForward, Play, Pause, Loader2 } from 'lucide-react';

interface PlayerControlsProps {
  isPlaying: boolean;
  isLoading?: boolean;
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  isLoading,
  shuffleMode,
  repeatMode,
  onPlayPause,
  onNext,
  onPrevious,
  onToggleShuffle,
  onCycleRepeat
}) => {
  const prevTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePrevDown = () => {
    prevTimeoutRef.current = setTimeout(() => {
      // Logic for long press if needed through a specific action, or handled by the parent
      // For now, since skipPrevious already handles currentTime > 3s, 
      // we just fire it. The long press request might imply we wait before acting.
      onPrevious();
    }, 500);
  };

  const handlePrevUp = () => {
    if (prevTimeoutRef.current) {
      clearTimeout(prevTimeoutRef.current);
      prevTimeoutRef.current = null;
      onPrevious();
    }
  };

  return (
    <div className="flex items-center justify-between w-full max-w-[280px] mx-auto mt-6">
      {/* Shuffle */}
      <motion.button
        onClick={onToggleShuffle}
        className={`relative w-9 h-9 flex items-center justify-center transition-all ${
          shuffleMode ? 'text-[var(--player-accent)] opacity-100' : 'text-white opacity-60 hover:opacity-100'
        }`}
        style={{ transition: 'var(--player-accent-transition)' }}
        whileTap={{ scale: 0.85 }}
      >
        <Shuffle size={20} />
        {shuffleMode && (
          <div 
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--player-accent)] shadow-[0_0_8px_var(--player-accent)]" 
            style={{ transition: 'var(--player-accent-transition)' }}
          />
        )}
      </motion.button>

      {/* Previous */}
      <motion.button
        onPointerDown={handlePrevDown}
        onPointerUp={handlePrevUp}
        onPointerLeave={handlePrevUp}
        className="w-12 h-12 flex items-center justify-center text-white opacity-90 hover:opacity-100"
        whileTap={{ scale: 0.85 }}
      >
        <SkipBack size={28} fill="currentColor" />
      </motion.button>

      {/* Play/Pause */}
      <motion.button
        onClick={onPlayPause}
        className="w-16 h-16 flex items-center justify-center bg-white text-black rounded-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]"
        whileTap={{ scale: 0.90 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 size={32} className="animate-spin" />
        ) : isPlaying ? (
          <Pause size={32} fill="currentColor" />
        ) : (
          <Play size={32} fill="currentColor" className="ml-1" />
        )}
      </motion.button>

      {/* Next */}
      <motion.button
        onClick={onNext}
        className="w-12 h-12 flex items-center justify-center text-white opacity-90 hover:opacity-100"
        whileTap={{ scale: 0.85 }}
      >
        <SkipForward size={28} fill="currentColor" />
      </motion.button>

      {/* Repeat */}
      <motion.button
        onClick={onCycleRepeat}
        className={`relative w-9 h-9 flex items-center justify-center transition-all ${
          repeatMode !== 'off' ? 'text-[var(--player-accent)] opacity-100' : 'text-white opacity-60 hover:opacity-100'
        }`}
        style={{ transition: 'var(--player-accent-transition)' }}
        whileTap={{ scale: 0.85 }}
      >
        <Repeat size={20} />
        {repeatMode !== 'off' && (
          <div 
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--player-accent)] shadow-[0_0_8px_var(--player-accent)]" 
            style={{ transition: 'var(--player-accent-transition)' }}
          />
        )}
        {repeatMode === 'one' && (
          <div 
            className="absolute top-[2px] right-[2px] bg-[var(--player-accent)] text-white text-[9px] font-bold w-[13px] h-[13px] flex items-center justify-center rounded-full scale-90 border border-black/20"
            style={{ transition: 'var(--player-accent-transition)' }}
          >
            1
          </div>
        )}
      </motion.button>
    </div>
  );
};
