import { createSlice } from '@reduxjs/toolkit';

// Initial state for the user
const initialState = {
  email: '',
  user_id: '',
  username: '',
  first_name: '',
  last_name: '',
  image: '', // Image will be null initially
  isAuthenticated: false, 

};

/**
 * Redux slice for managing user authentication and profile state.
 */
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserData: (state, action) => {
      state.email = action.payload.email;
      state.user_id = action.payload.user_id;
      state.username = action.payload.username;
      state.first_name = action.payload.first_name;
      state.last_name = action.payload.last_name;
      state.image = action.payload.image || ''; 
      state.isAuthenticated = true;
    },

    updateUserProfile: (state, action) => {
      state.username = action.payload.username;
      state.image = action.payload.profile_photo || '';
    },
    
    clearUserData: (state) => {
      state.email = '';
      state.user_id = '';
      state.username = '';
      state.first_name = '';
      state.last_name = '';
      state.image = '';
      state.isAuthenticated = false;
    },
  },
});

export const { setUserData, clearUserData, updateUserProfile } = userSlice.actions;

export default userSlice.reducer;