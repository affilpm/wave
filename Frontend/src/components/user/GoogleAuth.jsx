import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setUserData } from '../../slices/userSlice'; 
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { ACCESS_TOKEN, REFRESH_TOKEN, GOOGLE_CLIENT_ID } from '../../constants/authConstants';
import { decodeToken } from '../../utils/tokenUtils';

const GoogleAuth = () => {
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
          width: 300,
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
      console.log('Received credential:', response);
  
      if (!response?.credential) {
        throw new Error('No credential received from Google');
      }
  
      const backendResponse = await api.post('/api/users/google_auth/', 
        { token: response.credential },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
  
      const { data } = backendResponse;
      
      if (!data?.tokens?.access || !data?.tokens?.refresh) {
        throw new Error('Invalid token data received from server');
      }
      
      // Store tokens
      localStorage.setItem(ACCESS_TOKEN, data.tokens.access);
      localStorage.setItem(REFRESH_TOKEN, data.tokens.refresh);
  
      // Decode and log the access token
      const decodedToken = decodeToken(data.tokens.access);
      console.log('Decoded token:', decodedToken);
  
      // Verify user data is present in decoded token
      if (!decodedToken?.user_id || !decodedToken?.email) {
        throw new Error('Invalid user data in token');
      }
  
      // Dispatch user data
      dispatch(setUserData({
        email: decodedToken.email,
        first_name: decodedToken.first_name,
        last_name: decodedToken.last_name,
        image: decodedToken.image || null,
        isAuthenticated: true,
      }));
      // After Google auth success:
console.log('Access Token:', data.tokens.access);
console.log('Token from storage:', localStorage.getItem(ACCESS_TOKEN));
console.log('Auth header:', `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`);
      // Log the email correctly
      console.log(decodedToken.email);
  
      // Store user data in localStorage for easy access
      localStorage.setItem('userData', JSON.stringify({
        user_id: decodedToken.user_id,
        email: decodedToken.email,
        first_name: decodedToken.first_name,
        last_name: decodedToken.last_name,
        image: decodedToken.image || null,
      }));
      localStorage.setItem('isAuthenticated', 'true');
      console.log('User data stored successfully:', decodedToken);
  
      // Navigate to the home page
      navigate('/home');
    } catch (err) {
      console.error('Authentication error:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Authentication failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-white w-full max-w-md mx-4">
        <h2 className="text-3xl font-bold mb-6 text-center">Welcome</h2>
        <p className="text-gray-300 text-center mb-8">
          Sign in or create an account with Google
        </p>
        
        <div className="flex flex-col items-center gap-4">
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <div ref={buttonRef} className="min-h-[40px] flex items-center justify-center w-full"></div>
          )}
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 w-full">
              <p className="text-red-500 text-center text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleAuth;