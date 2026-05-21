import { useState, useEffect } from 'react';
import api from '../api';

export const useArtistStatus = () => {
  const [isArtist, setIsArtist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkArtistStatus = async () => {
    try {
      const response = await api.get('/api/v1/artists/check-artist-status/');
      setIsArtist(response.data.is_artist);
    } catch (error) {
      console.error('Error checking artist status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkArtistStatus();

    const handleStatusUpdate = () => {
      checkArtistStatus();
    };

    window.addEventListener('artistStatusUpdated', handleStatusUpdate);
    return () => {
      window.removeEventListener('artistStatusUpdated', handleStatusUpdate);
    };
  }, []);

  return { isArtist, isLoading, checkArtistStatus };
};

