// albumService.js
import api from '../../api';

export const albumService = {
  createAlbum: async (albumData) => {
    try {
      const formData = new FormData();
      const formattedReleaseDate = new Date(albumData.releaseDate).toISOString();
      
      // Append basic album data
      formData.append('name', albumData.name);
      formData.append('description', albumData.description);
      formData.append('release_date', formattedReleaseDate);
      formData.append('is_public', albumData.is_public.toString()); // Convert boolean to string
      
      // Append tracks data
      if (albumData.tracks?.length) {
        formData.append('tracks', JSON.stringify(albumData.tracks));
      }
      
      if (albumData.coverPhoto) {
        formData.append('cover_photo', albumData.coverPhoto);
      }
      if (albumData.bannerImg) {
        formData.append('banner_img', albumData.bannerImg);
      }
      
      // Debug log
      console.log('Sending album data:');
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }
      
      const response = await api.post('/api/album/albums/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      // Enhanced error logging
      console.error('Create album error:', error.response?.data || error);
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(errorMessage);
    }
},

    

    togglePublicStatus: async (albumId) => {
      try {
        const response = await api.patch(`/api/album/albums/${albumId}/update_is_public/`);
        return response.data;
      } catch (error) {
        throw new Error('Failed to toggle album status');
      }
    } ,
  
  // getDrafts: async () => {
  //   try {
  //     const response = await api.get('/api/album/albums/drafts/');
  //     return response.data;
  //   } catch (error) {
  //     throw new Error('Failed to fetch drafts');
  //   }
  // },
  
  getAvailableTracks: async () => {
    try {
      const response = await api.get('/api/album/tracks/available_tracks/');
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
      // formData.append('status', albumData.status);
      
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
      
      const response = await api.patch(`/api/album/albums/${albumId}/`, formData, {
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
      const response = await api.get(`/api/album/albums/check_album_existence/?name=${encodeURIComponent(albumName)}`);
      console.log('Album check response:', response); // Add logging
      return response.data.exists;
    } catch (error) {
      console.error('Album check service error:', error); // Add logging
      throw new Error(error.response?.data?.message || 'Failed to check album existence');
    }
  },
};

export default albumService;