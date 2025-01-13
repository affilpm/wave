import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearUserData } from '../../slices/userSlice';
import { useSelector, useDispatch } from 'react-redux';
import { adminLogout } from '../../services/admin/adminLogout';

const AdminLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
      const performLogout = async () => {
          try {
              await adminLogout();
              dispatch(clearUserData());
          } catch (error) {
              console.error('Logout error:', error);
          } finally {
              navigate('/adminlogin');
          }
      };

      performLogout();
  }, [dispatch, navigate]);

  return null;
};



export default AdminLogout;