import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, ChevronUp, Heart } from 'lucide-react';
import { Track } from '../../types/player';
import { ProgressBar } from './ProgressBar';

interface MiniPlayerProps {
  currentTrack: Track;
  isPlaying: boolean;
  isLiked: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleLike: () => void;
  onExpand: () => void;
  onSeek: (time: number) => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentTrack,
  isPlaying,
  isLiked,
  currentTime,
  duration,
  onPlayPause,
  onNext,
  onPrev,
  onToggleLike,
  onExpand,
  onSeek
}) => {
  const artworkUrl = currentTrack.artworkUrl || currentTrack.cover_photo || '';

  return (
    <div 
      className="fixed bottom-0 left-0 w-full z-50 h-[64px] flex flex-col"
      style={{
        background: 'rgba(10,10,10,0.88)',
        backdropFilter: 'blur(28px) saturate(200%)',
        borderTop: '0.5px solid rgba(255,255,255,0.07)'
      }}
    >
      <ProgressBar 
        isMini 
        currentTime={currentTime} 
        duration={duration} 
        onSeek={onSeek} 
      />

      <div className="flex-1 flex items-center justify-between px-4">
        {/* Left Side: Artwork & Info */}
        <div 
          className="flex flex-1 items-center space-x-3 cursor-pointer overflow-hidden"
          onClick={onExpand}
        >
          <motion.img 
            layoutId="player-artwork"
            src={artworkUrl} 
            alt="Artwork" 
            className="w-10 h-10 rounded-lg object-cover shadow-[0_4px_16px_rgba(0,0,0,0.5)] bg-white/10"
          />
          <div className="flex flex-col truncate pr-2">
            <span className="text-[14px] font-semibold text-white truncate">
              {currentTrack.name || currentTrack.title || 'Unknown Track'}
            </span>
            <span className="text-[12px] text-white/50 truncate">
              {currentTrack.artist || 'Unknown Artist'}
            </span>
          </div>
        </div>

        {/* Right Side: Controls */}
        <div className="flex items-center space-x-4 shrink-0">
          <motion.button onClick={onToggleLike} whileTap={{ scale: 0.8 }} className="focus:outline-none hidden sm:block">
            <motion.div animate={{ scale: isLiked ? [1, 1.3, 1] : 1 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
              <Heart size={20} className={isLiked ? "text-[var(--player-accent)]" : "text-white/80"} fill={isLiked ? "currentColor" : "none"} />
            </motion.div>
          </motion.button>
          
          <button onClick={onPrev} className="text-white hover:opacity-80 transition-opacity hidden sm:block">
            <SkipBack size={20} fill="currentColor" />
          </button>
          
          <motion.button 
            onClick={onPlayPause}
            className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full shadow-md"
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </motion.button>

          <button onClick={onNext} className="text-white hover:opacity-80 transition-opacity hidden sm:block">
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button onClick={onExpand} className="text-white/70 hover:text-white transition-colors pl-2">
            <ChevronUp size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
