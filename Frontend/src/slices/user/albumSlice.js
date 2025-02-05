import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentAlbum: null,
  currentTrackId: null  // Add this to track the current playing track
};

const albumSlice = createSlice({
  name: 'album',
  initialState,
  reducers: {
    togglePlayPause: (state) => {
      state.isPlaying = !state.isPlaying;
    },
    setAlbum: (state, action) => {
      // If it's a different album, start playing it
      if (state.currentAlbum?.id !== action.payload.id) {
        state.isPlaying = true;
      }
      state.currentAlbum = action.payload;
    },
    setCurrentTrackId: (state, action) => {
      state.currentTrackId = action.payload;
    }
  },
})

export const { togglePlayPause, setAlbum } = albumSlice.actions;
export const selectIsPlaying = (state) => state.album.isPlaying;
export const selectCurrentAlbum = (state) => state.album.currentAlbum;
export default albumSlice.reducer;