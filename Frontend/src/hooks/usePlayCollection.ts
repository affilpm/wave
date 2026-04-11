import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import {
  setQueue,
  togglePlay,
  setIsPlaying,
  toggleShufflePlay,
  toggleShuffle,
} from '../slices/user/playerSlice';
import type { Track, PlayerContext, PlayerState } from '../types/player';

// Memoized selector for player state — shared across all consumers
const selectPlayerState = createSelector(
  [(state: { player: PlayerState }) => state.player],
  (player) => ({
    currentTrack: player.currentTrack,
    status: player.status,
    currentContext: player.currentContext,
    shuffleMode: player.shuffleMode,
  })
);

interface UsePlayCollectionOptions {
  /** Pre-formatted Track[] ready for the player. */
  tracks: Track[];
  /** Context object identifying this collection (e.g. { type: 'playlist', id: '42' }). */
  context: PlayerContext;
}

interface UsePlayCollectionReturn {
  /** Click handler for the main "Play" button on the collection page. */
  handlePlayCollection: () => void;
  /** Click handler for an individual track row — sets the full queue but starts at `index`. */
  handlePlayTrackAtIndex: (index: number) => void;
  /** Click handler for the "Shuffle Play" button. */
  handleShufflePlay: () => void;
  /** Click handler to toggle shuffle mode. */
  handleToggleShuffle: () => void;
  /** `true` when THIS collection is the active context AND audio is playing. */
  isCollectionPlaying: boolean;
  /** `true` when THIS collection is the active context (playing OR paused). */
  isCollectionActive: boolean;
  /** `true` when shuffle mode is enabled. */
  isShuffle: boolean;
}

/**
 * Reusable hook that wires a collection page's Play / Shuffle / Track-click
 * buttons to the global Redux player, with Spotify-like behaviour:
 *
 * 1. First click  → replaces queue, starts from track 0.
 * 2. Same context → toggles play/pause.
 * 3. Different context → replaces queue, starts from track 0.
 */
export const usePlayCollection = ({
  tracks,
  context,
}: UsePlayCollectionOptions): UsePlayCollectionReturn => {
  const dispatch = useDispatch();

  const { currentTrack, status, currentContext, shuffleMode } = useSelector(
    (state: { player: PlayerState }) => state.player,
    shallowEqual
  );

  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';

  // Is THIS collection the one currently loaded in the player?
  const isCollectionActive = useMemo(() => {
    return (
      currentContext?.type === context.type &&
      String(currentContext?.id) === String(context.id)
    );
  }, [currentContext, context]);

  // Active AND currently audibly playing?
  const isCollectionPlaying = isPlaying && isCollectionActive;

  // ── Main "Play" button ────────────────────────────────────────────────
  const handlePlayCollection = useCallback(() => {
    if (!tracks.length) return;

    // Same collection → toggle play/pause
    if (isCollectionActive) {
      dispatch(togglePlay());
      return;
    }

    // Different collection → replace queue, start from index 0
    dispatch(
      setQueue({
        tracks,
        startIndex: 0,
        context,
      })
    );
  }, [dispatch, tracks, context, isCollectionActive]);

  // ── Individual track click ────────────────────────────────────────────
  const handlePlayTrackAtIndex = useCallback(
    (index: number) => {
      if (!tracks.length) return;

      const clickedTrack = tracks[index];
      if (!clickedTrack) return;

      const isSameTrack =
        isCollectionActive &&
        currentTrack &&
        String(currentTrack.id) === String(clickedTrack.id);

      if (isSameTrack) {
        dispatch(togglePlay());
        return;
      }

      dispatch(
        setQueue({
          tracks,
          startIndex: index,
          context,
        })
      );
    },
    [dispatch, tracks, context, isCollectionActive, currentTrack]
  );

  // ── Shuffle Play ──────────────────────────────────────────────────────
  const handleShufflePlay = useCallback(() => {
    if (!tracks.length) return;
    dispatch(toggleShufflePlay(tracks));
  }, [dispatch, tracks]);

  // ── Toggle Shuffle ────────────────────────────────────────────────────
  const handleToggleShuffle = useCallback(() => {
    if (isCollectionActive) {
      dispatch(toggleShuffle());
    } else {
      handleShufflePlay();
    }
  }, [dispatch, isCollectionActive, handleShufflePlay]);

  return {
    handlePlayCollection,
    handlePlayTrackAtIndex,
    handleShufflePlay,
    handleToggleShuffle,
    isCollectionPlaying,
    isCollectionActive,
    isShuffle: shuffleMode,
  };
};
