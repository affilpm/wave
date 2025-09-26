import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

export const fetchStreamUrl = createAsyncThunk(
  'player/fetchStreamUrl',
  async (musicId, { rejectWithValue, signal, getState }) => {
    try {
      if (!musicId) {
        throw new Error('Music ID is required');
      }

      // Check if request is still relevant
      const currentState = getState();
      if (currentState.player?.currentMusicId !== musicId) {
        return rejectWithValue({ 
          type: 'STALE_REQUEST', 
          message: 'Request is no longer relevant' 
        });
      }

      console.log('Fetching stream URL for music ID:', musicId);
      
      const response = await api.get(`/api/music/${musicId}/stream/?t=${Date.now()}`, {
        signal,
        timeout: 15000,
      });

      // Validate response structure
      if (!response?.data) {
        throw new Error('Invalid response format');
      }

      const { url, name, artist, quality_served, user_preferred_quality, quality_matched, cover_photo } = response.data;

      if (!url) {
        throw new Error('No stream URL provided');
      }

      return {
        url: String(url),
        name: name || 'Unknown Track',
        artist: artist || 'Unknown Artist',
        cover_photo: cover_photo || '',
        qualityInfo: {
          served: quality_served || null,
          preferred: user_preferred_quality || null,
          matched: Boolean(quality_matched),
        }
      };
    } catch (err) {
      // Handle abort/cancellation
      if (err.name === 'CanceledError' || err.name === 'AbortError' || signal?.aborted) {
        return rejectWithValue({ type: 'ABORTED', message: 'Request cancelled' });
      }

      // Handle HTTP errors
      if (err.response?.status) {
        const status = err.response.status;
        const errorData = err.response.data;
        
        const errorMap = {
          403: { type: 'TOKEN_EXPIRED', message: 'Stream token expired, retrying...' },
          404: { type: 'NOT_FOUND', message: 'Track not found' },
          429: { type: 'RATE_LIMITED', message: 'Too many requests, please try again after a while.' },
          500: { type: 'SERVER_ERROR', message: 'Server error, please try again' },
          502: { type: 'SERVER_ERROR', message: 'Bad gateway' },
          503: { type: 'SERVER_ERROR', message: 'Service unavailable' },
        };

        const errorInfo = errorMap[status] || {
          type: 'API_ERROR',
          message: errorData?.error || `HTTP ${status} error`
        };

        return rejectWithValue(errorInfo);
      }
      
      // Handle network errors
      if (err.code === 'NETWORK_ERROR' || !err.response) {
        return rejectWithValue({ 
          type: 'NETWORK_ERROR', 
          message: 'Network error, check connection' 
        });
      }
      
      // Handle timeout
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        return rejectWithValue({
          type: 'TIMEOUT_ERROR',
          message: 'Request timed out'
        });
      }
      
      // Generic error
      return rejectWithValue({ 
        type: 'UNKNOWN_ERROR', 
        message: err.message || 'Unknown error occurred' 
      });
    }
  },
  {
    // Prevent duplicate requests for same music ID
    condition: (musicId, { getState }) => {
      const state = getState();
      const { currentMusicId, isLoading, streamUrl } = state.player;
      
      // Don't fetch if already loading the same music or already have stream
      return !(isLoading && currentMusicId === musicId) && 
             !(streamUrl && currentMusicId === musicId);
    }
  }
);

// Helper functions for state management
const createTrackObject = (item) => {
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
};

const resetStreamState = (state) => {
  state.streamUrl = null;
  state.musicDetails = { name: '', artist: '', cover_photo: '' };
  state.error = null;
  state.currentTime = 0;
  state.duration = 0;
  state.qualityInfo = {
    served: null,
    preferred: null,
    matched: false
  };
  state.isLoading = false; // Also reset loading state
};

