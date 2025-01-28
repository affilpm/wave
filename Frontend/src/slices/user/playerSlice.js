// store/slices/playerSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentTrack: null,
  isPlaying: false,
  volume: 50,
  queue: [],
  currentIndex: 0,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setCurrentTrack: (state, action) => {
      state.currentTrack = action.payload;
    },
    setIsPlaying: (state, action) => {
      state.isPlaying = action.payload;
    },
    setVolume: (state, action) => {
      state.volume = action.payload;
    },
    setQueue: (state, action) => {
      state.queue = action.payload;
      state.currentIndex = 0;
    },
    addToQueue: (state, action) => {
      state.queue.push(action.payload);
    },
    nextTrack: (state) => {
      if (state.currentIndex < state.queue.length - 1) {
        state.currentIndex += 1;
        state.currentTrack = state.queue[state.currentIndex];
      }
    },
    previousTrack: (state) => {
      if (state.currentIndex > 0) {
        state.currentIndex -= 1;
        state.currentTrack = state.queue[state.currentIndex];
      }
    },
  },
});

export const {
  setCurrentTrack,
  setIsPlaying,
  setVolume,
  setQueue,
  addToQueue,
  nextTrack,
  previousTrack,
} = playerSlice.actions;

export default playerSlice.reducer;
