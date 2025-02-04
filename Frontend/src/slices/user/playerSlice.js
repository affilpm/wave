// store/slices/playerSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentTrack: null,
  isPlaying: false,
  volume: 50,
  queue: [],
  currentIndex: 0,
  repeatMode: 'off',
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
      state.currentTrack = action.payload[0] || null;
    },
    addToQueue: (state, action) => {
      state.queue.push(action.payload);
    },
    nextTrack: (state) => {
      if (state.repeatMode === 'single') {
        return;
      }

      const isLastTrack = state.currentIndex === state.queue.length - 1;

      if (!isLastTrack) {

        state.currentIndex += 1
        state.currentTrack = state.queue[state.currentIndex];
      } else if (state.repeatMode === 'all') {
        state.currentIndex = 0;
        state.currentTrack = state.queue[0];
      }
    },
    previousTrack: (state) => {
      if (state.repeatMode === 'single') {
        return;
      }

      const isFistTrack = state.currentIndex === 0

      if (!isFistTrack) {
        state.currentIndex -= 1;
        state.currentTrack = state.queue[state.currentIndex];
      } else if (state.repeatMode === 'all') {
        
        state.currentIndex = state.queue.length - 1;
        state.currentTrack = state.queue[state.currentIndex]
      }
    },
    setRepeatMode: (state, action) => {
      state.repeatMode = action.payload
    }
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
  setRepeatMode,
} = playerSlice.actions;

export default playerSlice.reducer;
