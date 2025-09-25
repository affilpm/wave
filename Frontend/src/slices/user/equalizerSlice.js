import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isEnabled: true,
  preset: {
    band_31: 0,
    band_62: 0,
    band_125: 0,
    band_250: 0,
    band_500: 0,
    band_1k: 0,
    band_2k: 0,
    band_4k: 0,
    band_8k: 0,
    band_16k: 0,
  },
  presetId: null,
  isLoading: false,
  error: null,
};

const equalizerSlice = createSlice({
  name: 'equalizer',
  initialState,
  reducers: {
    setEqualizerEnabled(state, action) {
      state.isEnabled = action.payload;
    },
    setPreset(state, action) {
      state.preset = action.payload.preset;
      state.presetId = action.payload.presetId || null;
    },
    updateBand(state, action) {
      const { band, value } = action.payload;
      state.preset[band] = value;
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    resetEqualizer(state) {
      state.preset = initialState.preset;
      state.presetId = null;
      state.isLoading = false;
      state.error = null;
    },
  },
});

export const {
  setEqualizerEnabled,
  setPreset,
  updateBand,
  setLoading,
  setError,
  resetEqualizer,
} = equalizerSlice.actions;

export const selectEqualizerState = (state) => state.equalizer;

export default equalizerSlice.reducer;