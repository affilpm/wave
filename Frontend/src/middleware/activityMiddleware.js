import api from "../api";
import { LISTENING } from "../constants/apiEndpoints";
import { fetchRecentlyPlayed, fetchJumpBackIn } from "../slices/user/listeningHistorySlice";

const devLog = import.meta.env.DEV ? (...args) => console.warn('[activityMiddleware]', ...args) : () => {};

/** Helper to record listening activity with context, then refresh history. */
const recordActivity = async (store, musicId, activityType, sourceType = null, sourceId = null) => {
  if (!musicId) return;
  try {
    const payload = { activity_type: activityType };
    if (sourceType) payload.source_type = sourceType;
    if (sourceId) payload.source_id = String(sourceId);
    
    await api.post(LISTENING.RECORD(musicId), payload);

    // Refresh recently played & jump-back-in so the UI updates live
    // Force immediate refresh
    store.dispatch(fetchRecentlyPlayed());
    store.dispatch(fetchJumpBackIn());
  } catch (err) {
    devLog("Activity recording failed:", err.message);
  }
};

export const activityMiddleware = (store) => (next) => (action) => {
  const prevState = store.getState();
  const result = next(action);
  const nextState = store.getState();

  const prevMusicId = prevState?.player?.currentTrack?.id;
  const nextMusicId = nextState?.player?.currentTrack?.id;
  const isEnteringLoading = nextState?.player?.status === 'loading' && prevState?.player?.status !== 'loading';
  const isNowPlaying = nextState?.player?.status === 'playing' || nextState?.player?.status === 'loading';

  // Detection Logic:
  // 1. If music ID changed and player is entering loading or is playing
  // 2. Or if explicitly set (like setCurrentMusic which sets ID and loading in one go)
  
  if (nextMusicId && (nextMusicId !== prevMusicId || isEnteringLoading)) {
    // Prevent double-recording for the same track within the same "session"
    // (A simple check but usually state comparison is enough)
    if (nextMusicId !== prevMusicId || (action.type.includes('play') || action.type.includes('setQueue'))) {
        const context = nextState.player?.currentContext;
        recordActivity(store, nextMusicId, "play", context?.type, context?.id);
    }
  }

  // Explicit completion handlers
  if (action.type === "player/trackCompleted" || action.type === "player/handleTrackEnd") {
      if (prevMusicId) {
          recordActivity(store, prevMusicId, "complete", prevState.player?.currentContext?.type, prevState.player?.currentContext?.id);
      }
  }

  return result;
};