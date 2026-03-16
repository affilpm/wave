import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../api';
import { PlayerState, Track, PlayerStatus, RepeatMode, PlayerContext } from '../../types/player';

export const fetchStreamUrl = createAsyncThunk(
  'player/fetchStreamUrl',
  async (musicId: string | number, { rejectWithValue, signal, getState }) => {
    try {
      if (!musicId) {
        throw new Error('Music ID is required');
      }

      // Check if request is still relevant
      const state = getState() as { player: PlayerState };
      if (state.player.currentTrack?.id !== musicId) {
        return rejectWithValue({ 
          type: 'STALE_REQUEST', 
          message: 'Request is no longer relevant' 
        });
      }

      const response = await api.get(`/api/v1/music/${musicId}/stream/?t=${Date.now()}`, {
        signal,
        timeout: 15000,
      });

      if (!response?.data) {
        throw new Error('Invalid response format');
      }

      const { url, name, artist, cover_photo } = response.data;

      if (!url) {
        throw new Error('No stream URL provided');
      }

      return {
        id: musicId,
        url: String(url),
        name: name || 'Unknown Track',
        artist: artist || 'Unknown Artist',
        cover_photo: cover_photo || '',
      };
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || signal?.aborted) {
        return rejectWithValue({ type: 'ABORTED', message: 'Request cancelled' });
      }
      return rejectWithValue({ 
        type: 'API_ERROR', 
        message: err.message || 'Unknown error occurred' 
      });
    }
  }
);

const initialState: PlayerState = {
  currentTrack: null,
  queue: [],
  originalQueue: [],
  queueIndex: -1,
  status: 'idle',
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  shuffleMode: false,
  repeatMode: 'off',
  isLiked: false,
  dominantColor: '#a855f7',
  isFullPlayerOpen: false,
  isQueueOpen: false,
  userQueue: [],
  history: [],
  currentContext: null,
};

