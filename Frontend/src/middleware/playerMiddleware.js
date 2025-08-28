import { fetchStreamUrl } from '../slices/user/playerSlice';

// Enhanced middleware state management
class PlayerMiddlewareState {
  constructor() {
    this.isRehydrated = false;
    this.fetchTimeout = null;
    this.lastFetchedMusicId = null;
    this.activeRequest = null; // Track active request
    this.requestQueue = new Set(); // Prevent duplicate requests
    this.retryCount = new Map(); // Track retry attempts per music ID
    this.lastRequestTime = 0;
    
    // Configuration
    this.FETCH_DELAY = 300;
    this.MIN_REQUEST_INTERVAL = 500; // Minimum time between requests
    this.MAX_RETRIES = 3;
    this.RETRY_DELAYS = [1000, 2000, 4000]; // Progressive retry delays
  }

  reset() {
    this.clearTimeout();
    this.cancelActiveRequest();
    this.requestQueue.clear();
    this.retryCount.clear();
    this.lastFetchedMusicId = null;
    this.lastRequestTime = 0;
  }

  clearTimeout() {
    if (this.fetchTimeout) {
      clearTimeout(this.fetchTimeout);
      this.fetchTimeout = null;
    }
  }

  cancelActiveRequest() {
    if (this.activeRequest?.abort) {
      this.activeRequest.abort();
      this.activeRequest = null;
    }
  }

  canMakeRequest(musicId) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    return !this.requestQueue.has(musicId) && 
           timeSinceLastRequest >= this.MIN_REQUEST_INTERVAL;
  }

  shouldFetch(playerState, musicId) {
    if (!musicId || !this.isRehydrated) return false;
    
    // Don't fetch if we already have the stream URL for current music
    if (playerState.streamUrl && playerState.currentMusicId === musicId) {
      return false;
    }
    
    // Don't fetch if currently loading the same music
    if (playerState.isLoading && playerState.currentMusicId === musicId) {
      return false;
    }
    
    // Don't fetch if this music ID is already in queue or recently fetched
    if (this.requestQueue.has(musicId) || this.lastFetchedMusicId === musicId) {
      return false;
    }
    
    // Check retry limit
    const retries = this.retryCount.get(musicId) || 0;
    if (retries >= this.MAX_RETRIES) {
      return false;
    }
    
    return this.canMakeRequest(musicId);
  }

  getRetryDelay(musicId) {
    const retries = this.retryCount.get(musicId) || 0;
    return this.RETRY_DELAYS[Math.min(retries, this.RETRY_DELAYS.length - 1)];
  }

  incrementRetryCount(musicId) {
    const current = this.retryCount.get(musicId) || 0;
    this.retryCount.set(musicId, current + 1);
  }

  resetRetryCount(musicId) {
    this.retryCount.delete(musicId);
  }
}

// Create singleton instance
const middlewareState = new PlayerMiddlewareState();

// Enhanced fetch scheduler with throttling
const createFetchScheduler = (store) => {
  return (musicId, immediate = false) => {
    const state = store.getState();
    const playerState = state?.player;
    
    if (!playerState || !middlewareState.shouldFetch(playerState, musicId)) {
      return;
    }

    // Cancel any existing timeout
    middlewareState.clearTimeout();
    
    // Cancel active request if it's for different music
    if (middlewareState.activeRequest && middlewareState.lastFetchedMusicId !== musicId) {
      middlewareState.cancelActiveRequest();
    }

    const executeFetch = () => {
      // Double-check conditions before dispatching
      const currentState = store.getState();
      const currentPlayerState = currentState?.player;
      
      if (!currentPlayerState || 
          currentPlayerState.currentMusicId !== musicId ||
          !middlewareState.canMakeRequest(musicId)) {
        return;
      }

      console.log(`Fetching stream for music ID: ${musicId}`);
      
      // Add to request queue and update state
      middlewareState.requestQueue.add(musicId);
      middlewareState.lastFetchedMusicId = musicId;
      middlewareState.lastRequestTime = Date.now();
      
      // Create the request with abort controller
      const abortController = new AbortController();
      middlewareState.activeRequest = abortController;
      
      // Dispatch with abort signal
      const requestPromise = store.dispatch(fetchStreamUrl(musicId));
      
      // Handle request completion
      requestPromise.finally(() => {
        middlewareState.requestQueue.delete(musicId);
        if (middlewareState.activeRequest === abortController) {
          middlewareState.activeRequest = null;
        }
      });
      
      middlewareState.fetchTimeout = null;
    };

    const delay = immediate ? 0 : middlewareState.FETCH_DELAY;
    middlewareState.fetchTimeout = setTimeout(executeFetch, delay);
  };
};

