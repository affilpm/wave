import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  musicId: null,
  isPlaying: false,
  isChanging: false,
  queue: [],
  currentIndex: 0,
  repeat: 'none', // 'none' | 'all' | 'one'
  shuffle: false,
  originalQueue: [], 
  playedTracks: [],
};

const musicPlayerSlice = createSlice({
  name: "musicPlayer",
  initialState,
  reducers: {
    setMusicId: (state, action) => {
      const newMusicId = Number(action.payload);
      const newIndex = state.queue.findIndex(track => track.id === newMusicId);
      
      if (newIndex !== -1) {
          state.currentIndex = newIndex;
        }
      
      state.musicId = newMusicId;
      state.isChanging = true;
    },
    setIsPlaying: (state, action) => {
      state.isPlaying = action.payload;
    },
    setChangeComplete: (state) => {
      state.isChanging = false;
    },
    setQueue: (state, action) => {
      state.queue = action.payload;
      state.originalQueue = [...action.payload];
      state.currentIndex = 0;
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
    clearQueue: (state) => {
      state.queue = [];
      state.originalQueue = [];
      state.currentIndex = 0;
      state.musicId = null;
      state.isPlaying = false;
    },
    playNext: (state) => {
        if (!state.queue || state.queue.length === 0) {
            console.warn("Cannot play next: Queue is empty.");
            // Don't set isPlaying to false here
            return;
        }
    
        let nextIndex = state.currentIndex + 1;
    
        if (nextIndex >= state.queue.length) {
            if (state.repeat === "all") {
                nextIndex = 0; // Loop back to first track
            } else {
                console.warn("End of queue reached.");
                // Keep playing the current track instead of stopping
                return;
            }
        }
    
        // Move current track to playedTracks
        if (state.queue[state.currentIndex]) {
            state.playedTracks.push(state.queue[state.currentIndex].id);
        }
    
        // Update to next track
        state.currentIndex = nextIndex;
        state.musicId = state.queue[nextIndex]?.id || null;
    
        console.log("Switching to next song:", state.musicId);
    
        // Ensure playback continues
        state.isChanging = true;
        state.isPlaying = true;  // Always keep this true for continuous playback
    },


        
    playPrevious: (state) => {
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
    },
    toggleShuffle: (state) => {
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
  clearPlayedTracks
} = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;