// Complete reset for when no song is selected
const resetAllPlayerData = (state) => {
  state.currentMusicId = null;
  state.queue = [];
  state.currentIndex = null;
  state.isPlaying = false;
  state.volume = 1;
  state.isMuted = false;
  state.isShuffled = false;
  state.streamUrl = null;
  state.musicDetails = { name: '', artist: '', cover_photo: '' };
  state.qualityInfo = { served: null, preferred: null, matched: false };
  state.isLoading = false;
  state.error = null;
  state.currentTime = 0;
  state.duration = 0;
  state.shuffleHistory = [];
  state.lastFetchTime = 0;
  state.fetchAttempts = 0;
};

const getNextIndex = (state) => {
  if (state.queue.length === 0) return -1;

  if (!state.isShuffled) {
    const nextIndex = state.currentIndex + 1;
    return nextIndex < state.queue.length ? nextIndex : -1;
  }

  // For shuffled mode
  const playedIds = new Set(state.shuffleHistory);
  const availableIndices = state.queue
    .map((_, index) => index)
    .filter(index => !playedIds.has(state.queue[index].id));

  if (availableIndices.length === 0) {
    // Reset shuffle history when all tracks have been played
    state.shuffleHistory = state.currentMusicId ? [state.currentMusicId] : [];
    return state.queue.length > 0 ? 0 : -1;
  }

  // Randomly select from available indices
  return availableIndices[Math.floor(Math.random() * availableIndices.length)];
};

const getPreviousIndex = (state) => {
  if (state.queue.length === 0) return -1;

  const prevIndex = state.currentIndex - 1;
  return prevIndex >= 0 ? prevIndex : -1;
};

