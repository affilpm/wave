import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  musicId: 1,
  isPlaying: false,
  isChanging: false  // New state to track music changes
};

const musicPlayerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    setMusicId: (state, action) => {
      state.musicId = Number(action.payload);;
      state.isChanging = true;  // Mark that we're changing tracks
      state.isPlaying = false;  // Stop playback during change
    },
    setIsPlaying: (state, action) => {
      state.isPlaying = action.payload;
    },
    setChangeComplete: (state) => {
      state.isChanging = false;  // Reset the changing state
    }
  }
});

export const {
  setMusicId,
  setIsPlaying,
  setChangeComplete
} = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
