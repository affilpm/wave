import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

// Simplified async thunk for fetching stream URL
export const fetchStreamUrl = createAsyncThunk(
  'player/fetchStreamUrl',
  async (musicId, { rejectWithValue, signal }) => {
    try {
      if (!musicId) {
        throw new Error('Music ID is required');
      }

      console.log('Fetching stream URL for music ID:', musicId);
      
      const response = await api.get(`/api/music/${musicId}/stream/?t=${Date.now()}`, {
        signal,
        timeout: 15000,
      });

      const { url, name, artist, quality_served, user_preferred_quality, quality_matched } = response.data;

      if (!url) {
        throw new Error('No stream URL provided');
      }

      return {
        url,
        name: name || 'Unknown Track',
        artist: artist || 'Unknown Artist',
        qualityInfo: {
          served: quality_served || null,
          preferred: user_preferred_quality || null,
          matched: Boolean(quality_matched),
        }
      };
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || signal?.aborted) {
        return rejectWithValue({ type: 'ABORTED', message: 'Request cancelled' });
      }

      if (err.response) {
        const status = err.response.status;
        
        if (status === 403) {
          return rejectWithValue({ 
            type: 'TOKEN_EXPIRED', 
            message: 'Stream token expired, retrying...' 
          });
        }
        
        if (status >= 500) {
          return rejectWithValue({ 
            type: 'SERVER_ERROR', 
            message: 'Server error, please try again' 
          });
        }
        
        return rejectWithValue({ 
          type: 'API_ERROR', 
          message: err.response.data?.error || `HTTP ${status} error` 
        });
      }
      
      if (!err.response) {
        return rejectWithValue({ 
          type: 'NETWORK_ERROR', 
          message: 'Network error, check connection' 
        });
      }
      
      return rejectWithValue({ 
        type: 'UNKNOWN_ERROR', 
        message: err.message || 'Unknown error occurred' 
      });
    }
  }
);

