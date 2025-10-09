import api from "../api";

// small helper
const recordActivity = async (musicId, activityType) => {
  try {
    await api.post(`/api/listening-history/record-activity/${musicId}/`, {
      activity_type: activityType,
    });
  } catch (err) {
    console.error("Activity recording failed:", err);
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