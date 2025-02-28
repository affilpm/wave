// hooks/useArtistStatus.js
import { useState, useEffect } from 'react';
import api from '../api';

export const useArtistStatus = () => {
  const [isArtist, setIsArtist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkArtistStatus = async () => {
    try {
      const response = await api.get('/api/artists/check-artist-status/');
      setIsArtist(response.data.is_artist);
    } catch (error) {
      console.error('Error checking artist status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkArtistStatus();
    // Check status every 5 minutes
    // const interval = setInterval(checkArtistStatus, 5 * 60 * 1000);
    // return () => clearInterval(interval);
  }, []);

  return { isArtist, isLoading };
};

