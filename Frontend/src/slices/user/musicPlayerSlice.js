import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  musicId: null,
  isPlaying: false,
  isChanging: false,
  isLoadingTrack: false, // New state to track loading
  actionLock: false, // New state to prevent multiple actions
  queue: [],
  currentIndex: 0,
  repeat: 'none', // 'none' | 'all' | 'one'
  shuffle: false,
  originalQueue: [], 
  playedTracks: [],
  currentPlaylistId: null,
  currentArtistId: null,
  isLiked: true,
  lastActionTimestamp: 0, // Track when actions occur
};

const musicPlayerSlice = createSlice({
  name: "musicPlayer",
  initialState,
  reducers: {
    setMusicId: (state, action) => {
      // Prevent rapid changes within 500ms
      const now = Date.now();
      if (state.actionLock || (now - state.lastActionTimestamp < 500)) {
        return;
      }
      
      const newMusicId = Number(action.payload);
      const newIndex = state.queue.findIndex(track => track.id === newMusicId);
      
      if (newIndex !== -1) {
        state.currentIndex = newIndex;
        state.musicId = newMusicId;
        state.isChanging = true;
        state.isLoadingTrack = true;
        state.actionLock = true;
        state.lastActionTimestamp = now;
        state.isPlaying = false; // Always set to play when changing tracks
      }
    },
    
    setLoadingState: (state, action) => {
      state.isLoadingTrack = action.payload;
    },
    
    setActionLock: (state, action) => {
      state.actionLock = action.payload;
    },
    
    setCurrentPlaylistId: (state, action) => {
      state.currentPlaylistId = action.payload;
    },
    
    setCurrentArtistId: (state, action) => {
      state.currentArtistId = action.payload;
    },
    
    setIsLiked: (state, action) => {
      state.isLiked = action.type;
    },
    
    setIsPlaying: (state, action) => {
      // Don't allow play state changes during loading
      if (state.isLoadingTrack || state.isChanging) {
        return;
      }
      state.isPlaying = action.payload;
    },
    
    setChangeComplete: (state) => {
      state.isChanging = false;
      state.isLoadingTrack = false;
      state.actionLock = false;
      state.isPlaying = true; // Add this back to ensure playback starts after loading
    },
    
    handlePageReload: (state) => {
      state.isPlaying = false;
      state.isChanging = false;
      state.isLoadingTrack = false;
      state.actionLock = false;
    },
    
    setQueue: (state, action) => {
      const { tracks, playlistId, artistId } = action.payload;
      
      // Save the current track ID if there is one
      const currentTrackId = state.musicId;
      
      // Update queue
      state.queue = tracks;
      state.originalQueue = [...tracks];
      state.currentPlaylistId = playlistId;
      state.currentArtistId = artistId;
      state.playedTracks = [];
      
      // If we were playing a track that exists in the new queue, maintain its position
      if (currentTrackId) {
        const newIndex = tracks.findIndex(track => track.id === currentTrackId);
        
        if (newIndex !== -1) {
          state.currentIndex = newIndex;
          return; // Keep the current track and don't reset state
        }
      }
      
      // Default behavior if current track isn't in the new queue
      state.currentIndex = 0;
    },
    
    clearQueue: (state) => {
      state.queue = [];
      state.originalQueue = [];
      state.currentIndex = 0;
      state.musicId = null;
      state.isPlaying = false;
      state.currentPlaylistId = null;
      state.currentArtistId = null;
      state.playedTracks = [];
      state.isChanging = false;
      state.isLoadingTrack = false;
      state.actionLock = false;
    },
    
    addToQueue: (state, action) => {
      const tracks = Array.isArray(action.payload) ? action.payload : [action.payload];
      state.queue.push(...tracks);
      state.originalQueue.push(...tracks);
    },
    
    removeFromQueue: (state, action) => {
      const index = state.queue.findIndex(track => track.id === action.payload);
      if (index !== -1) {
        state.queue.splice(index, 1);
        state.originalQueue = state.originalQueue.filter(track => track.id !== action.payload);
        
        // Adjust currentIndex if necessary
        if (index < state.currentIndex) {
          state.currentIndex--;
        }
      }
    },
    
    playNext: (state) => {
      // Prevent rapid changes
      const now = Date.now();
      if (state.actionLock || (now - state.lastActionTimestamp < 500)) {
        return;
      }
      
      if (!state.queue || state.queue.length === 0) return;
      
      let nextIndex = state.currentIndex;
      
      if (state.repeat === 'one') {
        // Stay on current track
        nextIndex = state.currentIndex;
      } else {
        // Move to next track
        nextIndex = state.currentIndex + 1;
        
        // Handle end of queue
        if (nextIndex >= state.queue.length) {
          if (state.repeat === 'all') {
            nextIndex = 0;
          } else {
            // End of queue reached with no repeat
            state.isPlaying = false;
            return;
          }
        }
      }
      
      if (state.queue[state.currentIndex]) {
        state.playedTracks.push(state.queue[state.currentIndex].id);
      }
      
      // Update state
      state.currentIndex = nextIndex;
      state.musicId = state.queue[nextIndex].id;
      state.isChanging = true;
      state.isLoadingTrack = true;
      state.actionLock = true;
      state.lastActionTimestamp = now;
    },
    
    playPrevious: (state) => {
      // Prevent rapid changes
      const now = Date.now();
      if (state.actionLock || (now - state.lastActionTimestamp < 500)) {
        return;
      }
      
      if (state.queue.length === 0) return;
      
      let prevIndex = state.currentIndex - 1;
      
      if (prevIndex < 0) {
        if (state.repeat === 'all') {
          prevIndex = state.queue.length - 1;
        } else {
          return;
        }
      }
      
      state.currentIndex = prevIndex;
      state.musicId = state.queue[prevIndex].id;
      state.isChanging = true;
      state.isLoadingTrack = true;
      state.actionLock = true;
      state.lastActionTimestamp = now;
    },
    
    toggleShuffle: (state) => {
      // Don't allow shuffle changes during track changes
      if (state.isChanging || state.isLoadingTrack) {
        return;
      }
      
      state.shuffle = !state.shuffle;
      
      if (state.shuffle) {
        // Save current track
        const currentTrack = state.queue[state.currentIndex];
        
        // Shuffle remaining tracks
        const remainingTracks = state.queue
          .slice(state.currentIndex + 1)
          .sort(() => Math.random() - 0.5);
        
        // Reconstruct queue with current track at current position
        state.queue = [
          ...state.queue.slice(0, state.currentIndex),
          currentTrack,
          ...remainingTracks
        ];
      } else {
        // Restore original order while maintaining current track position
        const currentTrack = state.queue[state.currentIndex];
        const originalIndex = state.originalQueue.findIndex(track => track.id === currentTrack.id);
        
        state.queue = [...state.originalQueue];
        state.currentIndex = originalIndex;
      }
    },
    
    setRepeat: (state, action) => {
      // Don't allow repeat changes during track changes
      if (state.isChanging || state.isLoadingTrack) {
        return;
      }
      
      state.repeat = action.payload;
    },
    
    markAsPlayed: (state, action) => {
      const trackId = action.payload;
      if (!state.playedTracks.includes(trackId)) {
        state.playedTracks.push(trackId);
      }
    },
    
    clearPlayedTracks: (state) => {
      state.playedTracks = [];
    },
    
    moveTrack: (state, action) => {
      const { fromIndex, toIndex } = action.payload;
      const [movedTrack] = state.queue.splice(fromIndex, 1);
      state.queue.splice(toIndex, 0, movedTrack);
      
      // Adjust currentIndex if necessary
      if (state.currentIndex === fromIndex) {
        state.currentIndex = toIndex;
      } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
        state.currentIndex--;
      } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
        state.currentIndex++;
      }
    }
  }
});

export const {
  setMusicId,
  setIsPlaying,
  setChangeComplete,
  setQueue,
  addToQueue,
  removeFromQueue,
  clearQueue,
  playNext,
  playPrevious,
  toggleShuffle,
  setRepeat,
  moveTrack,
  markAsPlayed,
  clearPlayedTracks,
  setCurrentPlaylistId,
  setCurrentArtistId,
  setIsLiked,
  handlePageReload,
  setActionLock,
  setLoadingState,
} = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
