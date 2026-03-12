import api from "../api";
import { LISTENING } from "../constants/apiEndpoints";

const devLog = import.meta.env.DEV ? (...args) => console.warn('[activityMiddleware]', ...args) : () => {};

/** Helper to record listening activity. */
const recordActivity = async (musicId, activityType) => {
  try {
    await api.post(LISTENING.RECORD(musicId), {
      activity_type: activityType,
    });
  } catch (err) {
    devLog("Activity recording failed:", err.message);
  }
};

export const activityMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState();
  const player = state?.player;

  switch (action.type) {
    case "player/setCurrentMusic": {
      const musicId = typeof action.payload === "object"
        ? action.payload.id
        : action.payload;
      if (musicId) recordActivity(musicId, "play");
      break;
    }

    case "player/trackCompleted": {
      const musicId = player?.currentMusicId;
      if (musicId) {
        recordActivity(musicId, "complete");
      }
      break;
    }

    default:
      break;
  }

  return result;
};