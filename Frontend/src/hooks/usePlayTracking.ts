import { useEffect, useRef } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { PlayerState, PlayerContext } from '../types/player';
import api from '../api';

export const usePlayTracking = () => {
  const { currentTrack, status, currentTime, currentContext } = useSelector((state: { player: PlayerState }) => ({
    currentTrack: state.player.currentTrack,
    status: state.player.status,
    currentTime: state.player.currentTime,
    currentContext: state.player.currentContext || null,
  }), shallowEqual);

  const playedSecondsRef = useRef<Set<number>>(new Set());
  const lastTrackIdRef = useRef<string | number | null>(null);
  const lastContextRef = useRef<PlayerContext | null>(null);

  // Update context ref whenever it changes
  useEffect(() => {
    lastContextRef.current = currentContext;
  }, [currentContext]);

  const hasSentCompleteRef = useRef<boolean>(false);

  // Helper to record activity
  const recordActivity = async (trackId: string | number, activityType: 'play' | 'complete', context: PlayerContext | null) => {
    try {
      await api.post(`/api/v1/listening-history/record-activity/${trackId}/`, {
        activity_type: activityType,
        source_type: context?.type || 'single',
        source_id: context?.id || null
      });
    } catch (error) {
      console.warn(`[Tracking] Failed to record ${activityType}:`, error);
    }
  };

  // Helper for final recording (sendBeacon fallback for unmounts/skips)
  const recordActivityBeacon = (trackId: string | number, activityType: 'play' | 'complete', context: PlayerContext | null) => {
    const baseURL = api.defaults.baseURL || '';
    const endpoint = `${baseURL}/api/v1/listening-history/record-activity/${trackId}/`;
    const data = JSON.stringify({ 
      activity_type: activityType,
      source_type: context?.type || 'single',
      source_id: context?.id || null
    });
    const blob = new Blob([data], { type: 'application/json' });
    
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, blob);
      } else {
        fetch(endpoint, { method: 'POST', body: blob, keepalive: true });
      }
    } catch (e) {
      // Ignore beacon failures
    }
  };

  // Effect to track actual seconds played
  useEffect(() => {
    if (status === 'playing' && currentTrack) {
      const sec = Math.floor(currentTime);
      if (sec >= 0) {
        playedSecondsRef.current.add(sec);
        
        // NEW: Trigger completion immediately when threshold is reached
        if (!hasSentCompleteRef.current && playedSecondsRef.current.size >= 30) {
          hasSentCompleteRef.current = true;
          recordActivity(currentTrack.id, 'complete', currentContext);
        }
      }
    }
  }, [currentTime, status, currentTrack, currentContext]);

  // Effect to handle track changes and recording
  useEffect(() => {
    // 1. If we had a previous track, check if it was "completed" but NOT yet sent
    if (lastTrackIdRef.current && lastTrackIdRef.current !== currentTrack?.id) {
      const totalSeconds = playedSecondsRef.current.size;
      // Fallback for short tracks or cases where the above effect didn't fire
      if (!hasSentCompleteRef.current && totalSeconds >= 30) {
        recordActivityBeacon(lastTrackIdRef.current, 'complete', lastContextRef.current);
      }
    }

    // 2. Start tracking new track
    if (currentTrack) {
      lastTrackIdRef.current = currentTrack.id;
      playedSecondsRef.current = new Set();
      hasSentCompleteRef.current = false; // Reset for new track
      recordActivity(currentTrack.id, 'play', currentContext);
    }

    // 3. Cleanup on unmount
    return () => {
      if (lastTrackIdRef.current && !hasSentCompleteRef.current && playedSecondsRef.current.size >= 30) {
        recordActivityBeacon(lastTrackIdRef.current, 'complete', lastContextRef.current);
      }
    };
  }, [currentTrack?.id]); // Only run when track ID actually changes

  return null;
};
