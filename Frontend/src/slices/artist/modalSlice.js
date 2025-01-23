// src/store/modalSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isOpen: false,
  modalContent: null, // You can store the content of the modal here if needed
};

const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    openModal: (state, action) => {
      state.isOpen = true;
      state.modalContent = action.payload; // You can pass the content to display in the modal
    },
    closeModal: (state) => {
      state.isOpen = false;
      state.modalContent = null;
    },
  },
});

export const { openModal, closeModal } = modalSlice.actions;

export default modalSlice.reducer;