// Retry handler with exponential backoff
const createRetryHandler = (store, scheduleFetch) => {
  return (musicId, error) => {
    if (!error || !musicId) return;

    const shouldRetry = [
      'TOKEN_EXPIRED',
      'NETWORK_ERROR', 
      'SERVER_ERROR'
    ].includes(error.type);

    if (!shouldRetry) return;

    middlewareState.incrementRetryCount(musicId);
    const retries = middlewareState.retryCount.get(musicId);
    
    if (retries > middlewareState.MAX_RETRIES) {
      console.warn(`Max retries reached for music ID: ${musicId}`);
      return;
    }

    const delay = middlewareState.getRetryDelay(musicId);
    console.log(`Retrying fetch for music ID: ${musicId} (attempt ${retries}) after ${delay}ms`);
    
    setTimeout(() => {
      const currentState = store.getState();
      if (currentState?.player?.currentMusicId === musicId) {
        middlewareState.lastFetchedMusicId = null; // Reset to allow retry
        scheduleFetch(musicId, true);
      }
    }, delay);
  };
};

// Action handlers
const createActionHandlers = (scheduleFetch, handleRetry) => ({
  'persist/REHYDRATE': () => {
    middlewareState.isRehydrated = true;
    console.log('Player middleware rehydrated');
  },

  'player/setCurrentMusic': (action, playerState) => {
    const musicData = action.payload;
    const musicId = typeof musicData === 'object' && musicData !== null 
      ? musicData.id 
      : musicData;
    
    if (musicId) {
      // Reset retry count for new music
      middlewareState.resetRetryCount(musicId);
      middlewareState.lastFetchedMusicId = null;
      scheduleFetch(musicId);
    }
  },

  'player/refreshStream': (action, playerState) => {
    const musicId = playerState.currentMusicId;
    if (musicId) {
      middlewareState.resetRetryCount(musicId);
      middlewareState.lastFetchedMusicId = null;
      scheduleFetch(musicId, true); // Immediate refresh
    }
  },

  'player/playNext': (action, playerState) => {
    const musicId = playerState.currentMusicId;
    if (musicId) {
      middlewareState.resetRetryCount(musicId);
      middlewareState.lastFetchedMusicId = null;
      scheduleFetch(musicId);
    }
  },

  'player/playPrevious': (action, playerState) => {
    const musicId = playerState.currentMusicId;
    if (musicId) {
      middlewareState.resetRetryCount(musicId);
      middlewareState.lastFetchedMusicId = null;
      scheduleFetch(musicId);
    }
  },

  'player/fetchStreamUrl/fulfilled': (action) => {
    const musicId = action.meta.arg;
    middlewareState.resetRetryCount(musicId);
    console.log(`Stream fetch successful for music ID: ${musicId}`);
  },

  'player/fetchStreamUrl/rejected': (action, playerState) => {
    const musicId = action.meta.arg;
    const error = action.payload;
    
    console.warn(`Stream fetch failed for music ID: ${musicId}:`, error?.message);
    
    // Only retry if it's still the current music
    if (playerState.currentMusicId === musicId) {
      handleRetry(musicId, error);
    }
  },

  'player/clearQueue': () => {
    middlewareState.reset();
  }
});

// Main middleware factory
export const playerMiddleware = (store) => {
  const scheduleFetch = createFetchScheduler(store);
  const handleRetry = createRetryHandler(store, scheduleFetch);
  const actionHandlers = createActionHandlers(scheduleFetch, handleRetry);

  return (next) => (action) => {
    // Execute the action first
    const result = next(action);

    // Get updated state after action
    const state = store.getState();
    const playerState = state?.player;

    // Handle the action if we have a handler for it
    const handler = actionHandlers[action.type];
    if (handler && playerState) {
      try {
        handler(action, playerState);
      } catch (error) {
        console.error(`Error handling action ${action.type}:`, error);
      }
    }

    return result;
  };
};

// Cleanup function
export const cleanupPlayerMiddleware = () => {
  middlewareState.reset();
  middlewareState.isRehydrated = false;
  console.log('Player middleware cleaned up');
};

export default playerMiddleware;