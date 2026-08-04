import { useEffect, useRef, useCallback } from 'react';
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
  // Track which track ID we last sent metadata for — avoids redundant updates
  const lastMetadataTrackId = useRef<string | number | null>(null);
  // Debounce timer for metadata updates
  const metadataDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update Metadata on track change — debounced to handle rapid skips.
  // On iOS, each MediaMetadata update causes the lock screen widget to "refresh."
  // If we fire multiple updates during rapid skipping, iOS shows a brief
  // "connecting" state between each one. By debouncing, we only send the
  // final track's metadata after skipping settles.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    // Clear any pending debounced update from a previous skip
    if (metadataDebounceRef.current) {
      clearTimeout(metadataDebounceRef.current);
      metadataDebounceRef.current = null;
    }

    const trackId = currentTrack.id;
    const artworkSrc = currentTrack.artworkUrl || currentTrack.cover_photo || '';
    const trackName = currentTrack.name || currentTrack.title || 'Unknown Track';
    const artistName = currentTrack.artist || 'Unknown Artist';

    // If this is the same track we already sent metadata for and nothing changed,
    // skip the update entirely to avoid iOS widget flicker
    if (lastMetadataTrackId.current === trackId) return;

    // Debounce: wait 300ms for skipping to settle before updating metadata.
    // During rapid skips (next-next-next), only the final track triggers an update.
    metadataDebounceRef.current = setTimeout(() => {
      // Double check track hasn't changed during debounce
      // (we can't access latest currentTrack here due to closure,
      //  so we rely on the effect re-running and clearing the timer)

      navigator.mediaSession.metadata = new MediaMetadata({
        title: trackName,
        artist: artistName,
        album: currentTrack.album || '',
        artwork: artworkSrc
          ? [
              { src: artworkSrc, sizes: '96x96', type: 'image/jpeg' },
              { src: artworkSrc, sizes: '256x256', type: 'image/jpeg' },
              { src: artworkSrc, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      });

      lastMetadataTrackId.current = trackId;

      // Reset position state for the new track — sending a clean slate
      // prevents iOS from showing stale progress from the previous track
      lastSyncedPosition.current = 0;
      try {
        if ('setPositionState' in navigator.mediaSession) {
          // Clear position state — iOS will show an indeterminate progress
          // until we send a real position with known duration
          navigator.mediaSession.setPositionState();
        }
      } catch (_) {}
    }, 300);

    return () => {
      if (metadataDebounceRef.current) {
        clearTimeout(metadataDebounceRef.current);
        metadataDebounceRef.current = null;
      }
    };
    // Depend on track id + key fields, NOT the entire track object.
    // This prevents re-firing when hlsUrl gets populated (which would
    // cause a second metadata update mid-playback).
  }, [currentTrack?.id, currentTrack?.name, currentTrack?.title, currentTrack?.artist, currentTrack?.artworkUrl, currentTrack?.cover_photo]);

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

  // Sync timeline position to the lock screen.
  // Only update when:
  //   1. Duration is known and finite (not a "live stream")
  //   2. Position has changed by >= 2 seconds (throttle to avoid flicker)
  //   3. The position is valid for the current duration (prevents stale data)
  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      if (duration > 0 && Number.isFinite(duration)) {
        // Clamp position to [0, duration] — prevents iOS from crashing the widget
        // when currentTime briefly exceeds duration during track transitions
        const clampedPosition = Math.max(0, Math.min(currentTime, duration));

        // Only sync if position changed by more than 2 seconds (throttle)
        if (Math.abs(clampedPosition - lastSyncedPosition.current) >= 2) {
          lastSyncedPosition.current = clampedPosition;
          try {
            navigator.mediaSession.setPositionState({
              duration: duration,
              playbackRate: 1.0,
              position: clampedPosition,
            });
          } catch (error) {
            // Ignore native exceptions (e.g., position > duration race)
          }
        }
      }
    }
  }, [currentTime, duration]);
};