// Helper for Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    playTrack: (state, action: PayloadAction<Track>) => {
      // Ensure history exists (persisted state migration)
      if (!state.history) state.history = [];
      if (!state.userQueue) state.userQueue = [];

      // Add current track to history
      if (state.currentTrack) {
        state.history.push(state.currentTrack);
        if (state.history.length > 50) state.history.shift();
      }

      state.currentTrack = action.payload;
      state.status = 'loading';
      
      const exists = state.originalQueue.find(t => String(t.id) === String(action.payload.id));
      if (!exists) {
        state.originalQueue = [action.payload];
        state.queue = [action.payload];
        state.queueIndex = 0;
      } else {
        const index = state.queue.findIndex(t => String(t.id) === String(action.payload.id));
        if (index !== -1) {
          state.queueIndex = index;
        }
      }
      
      state.currentTime = 0;
    },
    
    playTrackAtIndex: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      if (index >= 0 && index < state.queue.length) {
        if (!state.history) state.history = [];
        if (!state.userQueue) state.userQueue = [];

        if (state.currentTrack) {
          state.history.push(state.currentTrack);
          if (state.history.length > 50) state.history.shift();
        }

        state.queueIndex = index;
        state.currentTrack = state.queue[index];
        state.status = 'loading';
        state.currentTime = 0;

        // If played from queue, remove from userQueue if it was there
        if (state.currentTrack) {
          const currentId = String(state.currentTrack.id);
          state.userQueue = state.userQueue.filter(t => String(t.id) !== currentId);
        }
      }
    },
    
    pause: (state) => {
      if (state.status === 'playing' || state.status === 'buffering') {
        state.status = 'paused';
      }
    },
    
    resume: (state) => {
      if (state.currentTrack) {
        state.status = 'playing';
      }
    },
    
    togglePlay: (state) => {
      if (state.currentTrack) {
        if (state.status === 'playing' || state.status === 'buffering') {
          state.status = 'paused';
        } else {
          state.status = 'playing';
        }
      }
    },
    
    stop: (state) => {
      state.status = 'idle';
      state.currentTime = 0;
    },
    
    setStatus: (state, action: PayloadAction<PlayerStatus>) => {
      state.status = action.payload;
    },
    
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = Math.max(0, action.payload);
    },
    
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = Math.max(0, action.payload);
    },
    
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = Math.max(0, Math.min(1, action.payload));
      if (state.volume > 0 && state.isMuted) {
        state.isMuted = false;
      }
    },
    
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },
    
    setQueue: (state, action: PayloadAction<{ tracks: Track[], startIndex?: number, context?: PlayerContext } | Track[]>) => {
      let tracks: Track[] = [];
      let startIndex = 0;
      let context: PlayerContext | null = null;
      
      if (Array.isArray(action.payload)) {
        tracks = action.payload;
      } else {
        tracks = action.payload.tracks || [];
        startIndex = action.payload.startIndex || 0;
        context = action.payload.context || null;
      }
      
      state.originalQueue = [...tracks];
      state.userQueue = []; // Reset user manual queue when context changes
      state.currentContext = context;
      
      if (state.shuffleMode) {
        if (tracks.length > 0) {
          const firstTrack = tracks[startIndex];
          const remaining = tracks.filter((_, i) => i !== startIndex);
          state.queue = [firstTrack, ...shuffleArray(remaining)];
          state.queueIndex = 0;
          state.currentTrack = firstTrack;
          state.status = 'loading';
          state.currentTime = 0;
        } else {
          state.queue = [];
          state.queueIndex = -1;
          state.currentTrack = null;
        }
      } else {
        state.queue = [...tracks];
        state.queueIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
        if (tracks.length > 0) {
          state.currentTrack = state.queue[state.queueIndex];
          state.status = 'loading';
          state.currentTime = 0;
        } else {
          state.currentTrack = null;
          state.queueIndex = -1;
        }
      }
    },
    
    addToQueue: (state, action: PayloadAction<Track | Track[]>) => {
      if (!state.userQueue) state.userQueue = [];
      const tracks = Array.isArray(action.payload) ? action.payload : [action.payload];
      state.userQueue.push(...tracks);
      
      // Update originalQueue to keep it persistent across shuffles
      state.originalQueue.push(...tracks);
      
      // Find where current userQueue ends in the active queue
      // We insert after the last userQueue item that is currently after queueIndex
      let insertIndex = state.queueIndex + 1;
      while (insertIndex < state.queue.length && state.userQueue.some(t => t.id === state.queue[insertIndex].id)) {
        insertIndex++;
      }
      
      state.queue.splice(insertIndex, 0, ...tracks);
    },

    playNext: (state, action: PayloadAction<Track>) => {
      if (!state.userQueue) state.userQueue = [];
      const track = action.payload;
      state.userQueue.unshift(track);
      
      // Also add to originalQueue (at the end or near current pos?)
      // For playNext, we usually want it to stay in the set if shuffle is toggled
      state.originalQueue.push(track);
      
      // Insert immediately after current track
      const insertIndex = state.queueIndex + 1;
      state.queue.splice(insertIndex, 0, track);
    },
    
    removeFromQueue: (state, action: PayloadAction<string | number>) => {
      if (!state.userQueue) state.userQueue = [];
      const id = action.payload;
      state.originalQueue = state.originalQueue.filter(t => String(t.id) !== String(id));
      state.userQueue = state.userQueue.filter(t => String(t.id) !== String(id));
      
      const indexToRemove = state.queue.findIndex(t => t.id === id);
      if (indexToRemove !== -1) {
        state.queue.splice(indexToRemove, 1);
        if (state.queueIndex > indexToRemove) {
          state.queueIndex -= 1;
        } else if (state.queueIndex === indexToRemove && state.queue.length > 0) {
          if (state.queueIndex >= state.queue.length) {
            state.queueIndex = 0;
          }
          state.currentTrack = state.queue[state.queueIndex];
          state.status = 'loading';
          state.currentTime = 0;
        } else if (state.queue.length === 0) {
          state.currentTrack = null;
          state.queueIndex = -1;
          state.status = 'idle';
        }
      }
    },
    
    clearQueue: (state) => {
      state.queue = [];
      state.originalQueue = [];
      state.queueIndex = -1;
      state.currentTrack = null;
      state.status = 'idle';
      state.currentTime = 0;
    },
    
    handleTrackEnd: (state) => {
      if (state.queue.length === 0) return;

      if (state.repeatMode === 'one') {
        state.currentTime = 0;
        state.status = 'loading'; // Trigger re-init/play
        return;
      }

      // Default skip next logic
      const isLastTrack = state.queueIndex === state.queue.length - 1;
      
      if (isLastTrack) {
        if (state.repeatMode === 'all') {
          state.queueIndex = 0;
          state.currentTrack = state.queue[0];
          state.currentTime = 0;
          state.status = 'loading';
        } else {
          state.status = 'idle';
          state.currentTime = 0;
        }
      } else {
        state.queueIndex += 1;
        state.currentTrack = state.queue[state.queueIndex];
        state.currentTime = 0;
        state.status = 'loading';
        if (state.userQueue) {
          state.userQueue = state.userQueue.filter(t => t.id !== state.currentTrack?.id);
        }
      }
    },
    
    skipNext: (state) => {
      if (state.queue.length === 0) return;
      
      // Manual skip usually overrides "Repeat One" in most players (Spotify)
      // If we want to strictly respect it, we'd keep the check, but user reported "not changing"
      // so we remove the early return to ensure it always moves forward.

      // Add to history
      if (!state.history) state.history = [];
      if (!state.userQueue) state.userQueue = [];

      if (state.currentTrack) {
        state.history.push(state.currentTrack);
        if (state.history.length > 50) state.history.shift();
      }
      
      const isLastTrack = state.queueIndex === state.queue.length - 1;
      
      if (isLastTrack) {
        if (state.repeatMode === 'all') {
          state.queueIndex = 0;
          state.currentTrack = state.queue[0];
          state.currentTime = 0;
          state.status = 'loading';
        } else {
          state.status = 'idle';
          state.currentTime = 0;
        }
      } else {
        state.queueIndex += 1;
        state.currentTrack = state.queue[state.queueIndex];
        state.currentTime = 0;
        state.status = 'loading';

        // If played a userQueue track, remove it from tracking
        state.userQueue = state.userQueue.filter(t => t.id !== state.currentTrack?.id);
      }
    },
    
    skipPrevious: (state) => {
      if (state.queue.length === 0) return;
      if (!state.history) state.history = [];
      if (!state.userQueue) state.userQueue = [];
      
      if (state.currentTime > 3) {
        // Restart current track
        state.currentTime = 0;
      } else {
        // Go back
        if (state.queueIndex > 0) {
          state.queueIndex -= 1;
          state.currentTrack = state.queue[state.queueIndex];
          state.currentTime = 0;
          state.status = 'loading';
        } else {
          if (state.repeatMode === 'all') {
            state.queueIndex = state.queue.length - 1;
            state.currentTrack = state.queue[state.queueIndex];
            state.currentTime = 0;
            state.status = 'loading';
          } else {
            // First track, just restart it
            state.currentTime = 0;
          }
        }
      }
    },
    
    toggleShuffle: (state) => {
      if (!state.userQueue) state.userQueue = [];
      state.shuffleMode = !state.shuffleMode;
      
      if (state.shuffleMode) {
        if (state.currentTrack && state.queue.length > 0) {
          const currentId = state.currentTrack.id;
          const remainingContext = state.originalQueue.filter(t => t.id !== currentId);
          // Keep userQueue at the top after current track, then shuffle context
          state.queue = [state.currentTrack, ...state.userQueue, ...shuffleArray(remainingContext)];
          state.queueIndex = 0;
        }
      } else {
        state.queue = [...state.originalQueue];
        if (state.currentTrack) {
          const currentId = state.currentTrack.id;
          const index = state.queue.findIndex(t => t.id === currentId);
          state.queueIndex = index !== -1 ? index : 0;
          
          // Re-inject userQueue after current track site
          if (state.userQueue.length > 0) {
            state.queue.splice(state.queueIndex + 1, 0, ...state.userQueue);
          }
        }
      }
    },

    toggleShufflePlay: (state, action: PayloadAction<Track[]>) => {
      const tracks = action.payload;
      if (tracks.length === 0) return;

      state.originalQueue = [...tracks];
      state.userQueue = [];
      state.shuffleMode = true;

      const randomIndex = Math.floor(Math.random() * tracks.length);
      const firstTrack = tracks[randomIndex];
      const remaining = tracks.filter((_, i) => i !== randomIndex);
      
      state.queue = [firstTrack, ...shuffleArray(remaining)];
      state.queueIndex = 0;
      state.currentTrack = firstTrack;
      state.status = 'loading';
      state.currentTime = 0;
    },
    
    cycleRepeat: (state) => {
      const order: RepeatMode[] = ['off', 'one', 'all'];
      const currentIndex = order.indexOf(state.repeatMode);
      state.repeatMode = order[(currentIndex + 1) % order.length];
    },
    
    setDominantColor: (state, action: PayloadAction<string>) => {
      state.dominantColor = action.payload;
    },
    
    toggleFullPlayer: (state) => {
      state.isFullPlayerOpen = !state.isFullPlayerOpen;
    },
    
    toggleQueue: (state) => {
      state.isQueueOpen = !state.isQueueOpen;
    },
    
    setIsLiked: (state, action: PayloadAction<boolean>) => {
      state.isLiked = action.payload;
    },

    // Legacy actions for compatibility with any missed dispatches
    clearCurrentMusic: (state) => {
      state.queue = [];
      state.originalQueue = [];
      state.queueIndex = -1;
      state.currentTrack = null;
      state.status = 'idle';
      state.currentTime = 0;
    },
    
    setCurrentMusic: (state, action: PayloadAction<Track>) => {
      // Inlined playTrack logic to avoid circular reference
      if (!state.history) state.history = [];
      if (!state.userQueue) state.userQueue = [];

      if (state.currentTrack) {
        state.history.push(state.currentTrack);
        if (state.history.length > 50) state.history.shift();
      }
      state.currentTrack = action.payload;
      state.status = 'loading';
      const exists = state.originalQueue.find(t => String(t.id) === String(action.payload.id));
      if (!exists) {
        state.originalQueue = [action.payload];
        state.queue = [action.payload];
        state.queueIndex = 0;
      } else {
        const index = state.queue.findIndex(t => String(t.id) === String(action.payload.id));
        if (index !== -1) state.queueIndex = index;
      }
      state.currentTime = 0;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.status = action.payload ? 'playing' : 'paused';
    },
    refreshStream: (state) => {
      state.status = 'loading';
      state.currentTime = 0;
    },
    clearError: (state) => {
      // Empty, no error field right now
    }
  },
  extraReducers: (builder) => {
    builder.addCase(fetchStreamUrl.fulfilled, (state, action) => {
      if (state.currentTrack && String(state.currentTrack.id) === String(action.payload.id)) {
        // Populate the missing hlsUrl
        state.currentTrack = {
          ...state.currentTrack,
          hlsUrl: action.payload.url,
          artworkUrl: action.payload.cover_photo || state.currentTrack.artworkUrl
        };
        // Also update in queue 
        if (state.queueIndex !== -1 && state.queue[state.queueIndex]) {
          state.queue[state.queueIndex] = state.currentTrack;
        }
      }
    });
    builder.addCase(fetchStreamUrl.rejected, (state, action) => {
      if (state.currentTrack && state.currentTrack.id === action.meta.arg) {
        state.currentTrack.hlsFailed = true;
        if (state.queueIndex !== -1 && state.queue[state.queueIndex]) {
          state.queue[state.queueIndex] = state.currentTrack;
        }
      }
    });
  }
});

