import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PlayerState } from '../../types/player';
import {
  playTrackAtIndex,
  resume,
  pause,
  skipNext,
  skipPrevious,
  setVolume,
  toggleMute,
  toggleShuffle,
  cycleRepeat,
  toggleFullPlayer,
  toggleQueue,
  setIsLiked,
  setQueue,
  removeFromQueue
} from '../../slices/user/playerSlice';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useDominantColor } from '../../hooks/useDominantColor';
import { usePlayTracking } from '../../hooks/usePlayTracking';
import { useMediaSession } from '../../hooks/useMediaSession';
import { MiniPlayer } from './MiniPlayer';
import { FullPlayer } from './FullPlayer';
import { QueueSheet } from './QueueSheet';

export const Player: React.FC = () => {
  const dispatch = useDispatch();
  
  // Selectors
  const currentTrack = useSelector((state: { player: PlayerState }) => state.player.currentTrack);
  const queue = useSelector((state: { player: PlayerState }) => state.player.queue);
  const status = useSelector((state: { player: PlayerState }) => state.player.status);
  const currentTime = useSelector((state: { player: PlayerState }) => state.player.currentTime);
  const duration = useSelector((state: { player: PlayerState }) => state.player.duration);
  const volume = useSelector((state: { player: PlayerState }) => state.player.volume);
  const isMuted = useSelector((state: { player: PlayerState }) => state.player.isMuted);
  const shuffleMode = useSelector((state: { player: PlayerState }) => state.player.shuffleMode);
  const repeatMode = useSelector((state: { player: PlayerState }) => state.player.repeatMode);
  const isFullPlayerOpen = useSelector((state: { player: PlayerState }) => state.player.isFullPlayerOpen);
  const isQueueOpen = useSelector((state: { player: PlayerState }) => state.player.isQueueOpen);
  const isLiked = useSelector((state: { player: PlayerState }) => state.player.isLiked);

  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';

  // Instantiate hooks
  const { seek } = useAudioPlayer();
  useDominantColor();
  usePlayTracking();
  useMediaSession(seek);

  // Fallback cleanup or global styles if needed
  useEffect(() => {
    // Ensuring basic variables exist if color hook hasn't run yet
    if (!document.documentElement.style.getPropertyValue('--player-accent')) {
      document.documentElement.style.setProperty('--player-accent', '#3b82f6');
    }
  }, []);

  if (!currentTrack) {
    return null; // Don't render player at all if no track is playing
  }

  return (
    <>
      <MiniPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isLiked={isLiked}
        currentTime={currentTime}
        duration={duration}
        onPlayPause={() => dispatch(isPlaying ? pause() : resume())}
        onNext={() => dispatch(skipNext())}
        onPrev={() => dispatch(skipPrevious())}
        onToggleLike={() => dispatch(setIsLiked(!isLiked))}
        onExpand={() => dispatch(toggleFullPlayer())}
        onSeek={seek}
      />

      <FullPlayer
        isOpen={isFullPlayerOpen}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isLiked={isLiked}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        shuffleMode={shuffleMode}
        repeatMode={repeatMode}
        onClose={() => dispatch(toggleFullPlayer())}
        onPlayPause={() => dispatch(isPlaying ? pause() : resume())}
        onNext={() => dispatch(skipNext())}
        onPrev={() => dispatch(skipPrevious())}
        onSeek={seek}
        onVolumeChange={(vol) => dispatch(setVolume(vol))}
        onToggleMute={() => dispatch(toggleMute())}
        onToggleShuffle={() => dispatch(toggleShuffle())}
        onCycleRepeat={() => dispatch(cycleRepeat())}
        onToggleLike={() => dispatch(setIsLiked(!isLiked))}
        onToggleQueue={() => dispatch(toggleQueue())}
      />

      <QueueSheet
        isOpen={isQueueOpen}
        onClose={() => dispatch(toggleQueue())}
        queue={queue}
        currentTrackId={currentTrack.id}
        isPlaying={isPlaying}
        onReorder={(newQueue) => dispatch(setQueue({ tracks: newQueue }))} // Simplified, ideally originalQueue logic preserved but setQueue handles it 
        onRemove={(id) => dispatch(removeFromQueue(id))}
        onPlayTrack={(index) => dispatch(playTrackAtIndex(index))}
      />
    </>
  );
};

export default Player;
