import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { PlayerState } from '../types/player';
import api from '../api';

export const usePlayTracking = () => {
  const currentTrack = useSelector((state: { player: PlayerState }) => state.player.currentTrack);
  const status = useSelector((state: { player: PlayerState }) => state.player.status);
  const currentTime = useSelector((state: { player: PlayerState }) => state.player.currentTime);
  const duration = useSelector((state: { player: PlayerState }) => state.player.duration);

  const playedSecondsRef = useRef<Set<number>>(new Set());
  const lastTrackIdRef = useRef<string | number | null>(null);

  // Helper to record activity
  const recordActivity = async (trackId: string | number, activityType: 'play' | 'complete') => {
    try {
      await api.post(`/api/v1/listening-history/record-activity/${trackId}/`, {
        activity_type: activityType
      });
    } catch (error) {
      console.warn(`[Tracking] Failed to record ${activityType}:`, error);
    }
  };

  // Helper for final recording (sendBeacon fallback for unmounts/skips)
  const recordActivityBeacon = (trackId: string | number, activityType: 'play' | 'complete') => {
    const baseURL = api.defaults.baseURL || '';
    const endpoint = `${baseURL}/api/v1/listening-history/record-activity/${trackId}/`;
    const data = JSON.stringify({ activity_type: activityType });
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
      }
    }
  }, [currentTime, status, currentTrack]);

  // Effect to handle track changes and recording
  useEffect(() => {
    // 1. If we had a previous track, check if it was "completed"
    if (lastTrackIdRef.current && lastTrackIdRef.current !== currentTrack?.id) {
      const totalSeconds = playedSecondsRef.current.size;
      // Consider "complete" if played more than 30 seconds or 80% of duration
      // We don't have the old duration easily here unless we ref it, so let's just 
      // trigger 'complete' if they played a decent chunk.
      if (totalSeconds > 10) {
        recordActivityBeacon(lastTrackIdRef.current, 'complete');
      }
    }

    // 2. Start tracking new track
    if (currentTrack) {
      lastTrackIdRef.current = currentTrack.id;
      playedSecondsRef.current = new Set();
      recordActivity(currentTrack.id, 'play');
    }

    // 3. Cleanup on unmount
    return () => {
      if (lastTrackIdRef.current && playedSecondsRef.current.size > 10) {
        recordActivityBeacon(lastTrackIdRef.current, 'complete');
      }
    };
  }, [currentTrack?.id]); // Only run when track ID actually changes

  return null;
};
