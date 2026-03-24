import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';
import { PLAYLISTS, LIBRARY } from '../../constants/apiEndpoints';

// Async thunks for API calls
export const fetchLikedSongs = createAsyncThunk(
  'library/fetchLikedSongs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/v1/playlist/playlist-data/');
      const playlists = Array.isArray(response.data) ? response.data : (response.data.results || []);
      const likedPlaylist = playlists.find((p) => p.name === 'Liked Songs');
      
      if (!likedPlaylist) return [];
      
      // Return just the IDs
      return likedPlaylist.tracks.map((t) => t.music_details?.id || t.id);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchLibraryData = createAsyncThunk(
  'library/fetchLibraryData',
  async (_, { rejectWithValue }) => {
    try {
      const results = await Promise.allSettled([
        api.get('/api/v1/playlist/playlist-data/'),
        api.get(LIBRARY.PLAYLISTS),
        api.get('/api/v1/artists/me/following/'),
        api.get('/api/v1/library/library/albums/'),
      ]);

      const extractData = (result) => {
        if (result.status === 'fulfilled') {
          return result.value?.data || [];
        }
        return [];
      };

      const ownData = extractData(results[0]);
      const savedData = extractData(results[1]);
      const followingData = extractData(results[2]);
      const albumsData = extractData(results[3]);
      
      return {
        ownPlaylists: Array.isArray(ownData) ? ownData : (ownData.results || []),
        savedPlaylists: Array.isArray(savedData) ? savedData : (savedData.results || []),
        followedArtists: Array.isArray(followingData) ? followingData : (followingData.results || []),
        savedAlbums: Array.isArray(albumsData) ? albumsData : (albumsData.results || []),
      };
    } catch (error) {
       return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// We perform an optimistic update, so this thunk mainly handles the background API request.
export const toggleLikeApi = createAsyncThunk(
  'library/toggleLikeApi',
  async (trackId, { rejectWithValue }) => {
    try {
      // Backend expects { music_id: trackId }
      const response = await api.post(PLAYLISTS.LIKE_SONGS, { music_id: trackId });
      return response.data;
    } catch (error) {
      return rejectWithValue({ trackId, error: error.response?.data || error.message });
    }
  }
);

export const togglePlaylistTrackApi = createAsyncThunk(
  'library/togglePlaylistTrackApi',
  async ({ playlistId, trackId, action }, { rejectWithValue }) => {
    try {
      const endpoint = action === 'add' 
        ? PLAYLISTS.ADD_TRACKS(playlistId) 
        : PLAYLISTS.REMOVE_TRACKS(playlistId);
        
      const payload = action === 'add' 
        ? { tracks: [{ music: trackId }] } 
        : { track_ids: [trackId] };

      const response = await api.post(endpoint, payload);
      return { playlistId, trackId, action, data: response.data };
    } catch (error) {
      return rejectWithValue({ playlistId, trackId, action, error: error.response?.data || error.message });
    }
  }
);

const initialState = {
  likedSongs: [], // array of track IDs
  playlists: [], // array of playlist objects containing track arrays
  ownPlaylists: [], 
  savedPlaylists: [], 
  savedAlbums: [],
  followedArtists: [],
  recentlyPlayed: [],
  isLoading: false,
  error: null,
};

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    // Optimistic Update Reducers
    toggleLikeOptimistic: (state, action) => {
      const trackId = action.payload;
      if (state.likedSongs.includes(trackId)) {
        state.likedSongs = state.likedSongs.filter(id => id !== trackId);
      } else {
        state.likedSongs.push(trackId);
      }
    },
    revertLikeOptimistic: (state, action) => {
      // If the API call fails, revert the change
      const trackId = action.payload;
      if (state.likedSongs.includes(trackId)) {
        state.likedSongs = state.likedSongs.filter(id => id !== trackId);
      } else {
        state.likedSongs.push(trackId);
      }
    },
    
    togglePlaylistTrackOptimistic: (state, action) => {
      const { playlistId, track } = action.payload;
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (playlist) {
        // Assume playlist.tracks is array of track objects or IDs
        const trackExists = playlist.tracks?.find(t => t.id === track.id || t === track.id);
        if (trackExists) {
          playlist.tracks = playlist.tracks.filter(t => (t.id || t) !== track.id);
        } else {
          if (!playlist.tracks) playlist.tracks = [];
          playlist.tracks.push(track);
        }
      }
    },
    revertPlaylistTrackOptimistic: (state, action) => {
      // Revert logic reverse of optimistic
      const { playlistId, track } = action.payload;
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (playlist) {
        const trackExists = playlist.tracks?.find(t => t.id === track.id || t === track.id);
        if (trackExists) {
          playlist.tracks = playlist.tracks.filter(t => (t.id || t) !== track.id);
        } else {
          playlist.tracks.push(track);
        }
      }
    },
    
    addRecentlyPlayed: (state, action) => {
      const track = action.payload;
      // Keep only unique tracks and limit to 20
      state.recentlyPlayed = [track, ...state.recentlyPlayed.filter(t => t.id !== track.id)].slice(0, 20);
    },
    
    setLibraryPlaylists: (state, action) => {
        state.playlists = action.payload;
    },
    setLikedSongs: (state, action) => {
        state.likedSongs = action.payload;
    },
    addOwnPlaylist: (state, action) => {
      // Avoid duplicates
      if (!state.ownPlaylists.find(p => p.id === action.payload.id)) {
        state.ownPlaylists.push(action.payload);
      }
    },
    removeOwnPlaylist: (state, action) => {
      state.ownPlaylists = state.ownPlaylists.filter(p => p.id !== action.payload);
    },
    updateOwnPlaylist: (state, action) => {
      const index = state.ownPlaylists.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.ownPlaylists[index] = { ...state.ownPlaylists[index], ...action.payload };
      }
    },
    toggleSavedPlaylistOptimistic: (state, action) => {
      const playlist = action.payload;
      const exists = state.savedPlaylists.find(p => p.id === playlist.id);
      if (exists) {
        state.savedPlaylists = state.savedPlaylists.filter(p => p.id !== playlist.id);
      } else {
        state.savedPlaylists.push(playlist);
      }
    },
    toggleFollowArtistOptimistic: (state, action) => {
      const artist = action.payload;
      // Depending on API response shape, followedArtists might store relationships or artist objects.
      // E.g., follow => follow.artist
      // Assuming state.followedArtists contains artist objects directly that match payload's artist.id
      const exists = state.followedArtists.find(a => (a.artist?.id || a.id) === artist.id);
      if (exists) {
        state.followedArtists = state.followedArtists.filter(a => (a.artist?.id || a.id) !== artist.id);
      } else {
        state.followedArtists.push(artist); // Might need a shape { id: ..., artist: { ... } } if the API wraps it
      }
    },
    toggleSavedAlbumOptimistic: (state, action) => {
      const album = action.payload;
      const exists = state.savedAlbums.find(a => a.id === album.id);
      if (exists) {
        state.savedAlbums = state.savedAlbums.filter(a => a.id !== album.id);
      } else {
        state.savedAlbums.push(album);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLikedSongs.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchLikedSongs.fulfilled, (state, action) => {
        state.isLoading = false;
        // action.payload is already an array of track IDs from the thunk
        if (Array.isArray(action.payload)) {
           state.likedSongs = action.payload;
        }
      })
      .addCase(fetchLikedSongs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchLibraryData.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchLibraryData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.ownPlaylists = action.payload.ownPlaylists;
        state.savedPlaylists = action.payload.savedPlaylists;
        state.followedArtists = action.payload.followedArtists;
        state.savedAlbums = action.payload.savedAlbums || [];
      })
      .addCase(fetchLibraryData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      .addCase(toggleLikeApi.rejected, (state, action) => {
        // Call the revert reducer explicitly from the component, or handle here
        const trackId = action.payload?.trackId;
        if (trackId) {
          // Revert inline if we want to handle it automatically
           if (state.likedSongs.includes(trackId)) {
             state.likedSongs = state.likedSongs.filter(id => id !== trackId);
           } else {
             state.likedSongs.push(trackId);
           }
        }
      })
      
      .addCase(togglePlaylistTrackApi.rejected, (state, action) => {
        // Revert 
      });
  },
});

