import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';
import { GOOGLE_CLIENT_ID } from '../../../constants/authConstants';
import UsernameSelectionModal from './UsernameSelectionModal';



const GoogleRegisterButton = () => {
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [googleCred, setGoogleCred] = useState(null);

  const handleCredentialResponse = async (response) => {
    if (loading) return;
    setLoading(true);
    setError('');
  
    try {
      if (!response?.credential) {
        throw new Error('No credential received from Google');
      }
  
      const { data } = await api.post('/api/users/google-pre-register/', 
        { token: response.credential },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (data.requires_username) {
        setGoogleCred(response.credential);
        setIsModalOpen(true);
      } else {
        navigate('/login', {
          state: { message: 'Registration successful! Please log in.' }
        });
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

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
            <UsernameSelectionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        googleCredential={googleCred}
      />

    </div>
  );
};

export default GoogleRegisterButton;