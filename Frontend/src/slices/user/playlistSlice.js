// redux/slices/playlistSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  playlists: [
    { 
      name: 'Liked Songs', 
      icon: null, 
      image: null,
      gradient: 'bg-gradient-to-br from-purple-600 to-purple-900',
      songCount: 123,
      type: 'Playlist'
    }
  ],
  isLoading: true,
  error: null
};

const playlistSlice = createSlice({
  name: 'playlists',
  initialState,
  reducers: {
    setPlaylists: (state, action) => {
      state.playlists = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    }
  }
});

export const { setPlaylists, setLoading, setError } = playlistSlice.actions;

export default playlistSlice.reducer;