const initialState = {
  // Music state
  currentMusicId: null,
  queue: [],
  currentIndex: null,
  
  // Playback state
  isPlaying: false,
  volume: 1,
  isMuted: false,
  isShuffled: false,
  
  // Stream state
  streamUrl: null,
  musicDetails: { name: '', artist: '', cover_photo: '' },
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
  
  // Request state
  lastFetchTime: 0,
  fetchAttempts: 0,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setCurrentMusic: (state, action) => {
      const musicData = action.payload;
      const newMusicId = typeof musicData === 'object' && musicData !== null 
        ? musicData.id 
        : musicData;
      
      if (!newMusicId) {
        // If no music ID provided, clear all data
        resetAllPlayerData(state);
        return;
      }

      // Handle queue updates
      if (typeof musicData === 'object' && musicData !== null) {
        const existingIndex = state.queue.findIndex(track => track.id === newMusicId);
        if (existingIndex === -1) {
          state.queue.push(createTrackObject(musicData));
          state.currentIndex = state.queue.length - 1;
        } else {
          state.currentIndex = existingIndex;
        }
      } else {
        const index = state.queue.findIndex(track => track.id === newMusicId);
        if (index !== -1) {
          state.currentIndex = index;
        }
      }
      
      // Only reset if it's actually a different track
      if (state.currentMusicId !== newMusicId) {
        state.currentMusicId = newMusicId;
        resetStreamState(state);
        state.fetchAttempts = 0;
        
        // Add to shuffle history only if shuffled and not already in history
        if (state.isShuffled && !state.shuffleHistory.includes(newMusicId)) {
          state.shuffleHistory.push(newMusicId);
          // Keep history size manageable
          if (state.shuffleHistory.length > state.queue.length) {
            state.shuffleHistory = state.shuffleHistory.slice(-state.queue.length);
          }
        }
      }
    },

    setQueue: (state, action) => {
      const newQueue = Array.isArray(action.payload) ? action.payload : [];
      
      if (newQueue.length === 0) {
        // If empty queue provided, clear all data
        resetAllPlayerData(state);
        return;
      }
      
      state.queue = newQueue.map(createTrackObject);
      state.currentIndex = 0;
      state.shuffleHistory = [];
      state.fetchAttempts = 0;
      
      if (state.queue.length > 0) {
        const firstTrackId = state.queue[0].id;
        if (!state.currentMusicId) {
          state.currentMusicId = firstTrackId;
        }
      } else {
        state.currentMusicId = null;
        resetStreamState(state);
      }
    },

    addToQueue: (state, action) => {
      const items = Array.isArray(action.payload) ? action.payload : [action.payload];
      const newTracks = items.map(createTrackObject);
      
      // Filter out duplicates
      const existingIds = new Set(state.queue.map(track => track.id));
      const uniqueNewTracks = newTracks.filter(track => !existingIds.has(track.id));
      
      state.queue.push(...uniqueNewTracks);
    },

    removeFromQueue: (state, action) => {
      const musicId = action.payload;
      const indexToRemove = state.queue.findIndex(track => track.id === musicId);
      
      if (indexToRemove === -1) return;

      state.queue.splice(indexToRemove, 1);
      
      // Adjust current index
      if (indexToRemove < state.currentIndex) {
        state.currentIndex = Math.max(0, state.currentIndex - 1);
      } else if (indexToRemove === state.currentIndex) {
        // Current track was removed
        if (state.queue.length === 0) {
          // NEW: If queue becomes empty, clear all data
          resetAllPlayerData(state);
        } else {
          // Ensure index is within bounds
          state.currentIndex = Math.min(state.currentIndex, state.queue.length - 1);
          state.currentMusicId = state.queue[state.currentIndex]?.id || null;
          resetStreamState(state);
        }
      }
    },

    playNext: (state) => {
      const nextIndex = getNextIndex(state);
      
      if (nextIndex === -1) {
        // End of queue behavior
        if (state.queue.length === 1) {
          // Single track: pause at the end
          state.isPlaying = false;
          // Keep the track at the current position (don't reset)
        } else if (state.queue.length > 1) {
          // Multiple tracks: reset to first track and pause
          state.currentIndex = 0;
          state.currentMusicId = state.queue[0]?.id || null;
          state.isPlaying = false;
          resetStreamState(state);
          state.fetchAttempts = 0;
          // Reset shuffle history for fresh cycle
          if (state.isShuffled) {
            state.shuffleHistory = state.currentMusicId ? [state.currentMusicId] : [];
          }
        } else {
          // Empty queue - clear all data
          resetAllPlayerData(state);
        }
        return;
      }
      
      if (nextIndex !== state.currentIndex) {
        state.currentIndex = nextIndex;
        state.currentMusicId = state.queue[nextIndex]?.id || null;
        resetStreamState(state);
        state.fetchAttempts = 0;
        state.isPlaying = true;
        // Add to shuffle history
        if (state.isShuffled && state.currentMusicId && !state.shuffleHistory.includes(state.currentMusicId)) {
          state.shuffleHistory.push(state.currentMusicId);
        }
      }
    },

    playPrevious: (state) => {
      const prevIndex = getPreviousIndex(state);
      
      if (prevIndex !== -1 && prevIndex !== state.currentIndex) {
        state.currentIndex = prevIndex;
        state.currentMusicId = state.queue[prevIndex]?.id || null;
        resetStreamState(state);
        state.fetchAttempts = 0;
        state.isPlaying = true; // Ensure playback continues
      }
    },

    moveInQueue: (state, action) => {
      const { fromIndex, toIndex } = action.payload;
      
      if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) ||
          fromIndex < 0 || fromIndex >= state.queue.length ||
          toIndex < 0 || toIndex >= state.queue.length) {
        return;
      }
      
      const [movedTrack] = state.queue.splice(fromIndex, 1);
      state.queue.splice(toIndex, 0, movedTrack);
      
      // Update current index
      if (fromIndex === state.currentIndex) {
        state.currentIndex = toIndex;
      } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
        state.currentIndex -= 1;
      } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
        state.currentIndex += 1;
      }
    },

    clearQueue: (state) => {
      // NEW: Use complete reset when clearing queue
      resetAllPlayerData(state);
    },

    // Action to clear current music and all related data
    clearCurrentMusic: (state) => {
      resetAllPlayerData(state);
    },

    // Playback controls with validation
    setIsPlaying: (state, action) => {
      state.isPlaying = Boolean(action.payload);
    },

    setVolume: (state, action) => {
      const volume = Math.max(0, Math.min(1, Number(action.payload) || 0));
      state.volume = volume;
      state.isMuted = volume === 0;
    },

    setIsMuted: (state, action) => {
      state.isMuted = Boolean(action.payload);
    },

    setCurrentTime: (state, action) => {
      const time = Number(action.payload) || 0;
      state.currentTime = Math.max(0, isFinite(time) ? time : 0);
    },

    setDuration: (state, action) => {
      const duration = Number(action.payload) || 0;
      state.duration = Math.max(0, isFinite(duration) ? duration : 0);
    },

    toggleShuffle: (state) => {
      state.isShuffled = !state.isShuffled;
      if (!state.isShuffled) {
        state.shuffleHistory = [];
      } else {
        // Start fresh shuffle cycle with current track
        state.shuffleHistory = state.currentMusicId ? [state.currentMusicId] : [];
      }
    },

    refreshStream: (state) => {
      resetStreamState(state);
      state.isPlaying = false;
      state.fetchAttempts = 0;
    },

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
          state.lastFetchTime = Date.now();
          state.fetchAttempts += 1;
        }
      })
      .addCase(fetchStreamUrl.fulfilled, (state, action) => {
        const musicId = action.meta.arg;
        if (state.currentMusicId === musicId) {
          state.isLoading = false;
          state.streamUrl = action.payload.url;
          state.musicDetails = {
            name: action.payload.name,
            artist: action.payload.artist,
            cover_photo: action.payload.cover_photo
          };
          state.qualityInfo = action.payload.qualityInfo;
          state.error = null;
          state.fetchAttempts = 0;
          state.isPlaying = true;
        }
      })
      .addCase(fetchStreamUrl.rejected, (state, action) => {
        const musicId = action.meta.arg;
        if (state.currentMusicId === musicId) {
          state.isLoading = false;
          
          const errorType = action.payload?.type;
          
          if (['ABORTED', 'STALE_REQUEST'].includes(errorType)) {
            return;
          }
          
          // Handle rate-limiting: clear all player data
          if (errorType === 'RATE_LIMITED') {
            resetAllPlayerData(state); // Clear all data, including currentMusicId and queue
            state.error = action.payload?.message || 'Too many requests, please try again later.';
            return;
          }
          
          if (errorType === 'TOKEN_EXPIRED') {
            state.error = null;
          } else {
            resetStreamState(state);
            state.error = action.payload?.message || 'Failed to fetch stream';
          }
        }
      });
  },
});

