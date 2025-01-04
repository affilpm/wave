import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isSuperuser: localStorage.getItem('isSuperuser') === 'true',
    isActive: localStorage.getItem('isActive') === 'true',
    email: localStorage.getItem('email') || '',
    Admin_isAuthenticated: false, // Default is false
};

const adminSlice = createSlice({
    name: 'admin',
    initialState,
    reducers: {
        setUser: (state, action) => {
            const { isSuperuser, isActive, email, Admin_isAuthenticated } = action.payload;
            state.isSuperuser = isSuperuser;
            state.isActive = isActive;
            state.email = email;
            state.Admin_isAuthenticated = Admin_isAuthenticated;

            localStorage.setItem('isSuperuser', isSuperuser);
            localStorage.setItem('isActive', isActive);
            localStorage.setItem('email', email);
            localStorage.setItem('Admin_isAuthenticated', true); // Store in localStorage
        },
        resetAdmin: (state) => {
            state.isSuperuser = false;
            state.isActive = false;
            state.email = '';
            state.Admin_isAuthenticated = false;

            localStorage.removeItem('isSuperuser');
            localStorage.removeItem('isActive');
            localStorage.removeItem('email');
            localStorage.removeItem('Admin_isAuthenticated'); // Remove from localStorage
        },
    },
});

export const { setUser, resetAdmin } = adminSlice.actions;
export default adminSlice.reducer;