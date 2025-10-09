import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setUserData } from '../../slices/user/userSlice';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { ACCESS_TOKEN, REFRESH_TOKEN, GOOGLE_CLIENT_ID } from '../../constants/authConstants';
import { decodeToken } from '../../utils/tokenUtils';

const GoogleAuthButton = () => {
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    let scriptLoaded = false;
    let mounted = true;

    const initializeGoogleSignIn = () => {
      if (!mounted || !window.google || !buttonRef.current) return;
      
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: 320,
          shape: 'rectangular',
        });
      } catch (err) {
        console.error('Failed to initialize Google Sign-In:', err);
        setError('Failed to initialize Google Sign-In');
      }
    };

    const loadScript = () => {
      if (scriptLoaded) return;

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        scriptLoaded = true;
        setTimeout(initializeGoogleSignIn, 0);
      };
      script.onerror = () => {
        setError('Failed to load Google Sign-In');
      };
      document.body.appendChild(script);
    };

    setTimeout(loadScript, 50);

    return () => {
      mounted = false;
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, []);

  const handleCredentialResponse = async (response) => {
    if (loading) return;
    setLoading(true);
    setError('');
  
    try {
      if (!response?.credential) {
        throw new Error('No credential received from Google');
      }
  
      const { data } = await api.post('/api/users/google-auth/', 
        { token: response.credential },
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log('Google Auth Response:', data);
      if (!data?.tokens?.access || !data?.tokens?.refresh) {
        throw new Error('Invalid token data received from server');
      }
      
      localStorage.setItem(ACCESS_TOKEN, data.tokens.access);
      localStorage.setItem(REFRESH_TOKEN, data.tokens.refresh);
  
      const decodedToken = decodeToken(data.tokens.access);
      
      if (!decodedToken?.user_id || !decodedToken?.email) {
        throw new Error('Invalid user data in token');
      }
      console.log(decodeToken)
  
      dispatch(setUserData({
        email: decodedToken.email,
        username: decodedToken.username,
        user_id: decodedToken.user_id,
        first_name: decodedToken.first_name,
        last_name: decodedToken.last_name,
        image: decodedToken.profile_photo || null,
        isAuthenticated: true,
      }));

  
      navigate('/home');
    } catch (err) {
      console.error('Authentication error:', err);

      // Check if the error has a response and display the message from the backend
      if (err.response) {
        console.error('Backend Error:', err.response.data);
        setError(
          err.response?.data?.error || // Custom error message from the backend
          err.response?.data?.message || // Fallback to generic message
          err.message || // Fallback to default error message
          'Authentication failed. Please try again.' // Default message
        );
      } else {
        setError('Network error or unexpected issue. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex items-center justify-center space-x-2 h-10">
          <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
          <span className="text-sm text-gray-300">Loading...</span>
        </div>
      ) : (
        <div ref={buttonRef} className="min-h-[40px] w-full"></div>
      )}
      
      {error && (
        <div className="mt-2 bg-red-900/50 border border-red-700 rounded p-2">
          <p className="text-red-200 text-xs text-center">{error}</p>
        </div>
      )}
    </div>
  );
};

export default GoogleAuthButton;