const initialState = {
  // Music state
  currentMusicId: 15,
  queue: [], // Array of music objects: [{ id, name, artist, album, duration, etc. }]
  currentIndex: 0,
  
  // Playback state
  isPlaying: false,
  volume: 1,
  isMuted: false,
  isShuffled: false,
  repeatMode: 'none', // 'none', 'single', 'all'
  
  // Stream state
  streamUrl: null,
  musicDetails: { name: '', artist: '' },
  qualityInfo: {
    served: null,
    preferred: null,
    matched: false
  },
  
  // UI state
  isLoading: false,
  error: null,
  currentTime: 0,
  duration: 0,
  
  // Shuffle state
  shuffleHistory: [],
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    // Music control
    setCurrentMusic: (state, action) => {
      const musicData = action.payload; // Can be music object or just ID
      let newMusicId;
      
      if (typeof musicData === 'object' && musicData !== null) {
        newMusicId = musicData.id;
        // If it's a music object, make sure it's in the queue
        const existingIndex = state.queue.findIndex(track => track.id === newMusicId);
        if (existingIndex === -1) {
          state.queue.push(musicData);
          state.currentIndex = state.queue.length - 1;
        } else {
          state.currentIndex = existingIndex;
        }
      } else {
        newMusicId = musicData;
        // Find in existing queue
        const index = state.queue.findIndex(track => track.id === newMusicId);
        if (index !== -1) {
          state.currentIndex = index;
        }
      }
      
      if (state.currentMusicId !== newMusicId) {
        state.currentMusicId = newMusicId;
        
        // Reset stream state
        state.streamUrl = null;
        state.musicDetails = { name: '', artist: '' };
        state.error = null;
        state.currentTime = 0;
        state.duration = 0;
        
        // Add to shuffle history
        if (state.isShuffled && newMusicId && !state.shuffleHistory.includes(newMusicId)) {
          state.shuffleHistory.push(newMusicId);
          if (state.shuffleHistory.length > 50) {
            state.shuffleHistory = state.shuffleHistory.slice(-50);
          }
        }
      }
    },

    setQueue: (state, action) => {
      const newQueue = Array.isArray(action.payload) ? action.payload : [];
      state.queue = newQueue.map(item => {
        // Ensure each item has required properties
        if (typeof item === 'object' && item !== null) {
          return {
            id: item.id,
            name: item.name || item.title || 'Unknown Track',
            artist: item.artist || 'Unknown Artist',
            album: item.album || '',
            duration: item.duration || 0,
            genre: item.genre || '',
            year: item.year || null,
            ...item // Spread to include any additional properties
          };
        }
        // If it's just an ID, create a minimal object
        return {
          id: item,
          name: `Track ${item}`,
          artist: 'Unknown Artist',
          album: '',
          duration: 0,
        };
      });
      
      state.currentIndex = 0;
      state.shuffleHistory = [];
      
      if (state.queue.length > 0 && !state.currentMusicId) {
        state.currentMusicId = state.queue[0].id;
      }
    },

    addToQueue: (state, action) => {
      const items = Array.isArray(action.payload) ? action.payload : [action.payload];
      const newTracks = items.map(item => {
        if (typeof item === 'object' && item !== null) {
          return {
            id: item.id,
            name: item.name || item.title || 'Unknown Track',
            artist: item.artist || 'Unknown Artist',
            album: item.album || '',
            duration: item.duration || 0,
            genre: item.genre || '',
            year: item.year || null,
            ...item
          };
        }
        return {
          id: item,
          name: `Track ${item}`,
          artist: 'Unknown Artist',
          album: '',
          duration: 0,
        };
      });
      
      // Filter out duplicates
      const existingIds = state.queue.map(track => track.id);
      const uniqueNewTracks = newTracks.filter(track => !existingIds.includes(track.id));
      
      state.queue.push(...uniqueNewTracks);
    },

    removeFromQueue: (state, action) => {
      const musicId = action.payload;
      const indexToRemove = state.queue.findIndex(track => track.id === musicId);
      
      if (indexToRemove !== -1) {
        state.queue.splice(indexToRemove, 1);
        
        // Adjust current index if needed
        if (indexToRemove < state.currentIndex) {
          state.currentIndex -= 1;
        } else if (indexToRemove === state.currentIndex) {
          // Current track was removed
          if (state.queue.length === 0) {
            state.currentMusicId = null;
            state.currentIndex = 0;
          } else {
            // Play next track in queue, or first if we were at the end
            if (state.currentIndex >= state.queue.length) {
              state.currentIndex = 0;
            }
            state.currentMusicId = state.queue[state.currentIndex]?.id || null;
            state.streamUrl = null;
            state.currentTime = 0;
          }
        }
      }
    },

    playNext: (state) => {
      if (state.queue.length === 0) return;
      if (state.repeatMode === 'single') return;
      
      let nextIndex;
      
      if (state.isShuffled) {
        // Simple shuffle
        const availableIndices = state.queue
          .map((_, index) => index)
          .filter(index => index !== state.currentIndex);
        
        if (availableIndices.length > 0) {
          nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        } else {
          nextIndex = 0;
        }
      } else {
        if (state.currentIndex < state.queue.length - 1) {
          nextIndex = state.currentIndex + 1;
        } else if (state.repeatMode === 'all') {
          nextIndex = 0;
        } else {
          state.isPlaying = false;
          return;
        }
      }
      
      state.currentIndex = nextIndex;
      state.currentMusicId = state.queue[nextIndex]?.id || null;
      state.streamUrl = null; // Clear to trigger new fetch
      state.currentTime = 0;
    },

    playPrevious: (state) => {
      if (state.queue.length === 0) return;
      
      let prevIndex;
      
      if (state.currentIndex > 0) {
        prevIndex = state.currentIndex - 1;
      } else if (state.repeatMode === 'all') {
        prevIndex = state.queue.length - 1;
      } else {
        prevIndex = 0;
      }
      
      state.currentIndex = prevIndex;
      state.currentMusicId = state.queue[prevIndex]?.id || null;
      state.streamUrl = null; // Clear to trigger new fetch
      state.currentTime = 0;
    },

    // Queue management
    moveInQueue: (state, action) => {
      const { fromIndex, toIndex } = action.payload;
      if (fromIndex < 0 || fromIndex >= state.queue.length || 
          toIndex < 0 || toIndex >= state.queue.length) {
        return;
      }
      
      const [movedTrack] = state.queue.splice(fromIndex, 1);
      state.queue.splice(toIndex, 0, movedTrack);
      
      // Update current index if needed
      if (fromIndex === state.currentIndex) {
        state.currentIndex = toIndex;
      } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
        state.currentIndex -= 1;
      } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
        state.currentIndex += 1;
      }
    },

    clearQueue: (state) => {
      state.queue = [];
      state.currentIndex = 0;
      state.currentMusicId = null;
      state.streamUrl = null;
      state.isPlaying = false;
      state.currentTime = 0;
      state.duration = 0;
      state.shuffleHistory = [];
    },

    // Playback controls
    setIsPlaying: (state, action) => {
      state.isPlaying = Boolean(action.payload);
    },

    setVolume: (state, action) => {
      const volume = Math.max(0, Math.min(1, action.payload));
      state.volume = volume;
      state.isMuted = volume === 0;
    },

    setIsMuted: (state, action) => {
      state.isMuted = Boolean(action.payload);
    },

    setCurrentTime: (state, action) => {
      const time = Math.max(0, action.payload);
      state.currentTime = isFinite(time) ? time : 0;
    },

    setDuration: (state, action) => {
      const duration = Math.max(0, action.payload);
      state.duration = isFinite(duration) ? duration : 0;
    },

    // Playback modes
    toggleShuffle: (state) => {
      state.isShuffled = !state.isShuffled;
      if (!state.isShuffled) {
        state.shuffleHistory = [];
      }
    },

    setRepeatMode: (state, action) => {
      const validModes = ['none', 'single', 'all'];
      if (validModes.includes(action.payload)) {
        state.repeatMode = action.payload;
      }
    },

    // Stream control
    refreshStream: (state) => {
      state.streamUrl = null;
      state.error = null;
      state.isPlaying = false;
      state.currentTime = 0;
    },

    // UI control
    clearError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchStreamUrl.pending, (state, action) => {
        const musicId = action.meta.arg;
        if (state.currentMusicId === musicId) {
          state.isLoading = true;
          state.error = null;
        }
      })
      .addCase(fetchStreamUrl.fulfilled, (state, action) => {
        const musicId = action.meta.arg;
        if (state.currentMusicId === musicId) {
          state.isLoading = false;
          state.streamUrl = action.payload.url;
          state.musicDetails = {
            name: action.payload.name,
            artist: action.payload.artist
          };
          state.qualityInfo = action.payload.qualityInfo;
          state.error = null;
        }
      })
      .addCase(fetchStreamUrl.rejected, (state, action) => {
        const musicId = action.meta.arg;
        if (state.currentMusicId === musicId) {
          state.isLoading = false;
          
          if (action.payload?.type === 'ABORTED') {
            return;
          }
          
          // Don't show error for token expired (will be retried)
          if (action.payload?.type === 'TOKEN_EXPIRED') {
            state.error = null;
          } else {
            state.streamUrl = null;
            state.error = action.payload?.message || 'Failed to fetch stream';
          }
        }
      });
  },
});

