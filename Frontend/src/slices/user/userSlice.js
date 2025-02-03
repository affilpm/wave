import { createSlice } from '@reduxjs/toolkit';

// Initial state for the user
const initialState = {
  email: '',
  username: '',
  first_name: '',
  last_name: '',
  image: '', // Image will be null initially
  isAuthenticated: false, // Add isAuthenticated field
};

// Create the slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserData: (state, action) => {
      state.email = action.payload.email;
      state.username = action.payload.username;
      state.first_name = action.payload.first_name;
      state.last_name = action.payload.last_name;
      state.image = action.payload.image || ''; // image can be added later
      state.isAuthenticated = true; // Set isAuthenticated to true when user data is set
    },
    updateUserImage: (state, action) => {
      state.image = action.payload;
    },
    clearUserData: (state) => {
      state.email = ''; // Reset to empty string
      state.username = ''; // Reset to empty string
      state.first_name = ''; // Reset to empty string
      state.last_name = ''; // Reset to empty string
      state.image = ''; // Keep image as null
      state.isAuthenticated = false; // Set isAuthenticated to false when clearing user data
    },
  },
});

// Export actions for use in components
export const { setUserData, updateUserImage, clearUserData } = userSlice.actions;

// Export the reducer to be added to the store
export default userSlice.reducer;