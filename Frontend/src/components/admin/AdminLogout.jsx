import { useNavigate } from 'react-router-dom';
import { clearUserData } from '../../slices/userSlice';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { resetAdmin } from '../../slices/admin/adminSlice';
export const logout = () => {
  // Completely clear all data from localStorage
  localStorage.clear();
};

const AdminLogout = () => {
 const dispatch = useDispatch()
  const navigate = useNavigate();

  useEffect(() => {
    // dispatch(clearUserData())
    dispatch(resetAdmin())
    // localStorage.removeItem('isAuthenticated');
    logout(); // Clear localStorage
    navigate('/adminlogin'); // Redirect to login page
  }, [navigate]);

  return null; // No UI for this component
};

export default AdminLogout;