// albumService.js
import api from '../api';

export const albumService = {
    createAlbum: async (albumData) => {
        try {
          const formData = new FormData();
          const formattedReleaseDate = new Date(albumData.releaseDate).toISOString();
          
          // Append basic album data - Fixed field names to match backend
          formData.append('name', albumData.name);
          formData.append('description', albumData.description);
          formData.append('release_date', formattedReleaseDate); // Changed from releaseDate
          formData.append('status', albumData.status);
      
          // Append tracks data
          if (albumData.tracks?.length) {
            formData.append('tracks', JSON.stringify(albumData.tracks));
          }
      
          // Fixed field names for files to match backend expectations
          if (albumData.coverPhoto) {
            formData.append('cover_photo', albumData.coverPhoto); // Changed from coverPhoto
          }
          if (albumData.bannerImg) {
            formData.append('banner_img', albumData.bannerImg); // Changed from bannerImg
          }
          
          const response = await api.post('/api/music/albums/', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          return response.data;
        } catch (error) {
          const errorMessage = error.response?.data?.error || error.message;
          throw new Error(errorMessage);
        }
    },
  
  getDrafts: async () => {
    try {
      const response = await api.get('/api/music/albums/drafts/');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch drafts');
    }
  },
  
  getAvailableTracks: async () => {
    try {
      const response = await api.get('/api/music/tracks/available_tracks/');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch available tracks');
    }
  },
  
  updateAlbum: async (albumId, albumData) => {
    try {
      const formData = new FormData();
      
      // Append basic album data
      formData.append('name', albumData.name);
      formData.append('description', albumData.description || '');
      formData.append('release_date', albumData.releaseDate);
      formData.append('status', albumData.status);
      
      // Append files only if they've changed
      if (albumData.coverPhoto instanceof File) {
        formData.append('cover_photo', albumData.coverPhoto);
      }
      if (albumData.bannerImg instanceof File) {
        formData.append('banner_img', albumData.bannerImg);
      }
      
      // Append tracks data
      if (albumData.tracks?.length) {
        formData.append('tracks', JSON.stringify(
          albumData.tracks.map((track, index) => ({
            track: track.id,
            track_number: index + 1
          }))
        ));
      }
      
      const response = await api.patch(`/api/music/albums/${albumId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(errorMessage);
    }
  },
  checkAlbumExists: async (albumName) => {
    try {
      if (!albumName.trim()) {
        return false; // Don't check empty names
      }
      const response = await api.get(`/api/music/albums/check_album_existence/?name=${encodeURIComponent(albumName)}`);
      console.log('Album check response:', response); // Add logging
      return response.data.exists;
    } catch (error) {
      console.error('Album check service error:', error); // Add logging
      throw new Error(error.response?.data?.message || 'Failed to check album existence');
    }
  },
};

export default albumService;