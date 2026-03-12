import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Track, RepeatMode } from '../../types/player';
import { PlayerControls } from './PlayerControls';
import { TrackInfo } from './TrackInfo';
import { ProgressBar } from './ProgressBar';
import { VolumeSlider } from './VolumeSlider';
import { ListMusic, Airplay } from 'lucide-react';

interface FullPlayerProps {
  isOpen: boolean;
  currentTrack: Track;
  isPlaying: boolean;
  isLiked: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  onClose: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleLike: () => void;
  onToggleQueue: () => void;
}

export const FullPlayer: React.FC<FullPlayerProps> = ({
  isOpen,
  currentTrack,
  isPlaying,
  isLiked,
  currentTime,
  duration,
  volume,
  isMuted,
  shuffleMode,
  repeatMode,
  onClose,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onToggleLike,
  onToggleQueue
}) => {
  const artworkUrl = currentTrack.artworkUrl || currentTrack.cover_photo || '';
  const rotationRef = useRef(0);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef(performance.now());

  // Handle continuous rotation tracking natively without resetting
  useEffect(() => {
    if (!isOpen) return;
    
    const animate = (time: number) => {
      if (isPlaying) {
        const delta = time - lastTimeRef.current;
        // 360deg over 32s -> 360 / 32000 ms = 0.01125 deg / ms
        rotationRef.current += delta * 0.01125;
        rotationRef.current %= 360;
        
        const el = document.getElementById('full-player-artwork');
        if (el) {
          el.style.transform = `rotate(${rotationRef.current}deg) scale(1.04)`;
        }
      } else {
        const el = document.getElementById('full-player-artwork');
        if (el) {
          el.style.transform = `rotate(${rotationRef.current}deg) scale(1.0)`;
        }
      }
      lastTimeRef.current = time;
      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 38 }}
          className="fixed inset-0 z-[60] flex flex-col items-center overflow-hidden"
          style={{ backgroundColor: '#0a0a0a' }}
        >
          {/* Ambient Glow & Noise */}
          <div 
            className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 30%, var(--player-accent), transparent)',
              opacity: 0.22,
              filter: 'blur(120px)'
            }}
          />
          <div 
            className="absolute inset-0 z-[1] opacity-[0.03] pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
            }}
          />

          <div className="relative z-10 w-full max-w-[500px] h-full flex flex-col px-7 pt-4 pb-8">
            {/* Drag Handle */}
            <div 
              className="w-full flex justify-center pb-6 cursor-pointer"
              onClick={onClose}
              // Basic drag to close could be added here mapped to `y` motion value, keeping simple click for now to respect core spec
            >
              <div className="w-9 h-1 rounded-full bg-white/20" />
            </div>

            {/* Artwork */}
            <div className="flex-1 w-full max-h-[440px] flex items-center justify-center shrink-0">
              <motion.div 
                layoutId="player-artwork"
                className="relative rounded-[2rem] overflow-hidden bg-white/5"
                style={{
                  width: 'min(calc(100vw - 56px), 348px)',
                  height: 'min(calc(100vw - 56px), 348px)',
                  boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(255,255,255,0.05)'
                }}
              >
                <motion.img
                  id="full-player-artwork"
                  key={currentTrack.id} // Forces re-render on track change for the track change transition
                  src={artworkUrl}
                  alt="Artwork"
                  className="w-full h-full object-cover origin-center"
                  initial={{ x: 40, opacity: 0, scale: 0.95 }}
                  animate={{ x: 0, opacity: 1, scale: isPlaying ? 1.04 : 1.0 }}
                  exit={{ x: -40, opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </motion.div>
            </div>

            {/* Lower Controls Area */}
            <div className="w-full flex flex-col shrink-0 pb-6">
              <TrackInfo
                track={currentTrack}
                isLiked={isLiked}
                onToggleLike={onToggleLike}
              />
              
              <ProgressBar
                currentTime={currentTime}
                duration={duration}
                onSeek={onSeek}
              />

              <PlayerControls
                isPlaying={isPlaying}
                shuffleMode={shuffleMode}
                repeatMode={repeatMode}
                onPlayPause={onPlayPause}
                onNext={onNext}
                onPrevious={onPrev}
                onToggleShuffle={onToggleShuffle}
                onCycleRepeat={onCycleRepeat}
              />

              <VolumeSlider
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={onVolumeChange}
                onToggleMute={onToggleMute}
              />

              {/* Bottom Row */}
              <div className="flex items-center justify-between w-full mt-8">
                <button className="text-white/55 hover:text-white transition-colors">
                  <Airplay size={22} />
                </button>
                <button onClick={onToggleQueue} className="text-white/55 hover:text-white transition-colors">
                  <ListMusic size={22} />
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
