// albumService.js
import api from '../../api';



const albumService = {
  createAlbum: async (albumData) => {
    try {
      const formData = new FormData();
      
      // More robust date handling with explicit validation
      let formattedReleaseDate;
      if (albumData.releaseDate) {
        // Handle different date input formats
        const dateInput = albumData.releaseDate;
        let date;
        
        if (typeof dateInput === 'string' && dateInput.includes('T')) {
          // If it's already in ISO format or datetime-local input format
          date = new Date(dateInput);
        } else {
          // If it's in a different format, try parsing it
          date = new Date(Date.parse(dateInput));
        }

        if (isNaN(date.getTime())) {
          console.error('Invalid date input:', dateInput);
          throw new Error('Invalid release date format');
        }

        // Format to ISO string and ensure UTC
        formattedReleaseDate = date.toISOString();
        console.log('Formatted release date:', formattedReleaseDate); // Debug log
      } else {
        throw new Error('Release date is required');
      }
      
      // Append basic album data
      formData.append('name', albumData.name);
      formData.append('description', albumData.description);
      formData.append('release_date', formattedReleaseDate);
      formData.append('is_public', albumData.is_public.toString());
      
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
      console.log('Sending album data:', {
        name: albumData.name,
        releaseDate: formattedReleaseDate,
        isPublic: albumData.is_public,
        tracksCount: albumData.tracks?.length || 0,
        description: albumData.description
      });
      
      const response = await api.post('/api/album/albums/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response;
    } catch (error) {
      console.error('Create album error details:', {
        originalError: error,
        responseData: error.response?.data,
        message: error.message
      });
      throw new Error(error.response?.data?.error || error.message || 'Failed to create album');
    }
  }
,

    

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
      
      // Format release date if provided
      if (albumData.releaseDate) {
        let date;
        if (typeof albumData.releaseDate === 'string') {
          date = new Date(albumData.releaseDate);
        } else {
          date = albumData.releaseDate;
        }
        formData.append('release_date', date.toISOString());
      }
      
      // Append files only if they've changed
      if (albumData.coverPhoto instanceof File) {
        formData.append('cover_photo', albumData.coverPhoto);
      }
      if (albumData.bannerImg instanceof File) {
        formData.append('banner_img', albumData.bannerImg);
      }
      
      // Append tracks data - always include ALL tracks
      if (albumData.tracks?.length) {
        const tracksData = albumData.tracks.map((track, index) => ({
          track: track.track || track.id, // Handle both formats
          track_number: index + 1
        }));
        formData.append('tracks', JSON.stringify(tracksData));
      }
      
      // Debug log
      console.log('Updating album with data:', {
        id: albumId,
        name: albumData.name,
        tracksCount: albumData.tracks?.length || 0
      });
      
      const response = await api.patch(`/api/album/albums/${albumId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      console.error('Update album error:', error.response?.data || error);
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