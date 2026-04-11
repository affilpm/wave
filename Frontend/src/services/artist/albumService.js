// albumService.js
import api from '../../api';
import { ALBUMS } from '../../constants/apiEndpoints';

const devLog = import.meta.env.DEV ? (...args) => console.log('[albumService]', ...args) : () => {};
const devError = import.meta.env.DEV ? (...args) => console.error('[albumService]', ...args) : () => {};

const albumService = {
  createAlbum: async (albumData) => {
    try {
      const formData = new FormData();
      
      let formattedReleaseDate;
      if (albumData.releaseDate) {
        const dateInput = albumData.releaseDate;
        let date;
        
        if (typeof dateInput === 'string' && dateInput.includes('T')) {
          date = new Date(dateInput);
        } else {
          date = new Date(Date.parse(dateInput));
        }

        if (isNaN(date.getTime())) {
          devError('Invalid date input:', dateInput);
          throw new Error('Invalid release date format');
        }

        formattedReleaseDate = date.toISOString();
      } else {
        throw new Error('Release date is required');
      }
      
      formData.append('name', albumData.name);
      formData.append('description', albumData.description);
      formData.append('release_date', formattedReleaseDate);
      formData.append('is_public', albumData.is_public.toString());
      
      if (albumData.tracks?.length) {
        formData.append('tracks', JSON.stringify(albumData.tracks));
      }
      
      if (albumData.coverPhoto) {
        formData.append('cover_photo', albumData.coverPhoto);
      }
      if (albumData.bannerImg) {
        formData.append('banner_img', albumData.bannerImg);
      }
      
      devLog('Sending album data:', {
        name: albumData.name,
        releaseDate: formattedReleaseDate,
        isPublic: albumData.is_public,
        tracksCount: albumData.tracks?.length || 0,
        description: albumData.description
      });
      
      const response = await api.post(ALBUMS.LIST, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response;
    } catch (error) {
      devError('Create album error details:', {
        originalError: error,
        responseData: error.response?.data,
        message: error.message
      });
      throw new Error(error.response?.data?.error || error.message || 'Failed to create album');
    }
  },

  togglePublicStatus: async (albumId) => {
    try {
      const response = await api.patch(ALBUMS.TOGGLE_PUBLIC(albumId));
      return response.data;
    } catch (error) {
      throw new Error('Failed to toggle album status');
    }
  },
  
  getAvailableTracks: async () => {
    try {
      const response = await api.get(ALBUMS.AVAILABLE_TRACKS);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch available tracks');
    }
  },
  
  updateAlbum: async (albumId, albumData) => {
    try {
      const formData = new FormData();
      
      formData.append('name', albumData.name);
      formData.append('description', albumData.description || '');
      
      if (albumData.releaseDate) {
        let date;
        if (typeof albumData.releaseDate === 'string') {
          date = new Date(albumData.releaseDate);
        } else {
          date = albumData.releaseDate;
        }
        formData.append('release_date', date.toISOString());
      }
      
      if (albumData.coverPhoto instanceof File) {
        formData.append('cover_photo', albumData.coverPhoto);
      }
      if (albumData.bannerImg instanceof File) {
        formData.append('banner_img', albumData.bannerImg);
      }
      
      if (albumData.tracks?.length) {
        const tracksData = albumData.tracks.map((track, index) => ({
          track: track.track || track.id,
          track_number: index + 1
        }));
        formData.append('tracks', JSON.stringify(tracksData));
      }
      
      devLog('Updating album with data:', {
        id: albumId,
        name: albumData.name,
        tracksCount: albumData.tracks?.length || 0
      });
      
      const response = await api.patch(ALBUMS.DETAIL(albumId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      devError('Update album error:', error.response?.data || error);
      throw new Error(errorMessage);
    }
  },
  
  checkAlbumExists: async (albumName) => {
    try {
      if (!albumName.trim()) {
        return false;
      }
      const response = await api.get(`${ALBUMS.CHECK_EXISTS}?name=${encodeURIComponent(albumName)}`);
      return response.data.exists;
    } catch (error) {
      devError('Album check service error:', error.message);
      throw new Error(error.response?.data?.message || 'Failed to check album existence');
    }
  },
};

export default albumService;