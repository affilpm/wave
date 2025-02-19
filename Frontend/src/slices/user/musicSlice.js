import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentTrack: null,
  currentTrackId: null,
  isPlaying: false,
  queue: [], // Will store track objects
  queueIds: [], // Will store track IDs
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackHistory: [], // Store IDs of previously played tracks
};

export const musicSlice = createSlice({
  name: 'music',
  initialState,
  reducers: {
    play: (state) => {
      state.isPlaying = true;
    },
    pause: (state) => {
      state.isPlaying = false;
    },
    setTrack: (state, action) => {
      const { track, trackId } = action.payload;
      // Add current track to history if it exists
      if (state.currentTrackId) {
        state.playbackHistory = [state.currentTrackId, ...state.playbackHistory.slice(0, 49)]; // Keep last 50 tracks
      }
      state.currentTrack = track;
      state.currentTrackId = trackId;
    },
    setQueue: (state, action) => {
      const { tracks, trackIds } = action.payload;
      state.queue = tracks;
      state.queueIds = trackIds;
    },
    addToQueue: (state, action) => {
      const { track, trackId } = action.payload;
      state.queue.push(track);
      state.queueIds.push(trackId);
    },
    removeFromQueue: (state, action) => {
      const indexToRemove = state.queueIds.indexOf(action.payload);
      if (indexToRemove !== -1) {
        state.queue.splice(indexToRemove, 1);
        state.queueIds.splice(indexToRemove, 1);
      }
    },
    nextTrack: (state) => {
      if (state.queue.length > 0) {
        // Add current track to history if it exists
        if (state.currentTrackId) {
          state.playbackHistory = [state.currentTrackId, ...state.playbackHistory.slice(0, 49)];
        }
        state.currentTrack = state.queue[0];
        state.currentTrackId = state.queueIds[0];
        state.queue = state.queue.slice(1);
        state.queueIds = state.queueIds.slice(1);
      }
    },
    previousTrack: (state) => {
      if (state.playbackHistory.length > 0) {
        // Add current track to queue front if it exists
        if (state.currentTrack) {
          state.queue = [state.currentTrack, ...state.queue];
          state.queueIds = [state.currentTrackId, ...state.queueIds];
        }
        // Get last played track ID
        const previousTrackId = state.playbackHistory[0];
        // You would need to fetch the track data based on this ID
        // For now, we'll just set the ID
        state.currentTrackId = previousTrackId;
        state.playbackHistory = state.playbackHistory.slice(1);
      }
    },
    updateTime: (state, action) => {
      state.currentTime = action.payload;
    },
    setDuration: (state, action) => {
      state.duration = action.payload;
    },
    setVolume: (state, action) => {
      state.volume = action.payload;
    },
    clearQueue: (state) => {
      state.queue = [];
      state.queueIds = [];
    },
    reorderQueue: (state, action) => {
      const { oldIndex, newIndex } = action.payload;
      const [movedTrack] = state.queue.splice(oldIndex, 1);
      const [movedTrackId] = state.queueIds.splice(oldIndex, 1);
      state.queue.splice(newIndex, 0, movedTrack);
      state.queueIds.splice(newIndex, 0, movedTrackId);
    },
  },
});

export const {
  play,
  pause,
  setTrack,
  setQueue,
  addToQueue,
  removeFromQueue,
  nextTrack,
  previousTrack,
  updateTime,
  setDuration,
  setVolume,
  clearQueue,
  reorderQueue,
} = musicSlice.actions;

export default musicSlice.reducer;
