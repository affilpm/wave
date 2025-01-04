import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearUserData } from '../../slices/userSlice';
import { useSelector, useDispatch } from 'react-redux';
export const logout = () => {
  // Completely clear all data from localStorage
  localStorage.clear();
};

const Logout = () => {
 const dispatch = useDispatch()
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(clearUserData())
    // localStorage.removeItem('isAuthenticated');
    logout(); // Clear localStorage
    navigate('/login'); // Redirect to login page
  }, [navigate]);

  return null; // No UI for this component
};

export default Logout;