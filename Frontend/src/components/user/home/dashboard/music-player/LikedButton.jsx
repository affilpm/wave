import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import api from '../../../../../api';

const LikeButton = ({ trackId }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (trackId) {
      checkLikedStatus();
    }
  }, [trackId]);

  const checkLikedStatus = async () => {
    setIsChecking(true); // Start checking
    try {
      const playlistsResponse = await api.get('api/playlist/playlist_data/');
      const playlists = playlistsResponse.data.results || playlistsResponse.data;
      const likedPlaylist = playlists.find(playlist => playlist.name === 'Liked Songs');
  
      if (likedPlaylist) {
        const tracksResponse = await api.get('api/playlist/playlist-tracks/', {
          params: { playlist: likedPlaylist.id, music: trackId }
        });
        const tracks = tracksResponse.data.results || tracksResponse.data;
  
        // Check if trackId matches any track in the playlist
        const isTrackLiked = tracks.some(track => track.music === trackId); // Check if music matches
  
        setIsLiked(isTrackLiked); // Set liked status based on track existence
      } else {
        console.log('No "Liked Songs" playlist found');
        setIsLiked(false); // No Liked Songs playlist means not liked
      }
    } catch (error) {
      console.error('Error checking liked status:', error.response?.data || error.message);
      setIsLiked(false); // Ensure it's false on error
    } finally {
      setIsChecking(false); // Finish checking
    }
  };

  const handleLikeToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await api.post('api/playlist/playlists/like_Songs/', {
        music_id: trackId
      });

      if (response.status === 201 || response.status === 200) {
        setIsLiked((prev) => !prev);
      }
    } catch (error) {
      console.error('Error toggling like status:', error.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleLikeToggle}
      disabled={isLoading}
      className={`transition-all duration-200 ${isLoading ? 'opacity-50' : 'hover:scale-110'}`}
      aria-label={isLiked ? 'Unlike track' : 'Like track'}
    >
      {!isChecking && ( // Hide icon until status is confirmed
        <Heart 
          size={20} 
          className={`${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400'} 
            transition-colors duration-200 hover:text-red-500`}
        />
      )}
    </button>
  );
};

export default LikeButton;