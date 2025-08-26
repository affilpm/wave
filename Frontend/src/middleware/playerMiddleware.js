import { fetchStreamUrl } from '../slices/user/PlayerSlice';

// Simple middleware state
let isRehydrated = false;
let fetchTimeout = null;
let lastFetchedMusicId = null;

const FETCH_DELAY = 300; // Small delay to avoid rapid successive calls

export const playerMiddleware = (store) => (next) => (action) => {
  // Handle rehydration
  if (action.type === 'persist/REHYDRATE') {
    isRehydrated = true;
    console.log('Player middleware rehydrated');
    return next(action);
  }

  // Execute the action first
  const result = next(action);

  // Only proceed if rehydrated
  if (!isRehydrated) return result;

  const state = store.getState();
  const playerState = state?.player;
  
  if (!playerState) return result;

  // Helper function to schedule stream fetch
  const scheduleFetch = (musicId) => {
    // Clear any existing timeout
    if (fetchTimeout) {
      clearTimeout(fetchTimeout);
      fetchTimeout = null;
    }

    // Don't fetch if:
    // - No music ID
    // - Already have stream URL for this music
    // - Currently loading
    // - Same music as last fetch
    if (!musicId || 
        (playerState.streamUrl && playerState.currentMusicId === musicId) ||
        playerState.isLoading ||
        lastFetchedMusicId === musicId) {
      return;
    }

    console.log(`Scheduling stream fetch for music ID: ${musicId}`);
    
    fetchTimeout = setTimeout(() => {
      // Double-check conditions before dispatching
      const currentState = store.getState();
      const currentPlayerState = currentState?.player;
      
      if (currentPlayerState?.currentMusicId === musicId && 
          !currentPlayerState.streamUrl && 
          !currentPlayerState.isLoading) {
        
        lastFetchedMusicId = musicId;
        store.dispatch(fetchStreamUrl(musicId));
      }
      
      fetchTimeout = null;
    }, FETCH_DELAY);
  };

  // Handle specific actions that need stream fetching
  switch (action.type) {
    case 'player/setCurrentMusic': {
      const musicId = action.payload;
      if (musicId) {
        lastFetchedMusicId = null; // Reset to allow fetching new music
        scheduleFetch(musicId);
      }
      break;
    }

    case 'player/refreshStream': {
      const musicId = playerState.currentMusicId;
      if (musicId) {
        lastFetchedMusicId = null; // Reset to allow refetch
        scheduleFetch(musicId);
      }
      break;
    }

    case 'player/playNext':
    case 'player/playPrevious': {
      const musicId = playerState.currentMusicId;
      if (musicId) {
        lastFetchedMusicId = null; // Reset for new track
        scheduleFetch(musicId);
      }
      break;
    }

    case 'player/fetchStreamUrl/fulfilled': {
      console.log('Stream fetch successful');
      break;
    }

    case 'player/fetchStreamUrl/rejected': {
      const error = action.payload;
      console.log('Stream fetch failed:', error?.message);
      
      // Simple retry logic for specific errors
      if (error?.type === 'TOKEN_EXPIRED' || error?.type === 'NETWORK_ERROR') {
        const musicId = playerState.currentMusicId;
        if (musicId) {
          console.log('Retrying fetch after error');
          setTimeout(() => {
            lastFetchedMusicId = null;
            scheduleFetch(musicId);
          }, 2000);
        }
      }
      break;
    }

    case 'player/clearPlaylist':
      // Clear state on playlist clear
      lastFetchedMusicId = null;
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
        fetchTimeout = null;
      }
      break;

    default:
      break;
  }

  return result;
};

// Cleanup function
export const cleanupPlayerMiddleware = () => {
  if (fetchTimeout) {
    clearTimeout(fetchTimeout);
    fetchTimeout = null;
  }
  lastFetchedMusicId = null;
  isRehydrated = false;
  console.log('Player middleware cleaned up');
};

export default playerMiddleware;