// Export actions
export const {
  setCurrentMusic,
  setQueue,
  addToQueue,
  removeFromQueue,
  playNext,
  playPrevious,
  moveInQueue,
  clearQueue,
  clearCurrentMusic, // Export the new action
  setIsPlaying,
  setVolume,
  setIsMuted,
  setCurrentTime,
  setDuration,
  toggleShuffle,
  refreshStream,
  clearError,
} = playerSlice.actions;

export const selectCurrentTrack = (state) => {
  const { queue, currentIndex } = state.player || {};
  return queue?.[currentIndex] || null;
};

export const selectQueueLength = (state) => state.player?.queue?.length || 0;

export const selectNextTrack = (state) => {
  const { queue, currentIndex } = state.player || {};
  if (!queue?.length) return null;
  
  const nextIndex = currentIndex + 1;
  if (nextIndex < queue.length) {
    return queue[nextIndex];
  }
  return null;
};

export const selectPreviousTrack = (state) => {
  const { queue, currentIndex } = state.player || {};
  if (!queue?.length) return null;
  
  const prevIndex = currentIndex - 1;
  if (prevIndex >= 0) {
    return queue[prevIndex];
  }
  return null;
};

export const selectPlayerStatus = (state) => {
  const player = state.player || {};
  return {
    hasQueue: player.queue?.length > 0,   
    isLoading: player.isLoading,
    hasError: !!player.error,
    hasStreamUrl: !!player.streamUrl,
    canPlayNext: !!selectNextTrack(state),
    canPlayPrevious: !!selectPreviousTrack(state),
  };
};

export default playerSlice.reducer;