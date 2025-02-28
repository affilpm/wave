// // src/slices/user/equalizerSlice.js
// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import api from '../../api';

// // Async thunks
// export const fetchPresets = createAsyncThunk(
//   'equalizer/fetchPresets',
//   async (_, { rejectWithValue }) => {
//     try {
//       const response = await api.get('/api/music/equalizer/presets/');
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data || 'Failed to fetch presets');
//     }
//   }
// );

// export const fetchCurrentPreset = createAsyncThunk(
//   'equalizer/fetchCurrentPreset',
//   async (_, { rejectWithValue }) => {
//     try {
//       const response = await api.get('/api/music/equalizer/current/');
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data || 'Failed to fetch current preset');
//     }
//   }
// );

// export const savePreset = createAsyncThunk(
//   'equalizer/savePreset',
//   async (preset, { rejectWithValue }) => {
//     try {
//       let response;
//       if (preset.id) {
//         // Update existing preset
//         response = await api.put(`/api/music/equalizer/presets/${preset.id}/`, preset);
//       } else {
//         // Create new preset
//         response = await api.post('/api/music/equalizer/presets/', preset);
//       }
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data || 'Failed to save preset');
//     }
//   }
// );

// export const deletePreset = createAsyncThunk(
//   'equalizer/deletePreset',
//   async (presetId, { rejectWithValue }) => {
//     try {
//       await api.delete(`/api/music/equalizer/presets/${presetId}/`);
//       return presetId;
//     } catch (error) {
//       return rejectWithValue(error.response?.data || 'Failed to delete preset');
//     }
//   }
// );

// // Define the preset frequencies for display and use
// export const equalizerBands = [
//   { id: 'band_32', frequency: '32 Hz', value: 0 },
//   { id: 'band_64', frequency: '64 Hz', value: 0 },
//   { id: 'band_125', frequency: '125 Hz', value: 0 },
//   { id: 'band_250', frequency: '250 Hz', value: 0 },
//   { id: 'band_500', frequency: '500 Hz', value: 0 },
//   { id: 'band_1k', frequency: '1 kHz', value: 0 },
//   { id: 'band_2k', frequency: '2 kHz', value: 0 },
//   { id: 'band_4k', frequency: '4 kHz', value: 0 },
//   { id: 'band_8k', frequency: '8 kHz', value: 0 },
//   { id: 'band_16k', frequency: '16 kHz', value: 0 },
// ];

// // Initial state
// const initialState = {
//   currentPreset: {
//     name: 'Flat',
//     is_default: true,
//     ...Object.fromEntries(equalizerBands.map(band => [band.id, 0]))
//   },
//   presets: [],
//   isEqualizerActive: false,
//   isLoading: false,
//   error: null,
//   bands: equalizerBands
// };

// // Slice
// const equalizerSlice = createSlice({
//   name: 'equalizer',
//   initialState,
//   reducers: {
//     toggleEqualizer: (state) => {
//       state.isEqualizerActive = !state.isEqualizerActive;
//     },
//     updateBand: (state, action) => {
//       const { id, value } = action.payload;
//       state.currentPreset[id] = value;
//       // Update the corresponding band in the bands array for UI
//       const bandIndex = state.bands.findIndex(band => band.id === id);
//       if (bandIndex !== -1) {
//         state.bands[bandIndex].value = value;
//       }
//     },
//     resetEqualizer: (state) => {
//       // Reset all bands to 0
//       for (const band of state.bands) {
//         state.currentPreset[band.id] = 0;
//         band.value = 0;
//       }
//     }
//   },
//   extraReducers: (builder) => {
//     builder
//       // Fetch presets
//       .addCase(fetchPresets.pending, (state) => {
//         state.isLoading = true;
//       })
//       .addCase(fetchPresets.fulfilled, (state, action) => {
//         state.isLoading = false;
//         state.presets = action.payload;
//       })
//       .addCase(fetchPresets.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload;
//       })
      
//       // Fetch current preset
//       .addCase(fetchCurrentPreset.pending, (state) => {
//         state.isLoading = true;
//       })
//       .addCase(fetchCurrentPreset.fulfilled, (state, action) => {
//         state.isLoading = false;
//         state.currentPreset = action.payload;
//         // Update the band values in the bands array for UI
//         for (const band of state.bands) {
//           band.value = action.payload[band.id] || 0;
//         }
//       })
//       .addCase(fetchCurrentPreset.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload;
//       })
      
//       // Save preset
//       .addCase(savePreset.pending, (state) => {
//         state.isLoading = true;
//       })
//       .addCase(savePreset.fulfilled, (state, action) => {
//         state.isLoading = false;
//         const savedPreset = action.payload;
        
//         // Update or add the preset in the presets array
//         const existingIndex = state.presets.findIndex(p => p.id === savedPreset.id);
//         if (existingIndex !== -1) {
//           state.presets[existingIndex] = savedPreset;
//         } else {
//           state.presets.push(savedPreset);
//         }
        
//         // If this is the default preset, update currentPreset
//         if (savedPreset.is_default) {
//           state.currentPreset = savedPreset;
//           // Update bands array
//           for (const band of state.bands) {
//             band.value = savedPreset[band.id] || 0;
//           }
//         }
//       })
//       .addCase(savePreset.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload;
//       })
      
//       // Delete preset
//       .addCase(deletePreset.pending, (state) => {
//         state.isLoading = true;
//       })
//       .addCase(deletePreset.fulfilled, (state, action) => {
//         state.isLoading = false;
//         state.presets = state.presets.filter(preset => preset.id !== action.payload);
//       })
//       .addCase(deletePreset.rejected, (state, action) => {
//         state.isLoading = false;
//         state.error = action.payload;
//       });
//   }
// });

// export const { toggleEqualizer, updateBand, resetEqualizer } = equalizerSlice.actions;
// export default equalizerSlice.reducer;