export const {
  playTrack,
  playTrackAtIndex,
  pause,
  resume,
  stop,
  setStatus,
  setCurrentTime,
  setDuration,
  setVolume,
  toggleMute,
  setQueue,
  addToQueue,
  removeFromQueue,
  clearQueue,
  skipNext,
  skipPrevious,
  toggleShuffle,
  toggleShufflePlay,
  cycleRepeat,
  handleTrackEnd,
  setDominantColor,
  toggleFullPlayer,
  toggleQueue,
  setIsLiked,
  playNext,
  togglePlay,
  
  // Legacy
  clearCurrentMusic,
  setCurrentMusic,
  setIsPlaying,
  refreshStream,
  clearError
} = playerSlice.actions;

export const selectCurrentTrack = (state: { player: PlayerState }) => state.player.currentTrack;
export const selectQueueLength = (state: { player: PlayerState }) => state.player.queue.length;
export const selectNextTrack = (state: { player: PlayerState }) => {
  const { queue, queueIndex } = state.player;
  const nextIndex = queueIndex + 1;
  return nextIndex < queue.length ? queue[nextIndex] : null;
};
export const selectPreviousTrack = (state: { player: PlayerState }) => {
  const { queue, queueIndex } = state.player;
  const prevIndex = queueIndex - 1;
  return prevIndex >= 0 ? queue[prevIndex] : null;
};
export const selectPlayerStatus = (state: { player: PlayerState }) => ({
  hasQueue: state.player.queue.length > 0,
  isLoading: state.player.status === 'loading',
  hasError: false,
  hasStreamUrl: !!state.player.currentTrack?.hlsUrl,
  canPlayNext: !!selectNextTrack(state),
  canPlayPrevious: !!selectPreviousTrack(state),
});

export default playerSlice.reducer;
