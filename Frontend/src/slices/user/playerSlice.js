import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentTrack: null,
  isPlaying: false,
  volume: 50,
  queue: [],
  currentIndex: 0,
  repeatMode: "off",
  userHasInteracted: false,
  streamSession: null,
};

const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    setStreamSession: (state, action) => {
      state.streamSession = action.payload;
    },
    
    setCurrentTrack: (state, action) => {
      const track = action.payload;
      if (!track) {
        state.currentTrack = null;
        return;
      }
      
      state.currentTrack = {
        id: track.id,
        name: track.name,
        artist: track.artist || "",
        cover_photo: track.cover_photo || "",
        streamUrl: `/api/music/${track.id}/stream/`, // Fixed: Using dynamic track ID
      };

      
      // Update current index if track exists in queue
      const newIndex = state.queue.findIndex(t => t.id === track.id);
      if (newIndex !== -1) {
        state.currentIndex = newIndex;
      }
    },

    setUserHasInteracted: (state, action) => {
      state.userHasInteracted = action.payload;
    },

    setIsPlaying: (state, action) => {
      state.isPlaying = action.payload;
      if (action.payload) {
        state.userHasInteracted = true;
      }
    },

    setVolume: (state, action) => {
      state.volume = action.payload;
    },

    setQueue: (state, action) => {
      const newQueue = action.payload.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artist || "",
        cover_photo: track.cover_photo || "",
        streamUrl: `/api/music/${track.id}/stream/`, // Fixed: Using dynamic track ID
        audio_file: track.audio_file || null // Added support for direct audio files
      }));
      
      state.queue = newQueue;
      
      // Maintain current track position in new queue
      if (state.currentTrack) {
        const newIndex = newQueue.findIndex(t => t.id === state.currentTrack.id);
        state.currentIndex = newIndex !== -1 ? newIndex : 0;
      } else {
        state.currentIndex = 0;
        state.currentTrack = newQueue[0] || null;
      }
    },

    addToQueue: (state, action) => {
      const track = action.payload;
      state.queue.push({
        id: track.id,
        name: track.name,
        artist: track.artist || "",
        cover_photo: track.cover_photo || "",
        streamUrl: `/api/music/${track.id}/stream/`, // Fixed: Using dynamic track ID
        audio_file: track.audio_file || null // Added support for direct audio files
      });
    },

    nextTrack: (state) => {
      if (state.repeatMode === "single" || !state.queue.length) return;

      const isLastTrack = state.currentIndex === state.queue.length - 1;

      if (!isLastTrack) {
        state.currentIndex += 1;
        state.currentTrack = state.queue[state.currentIndex];
      } else if (state.repeatMode === "all") {
        state.currentIndex = 0;
        state.currentTrack = state.queue[0];
      }
    },

    previousTrack: (state) => {
      if (state.repeatMode === "single" || !state.queue.length) return;

      const isFirstTrack = state.currentIndex === 0;

      if (!isFirstTrack) {
        state.currentIndex -= 1;
        state.currentTrack = state.queue[state.currentIndex];
      } else if (state.repeatMode === "all") {
        state.currentIndex = state.queue.length - 1;
        state.currentTrack = state.queue[state.currentIndex];
      }
    },

    setRepeatMode: (state, action) => {
      state.repeatMode = action.payload;
    },

    reorderQueue: (state, action) => {
      const { startIndex } = action.payload;
      if (startIndex >= 0 && startIndex < state.queue.length) {
        const reorderedQueue = [
          ...state.queue.slice(startIndex),
          ...state.queue.slice(0, startIndex),
        ];
        state.queue = reorderedQueue;
        state.currentIndex = 0;
        state.currentTrack = reorderedQueue[0];
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
  setRepeatMode,
  reorderQueue,
  setUserHasInteracted,
  setStreamSession,
} = playerSlice.actions;

export default playerSlice.reducer;