export const {
  setCurrentMusic,
  setQueue,
  addToQueue,
  removeFromQueue,
  playNext,
  playPrevious,
  moveInQueue,
  clearQueue,
  setIsPlaying,
  setVolume,
  setIsMuted,
  setCurrentTime,
  setDuration,
  toggleShuffle,
  setRepeatMode,
  refreshStream,
  clearError,
} = playerSlice.actions;

// Selectors
export const selectCurrentTrack = (state) => {
  const queue = state.player.queue;
  const currentIndex = state.player.currentIndex;
  return queue[currentIndex] || null;
};

export const selectQueueLength = (state) => state.player.queue.length;

export const selectNextTrack = (state) => {
  const queue = state.player.queue;
  const currentIndex = state.player.currentIndex;
  const nextIndex = currentIndex + 1;
  
  if (nextIndex < queue.length) {
    return queue[nextIndex];
  } else if (state.player.repeatMode === 'all' && queue.length > 0) {
    return queue[0];
  }
  return null;
};

export const selectPreviousTrack = (state) => {
  const queue = state.player.queue;
  const currentIndex = state.player.currentIndex;
  const prevIndex = currentIndex - 1;
  
  if (prevIndex >= 0) {
    return queue[prevIndex];
  } else if (state.player.repeatMode === 'all' && queue.length > 0) {
    return queue[queue.length - 1];
  }
  return null;
};

export default playerSlice.reducer;