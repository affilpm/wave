import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setUserData } from '../../slices/user/userSlice';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { ACCESS_TOKEN, REFRESH_TOKEN, GOOGLE_CLIENT_ID } from '../../constants/authConstants';
import { decodeToken } from '../../utils/tokenUtils';

const GoogleRegisterButton = () => {
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleCredential, setGoogleCredential] = useState(null);
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
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
  
      const { data } = await api.post('/api/users/google_pre_register/', 
        { token: response.credential },
        { headers: { 'Content-Type': 'application/json' } }
      );

      // If user needs to select a username
      if (data.requires_username) {
        setGoogleCredential(response.credential);
        setShowUsernameForm(true);
      } else {
        // Existing user or immediate registration possible
        await finalizeRegistration(response.credential);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        err.message || 
        'Authentication failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    if (!username) {
      setUsernameError('Username is required');
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post('/api/users/google_register/', 
        { 
          token: googleCredential, 
          username: username 
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      await finalizeRegistration(googleCredential);
    } catch (err) {
      console.error('Username registration error:', err);
      setUsernameError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        'Username registration failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const finalizeRegistration = async (credential) => {
    try {
      const { data } = await api.post('/api/users/google_login/', 
        { token: credential },
        { headers: { 'Content-Type': 'application/json' } }
      );

      localStorage.setItem(ACCESS_TOKEN, data.tokens.access);
      localStorage.setItem(REFRESH_TOKEN, data.tokens.refresh);
  
      const decodedToken = decodeToken(data.tokens.access);
  
      dispatch(setUserData({
        email: decodedToken.email,
        first_name: decodedToken.first_name,
        last_name: decodedToken.last_name,
        image: decodedToken.image || null,
        isAuthenticated: true,
      }));

      localStorage.setItem('userData', JSON.stringify({
        user_id: decodedToken.user_id,
        email: decodedToken.email,
        first_name: decodedToken.first_name,
        last_name: decodedToken.last_name,
        image: decodedToken.image || null,
      }));
      localStorage.setItem('isAuthenticated', 'true');
  
      navigate('/home');
    } catch (err) {
      console.error('Final registration error:', err);
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        'Registration failed. Please try again.'
      );
    }
  };

  // Render username form
  if (showUsernameForm) {
    return (
      <div className="w-full max-w-md mx-auto">
        <form onSubmit={handleUsernameSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
              Choose a Unique Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError('');
              }}
              placeholder="Enter your username"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            {usernameError && (
              <p className="text-red-500 text-xs italic mt-2">{usernameError}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              {loading ? 'Submitting...' : 'Submit Username'}
            </button>
          </div>
        </form>
      </div>
    );
  }

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

export default GoogleRegisterButton;