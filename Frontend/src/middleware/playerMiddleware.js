import { fetchStreamUrl } from '../slices/user/playerSlice';

class PlayerMiddlewareState {
  constructor() {
    this.isRehydrated = true; 
    this.fetchTimeout = null;
    this.lastFetchedMusicId = null;
    this.activeRequest = null;
    this.requestQueue = new Set();
    this.retryCount = new Map();
    this.lastRequestTime = 0;
    
    this.FETCH_DELAY = 300;
    this.MIN_REQUEST_INTERVAL = 500;
    this.MAX_RETRIES = 3;
    this.RETRY_DELAYS = [1000, 2000, 4000];
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
    
    if (playerState.streamUrl && playerState.currentMusicId === musicId) {
      return false;
    }
    
    if (playerState.isLoading && playerState.currentMusicId === musicId) {
      return false;
    }
    
    if (this.requestQueue.has(musicId) || this.lastFetchedMusicId === musicId) {
      return false;
    }
    
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

const middlewareState = new PlayerMiddlewareState();

const createFetchScheduler = (store) => {
  return (musicId, immediate = false) => {
    const state = store.getState();
    const playerState = state?.player;
    
    if (!playerState || !middlewareState.shouldFetch(playerState, musicId)) {
      return;
    }

    middlewareState.clearTimeout();
    
    if (middlewareState.activeRequest && middlewareState.lastFetchedMusicId !== musicId) {
      middlewareState.cancelActiveRequest();
    }

    const executeFetch = () => {
      const currentState = store.getState();
      const currentPlayerState = currentState?.player;
      
      if (!currentPlayerState || 
          currentPlayerState.currentMusicId !== musicId ||
          !middlewareState.canMakeRequest(musicId)) {
        return;
      }

      middlewareState.requestQueue.add(musicId);
      middlewareState.lastFetchedMusicId = musicId;
      middlewareState.lastRequestTime = Date.now();
      
      const abortController = new AbortController();
      middlewareState.activeRequest = abortController;
      
      const requestPromise = store.dispatch(fetchStreamUrl(musicId));
      
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
      return;
    }

    const delay = middlewareState.getRetryDelay(musicId);
    
    setTimeout(() => {
      const currentState = store.getState();
      if (currentState?.player?.currentMusicId === musicId) {
        middlewareState.lastFetchedMusicId = null;
        scheduleFetch(musicId, true);
      }
    }, delay);
  };
};

const createActionHandlers = (scheduleFetch, handleRetry) => ({
  'persist/REHYDRATE': () => {
    middlewareState.isRehydrated = true;
  },

  'player/setCurrentMusic': (action, playerState) => {
    const musicData = action.payload;
    const musicId = typeof musicData === 'object' && musicData !== null 
      ? musicData.id 
      : musicData;
    
    if (musicId) {
      middlewareState.resetRetryCount(musicId);
      middlewareState.lastFetchedMusicId = null;
      scheduleFetch(musicId, true);
    }
  },

  'player/refreshStream': (action, playerState) => {
    const musicId = playerState.currentMusicId;
    if (musicId) {
      middlewareState.resetRetryCount(musicId);
      middlewareState.lastFetchedMusicId = null;
      scheduleFetch(musicId, true);
    }
  },

  'player/playNext': (action, playerState) => {
    const musicId = playerState.currentMusicId;
    if (musicId) {
      middlewareState.resetRetryCount(musicId);
      if (musicId !== middlewareState.lastFetchedMusicId) {
        middlewareState.lastFetchedMusicId = null;
      }
      scheduleFetch(musicId, true);
    }
  },

  'player/playPrevious': (action, playerState) => {
    const musicId = playerState.currentMusicId;
    if (musicId) {
      middlewareState.resetRetryCount(musicId);
      if (musicId !== middlewareState.lastFetchedMusicId) {
        middlewareState.lastFetchedMusicId = null;
      }
      scheduleFetch(musicId);
    }
  },

  'player/fetchStreamUrl/fulfilled': (action) => {
    const musicId = action.meta.arg;
    middlewareState.resetRetryCount(musicId);
  },

  'player/fetchStreamUrl/rejected': (action, playerState) => {
    const musicId = action.meta.arg;
    const error = action.payload;
    
    if (playerState.currentMusicId === musicId) {
      handleRetry(musicId, error);
    }
  },

  'player/clearQueue': () => {
    middlewareState.reset();
  }
});

export const playerMiddleware = (store) => {
  const scheduleFetch = createFetchScheduler(store);
  const handleRetry = createRetryHandler(store, scheduleFetch);
  const actionHandlers = createActionHandlers(scheduleFetch, handleRetry);

  return (next) => (action) => {
    const result = next(action);

    const state = store.getState();
    const playerState = state?.player;

    const handler = actionHandlers[action.type];
    if (handler && playerState) {
      try {
        handler(action, playerState);
      } catch (error) {
      }
    }

    return result;
  };
};

export const cleanupPlayerMiddleware = () => {
  middlewareState.reset();
  middlewareState.isRehydrated = false;
};

export default playerMiddleware;