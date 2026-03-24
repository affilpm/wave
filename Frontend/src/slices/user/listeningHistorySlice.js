import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';
import { LISTENING } from '../../constants/apiEndpoints';

export const fetchRecentlyPlayed = createAsyncThunk(
    'listeningHistory/fetchRecentlyPlayed',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get(LISTENING.RECENTLY_PLAYED);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchJumpBackIn = createAsyncThunk(
    'listeningHistory/fetchJumpBackIn',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get(LISTENING.JUMP_BACK_IN);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const listeningHistorySlice = createSlice({
    name: 'listeningHistory',
    initialState: {
        recentlyPlayed: [],
        jumpBackIn: {
            albums: [],
            hasSingles: false,
        },
        loading: false,
        error: null,
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Recently Played
            .addCase(fetchRecentlyPlayed.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchRecentlyPlayed.fulfilled, (state, action) => {
                state.loading = false;
                state.recentlyPlayed = action.payload;
            })
            .addCase(fetchRecentlyPlayed.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Jump Back In
            .addCase(fetchJumpBackIn.fulfilled, (state, action) => {
                state.jumpBackIn = {
                    albums: action.payload.albums,
                    hasSingles: action.payload.has_singles,
                };
            });
    },
});

export const { clearError } = listeningHistorySlice.actions;
export default listeningHistorySlice.reducer;
