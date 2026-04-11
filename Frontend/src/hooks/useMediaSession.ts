import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PlayerState } from '../types/player';
import { resume, pause, skipNext, skipPrevious } from '../slices/user/playerSlice';

export const useMediaSession = (seekFn: (time: number) => void) => {
  const dispatch = useDispatch();
  const currentTrack = useSelector((state: { player: PlayerState }) => state.player.currentTrack);
  const status = useSelector((state: { player: PlayerState }) => state.player.status);
  const currentTime = useSelector((state: { player: PlayerState }) => state.player.currentTime);
  const duration = useSelector((state: { player: PlayerState }) => state.player.duration);

  // Track the last synced position to avoid excessive updates
  const lastSyncedPosition = useRef(0);

  // Update Metadata on track change
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      const artworkSrc = currentTrack.artworkUrl || currentTrack.cover_photo || '';
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name || currentTrack.title || 'Unknown Track',
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || '',
        artwork: artworkSrc ? [{ src: artworkSrc, sizes: '512x512', type: 'image/jpeg' }] : []
      });
    }
    // Purposely do not clear metadata on cleanup here to avoid flashing
  }, [currentTrack]);

  // Register ALL handlers once — including explicitly nulling seekforward/seekbackward
  // so the OS shows Next/Previous track buttons instead of 10-second seek arrows
  useEffect(() => {
    if ('mediaSession' in navigator) {
      // Core playback controls
      navigator.mediaSession.setActionHandler('play', () => dispatch(resume()));
      navigator.mediaSession.setActionHandler('pause', () => dispatch(pause()));
      
      // Track skip controls — these are the Spotify-style buttons
      navigator.mediaSession.setActionHandler('nexttrack', () => dispatch(skipNext()));
      navigator.mediaSession.setActionHandler('previoustrack', () => dispatch(skipPrevious()));
      
      // CRITICAL: Explicitly null out seekforward/seekbackward.
      // If we don't do this, the OS assumes "this app supports interval seeking"
      // and replaces the Next/Prev track buttons with 10-second skip arrows.
      // Setting them to null tells the OS: "I don't support interval seeking,
      // show me the standard track-skip buttons instead."
      try {
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
      } catch (e) {
        // Some browsers don't support these action types — that's fine
      }
      
      // Scrubber/timeline seeking (drag the progress bar on the lock screen)
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          seekFn(details.seekTime);
        }
      });
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [dispatch, seekFn]);

  // Sync playback state — but NEVER drop to 'none' during track transitions.
  // Spotify keeps the lock screen active during loading/buffering between tracks.
  // Setting 'none' causes the OS to tear down the media widget and rebuild it
  // for the next track, which looks like "a new song replaced the old one."
  useEffect(() => {
    if ('mediaSession' in navigator) {
      if (status === 'playing' || status === 'loading' || status === 'buffering') {
        navigator.mediaSession.playbackState = 'playing';
      } else if (status === 'paused') {
        navigator.mediaSession.playbackState = 'paused';
      }
      // Intentionally NOT setting 'none' for 'idle' — let the widget persist
    }
  }, [status]);

  // Sync timeline position to the lock screen — only every ~2 seconds to avoid
  // excessive updates that can cause the OS to "flicker" the controls
  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      // Only sync if duration is known (avoids "live stream" mode)
      if (duration > 0 && Number.isFinite(duration)) {
        // Only sync if position changed by more than 2 seconds (throttle)
        if (Math.abs(currentTime - lastSyncedPosition.current) >= 2) {
          lastSyncedPosition.current = currentTime;
          try {
            navigator.mediaSession.setPositionState({
              duration: duration,
              playbackRate: 1.0,
              position: Math.max(0, Math.min(currentTime, duration))
            });
          } catch (error) {
            // Ignore native exceptions
          }
        }
      }
    }
  }, [currentTime, duration]);
};
