import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, ChevronUp, Heart, Shuffle, Repeat, ListMusic, Loader2 } from 'lucide-react';
import { Track, RepeatMode } from '../../types/player';
import { ProgressBar } from './ProgressBar';
import AvatarFallback from '../common/AvatarFallback';

interface MiniPlayerProps {
  currentTrack: Track;
  isPlaying: boolean;
  isLoading?: boolean;
  isLiked: boolean;
  currentTime: number;
  duration: number;
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleLike: () => void;
  onExpand: () => void;
  onSeek: (time: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleQueue: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentTrack,
  isPlaying,
  isLoading,
  isLiked,
  currentTime,
  duration,
  shuffleMode,
  repeatMode,
  onPlayPause,
  onNext,
  onPrev,
  onToggleLike,
  onExpand,
  onSeek,
  onToggleShuffle,
  onCycleRepeat,
  onToggleQueue
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

      <div className="flex-1 flex items-center justify-between px-6">
        {/* Left Side: Artwork & Info */}
        <div className="flex-[0_1_30%] min-w-0 flex items-center space-x-3">
          <div 
            className="flex items-center space-x-3 cursor-pointer overflow-hidden"
            onClick={onExpand}
          >
            <div className="relative w-10 h-10 shrink-0">
              {artworkUrl && !artworkUrl.includes('default-cover.png') ? (
                <motion.img 
                  layoutId="player-artwork"
                  src={artworkUrl} 
                  alt="Artwork" 
                  className="w-full h-full rounded-lg object-cover shadow-[0_4px_16px_rgba(0,0,0,0.5)] bg-white/10"
                  onError={(e: any) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <AvatarFallback 
                name={currentTrack.name || currentTrack.title}
                className="w-full h-full rounded-lg text-sm"
                style={{ display: (artworkUrl && !artworkUrl.includes('default-cover.png')) ? 'none' : 'flex' }}
              />
            </div>
            <div className="flex flex-col truncate pr-2">
              <span className="text-[14px] font-semibold text-white truncate">
                {currentTrack.name || currentTrack.title || 'Unknown Track'}
              </span>
              <span className="text-[12px] text-white/50 truncate" onClick={(e) => e.stopPropagation()}>
                {currentTrack.artist_id ? (
                  <Link 
                    to={`/artist/${currentTrack.artist_id}`}
                    className="hover:underline hover:text-white transition-colors"
                  >
                    {currentTrack.artist}
                  </Link>
                ) : (
                  currentTrack.artist || currentTrack.artist_full || 'Unknown Artist'
                )}
                {currentTrack.album && (
                  <>
                    { " • " }
                    {currentTrack.album_id ? (
                      <Link to={`/album/${currentTrack.album_id}`} className="hover:underline hover:text-white transition-colors">
                        {currentTrack.album}
                      </Link>
                    ) : (
                      currentTrack.album
                    )}
                  </>
                )}
              </span>
            </div>
          </div>
          
          <motion.button onClick={onToggleLike} whileTap={{ scale: 0.8 }} className="focus:outline-none hidden sm:block ml-2">
            <motion.div animate={{ scale: isLiked ? [1, 1.3, 1] : 1 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
              <Heart size={18} className={isLiked ? "text-[var(--player-accent)]" : "text-white/40 hover:text-white/80"} fill={isLiked ? "currentColor" : "none"} />
            </motion.div>
          </motion.button>
        </div>

        {/* Center: Main Controls */}
        <div className="flex-[0_1_40%] flex flex-col items-center justify-center space-y-1">
          <div className="flex items-center space-x-5">
            {/* Shuffle */}
            <motion.button 
              onClick={onToggleShuffle} 
              whileTap={{ scale: 0.85 }} 
              className={`relative flex-shrink-0 flex items-center justify-center transition-all ${
                shuffleMode ? 'text-[var(--player-accent)] opacity-100' : 'text-white opacity-60 hover:opacity-100'
              }`}
              style={{ transition: 'var(--player-accent-transition)' }}
            >
              <Shuffle size={16} />
              {shuffleMode && (
                <div 
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full bg-[var(--player-accent)] shadow-[0_0_4px_var(--player-accent)]" 
                  style={{ transition: 'var(--player-accent-transition)' }}
                />
              )}
            </motion.button>

            <button onClick={onPrev} className="flex-shrink-0 text-white/80 hover:text-white transition-colors">
              <SkipBack size={20} fill="currentColor" />
            </button>
            
            <motion.button 
              onClick={onPlayPause}
              className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full shadow-md shrink-0 overflow-hidden"
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              disabled={isLoading}
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loader"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Loader2 size={16} className="animate-spin" />
                  </motion.div>
                ) : isPlaying ? (
                  <motion.div
                    key="pause"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Pause size={16} fill="currentColor" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            <button onClick={onNext} className="flex-shrink-0 text-white/80 hover:text-white transition-colors">
              <SkipForward size={20} fill="currentColor" />
            </button>

            {/* Repeat */}
            <motion.button 
              onClick={onCycleRepeat} 
              whileTap={{ scale: 0.85 }} 
              className={`relative flex-shrink-0 flex items-center justify-center transition-all ${
                repeatMode !== 'off' ? 'text-[var(--player-accent)] opacity-100' : 'text-white opacity-60 hover:opacity-100'
              }`}
              style={{ transition: 'var(--player-accent-transition)' }}
            >
              <Repeat size={16} />
              {repeatMode !== 'off' && (
                <div 
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full bg-[var(--player-accent)] shadow-[0_0_4px_var(--player-accent)]" 
                  style={{ transition: 'var(--player-accent-transition)' }}
                />
              )}
              {repeatMode === 'one' && (
                <div 
                  className="absolute top-[-3px] right-[-3px] bg-[var(--player-accent)] text-white text-[7px] font-bold w-[10px] h-[10px] flex items-center justify-center rounded-full border border-black/20"
                  style={{ transition: 'var(--player-accent-transition)' }}
                >
                  1
                </div>
              )}
            </motion.button>
          </div>
        </div>

        {/* Right Side: Additional Features */}
        <div className="flex-[0_1_30%] flex items-center justify-end space-x-3">
          <button 
            onClick={onToggleQueue} 
            className="text-white/60 hover:text-white transition-colors hidden sm:block p-2"
            title="Queue"
          >
            <ListMusic size={20} />
          </button>

          <button 
            onClick={onExpand} 
            className="text-white/60 hover:text-white transition-colors p-2"
            title="Expand"
          >
            <ChevronUp size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
