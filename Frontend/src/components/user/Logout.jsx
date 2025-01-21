import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearUserData } from '../../slices/userSlice';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../services/user/logout';

const Logout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
      const performLogout = async () => {
          try {
              await logout();
              dispatch(clearUserData());
          } catch (error) {
              console.error('Logout error:', error);
          } finally {
              navigate('/landingpage');
          }
      };

      performLogout();
  }, [dispatch, navigate]);

  return null;
};



export default Logout;