export const { 
  toggleLikeOptimistic, 
  revertLikeOptimistic, 
  togglePlaylistTrackOptimistic, 
  revertPlaylistTrackOptimistic, 
  addRecentlyPlayed,
  setLibraryPlaylists,
  setLikedSongs,
  addOwnPlaylist,
  removeOwnPlaylist,
  updateOwnPlaylist,
  toggleSavedPlaylistOptimistic,
  toggleFollowArtistOptimistic,
  toggleSavedAlbumOptimistic
} = librarySlice.actions;

export default librarySlice.reducer;

// Selectors
export const selectLikedSongs = (state) => state.library?.likedSongs || [];
export const selectIsLiked = (state, trackId) => {
    const liked = state.library?.likedSongs || [];
    return liked.includes(trackId);
};
export const selectLibraryPlaylists = (state) => state.library?.playlists || [];
export const selectRecentlyPlayed = (state) => state.library?.recentlyPlayed || [];
export const selectPlaylistTracks = (state, playlistId) => {
  const playlist = state.library?.playlists?.find(p => p.id === playlistId);
  return playlist?.tracks || [];
};
export const selectOwnPlaylists = (state) => state.library?.ownPlaylists || [];
export const selectSavedPlaylists = (state) => state.library?.savedPlaylists || [];
export const selectSavedAlbums = (state) => state.library?.savedAlbums || [];
export const selectFollowedArtists = (state) => state.library?.followedArtists || [];

// Compound Action for Optimistic Update
export const toggleLike = (trackId) => (dispatch) => {
  // 1. Optimistically update UI
  dispatch(toggleLikeOptimistic(trackId));
  
  // 2. Fire API request
  dispatch(toggleLikeApi(trackId)).catch((err) => {
     // If the thunk completely fails (unhandled), revert via action just in case 
     // though our extraReducers handles the rejected case.
     // dispatch(revertLikeOptimistic(trackId));
  });
};

export const toggleFollowArtistApi = createAsyncThunk(
  'library/toggleFollowArtistApi',
  async ({ artistId, isFollowed }, { rejectWithValue }) => {
    try {
      const method = isFollowed ? 'delete' : 'post';
      const response = await api[method](`/api/v1/artists/${artistId}/follow/`);
      return { artistId, isFollowed, data: response.data };
    } catch (error) {
      return rejectWithValue({ artistId, isFollowed, error: error.response?.data || error.message });
    }
  }
);

export const toggleFollowArtist = (artist) => (dispatch, getState) => {
  const state = getState();
  const followedArtists = selectFollowedArtists(state);
  const isFollowed = followedArtists.some(a => (a.artist?.id || a.id) === artist.id);

  // 1. Optimistically update UI
  dispatch(toggleFollowArtistOptimistic(artist));

  // 2. Fire API request
  dispatch(toggleFollowArtistApi({ artistId: artist.id, isFollowed })).catch((err) => {
    // revert is handled by extraReducers or the thunk's rejection
  });
};
