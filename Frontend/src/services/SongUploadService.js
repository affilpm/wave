import api from './api';

export class SongUploadService {
  static async uploadSong(formData, files) {

    const uploadData = new FormData();
    

    uploadData.append('name', formData.name);
    uploadData.append('release_date', formData.releaseDate);
    

    uploadData.append('genres', JSON.stringify(formData.selectedGenres));
    

    if (files.audio) {
      uploadData.append('audio_file', files.audio);
    }
    if (files.cover) {
      uploadData.append('cover_photo', files.cover);
    }
    

    if (files.video) {
      uploadData.append('video_file', files.video);
    }
    
    try {
      const response = await api.post('/api/songs/', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
   
          console.log(`Upload Progress: ${percentCompleted}%`);
        },
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      let errorMessage = 'An error occurred while uploading the song';
      
      if (error.response) {
        // Handle specific API error responses
        switch (error.response.status) {
          case 400:
            errorMessage = Object.values(error.response.data).flat().join(', ');
            break;
          case 413:
            errorMessage = 'File size too large. Please upload a smaller file.';
            break;
          case 415:
            errorMessage = 'Unsupported file type. Please use MP3, WAV, or AAC format.';
            break;
          case 401:
            errorMessage = 'Please log in to upload songs.';
            break;
          case 403:
            errorMessage = 'You do not have permission to upload songs.';
            break;
          default:
            errorMessage = 'Server error. Please try again later.';
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  static validateFiles(files) {
    const errors = [];
    const maxAudioSize = 50 * 1024 * 1024; // 50MB
    const maxImageSize = 5 * 1024 * 1024;  // 5MB
    const maxVideoSize = 500 * 1024 * 1024; // 500MB
    
    // Validate audio file
    if (!files.audio) {
      errors.push('Audio file is required');
    } else if (files.audio.size > maxAudioSize) {
      errors.push('Audio file must be less than 50MB');
    }
    
    // Validate cover photo
    if (!files.cover) {
      errors.push('Cover photo is required');
    } else if (files.cover.size > maxImageSize) {
      errors.push('Cover photo must be less than 5MB');
    }
    
    // Validate video file if present
    if (files.video && files.video.size > maxVideoSize) {
      errors.push('Video file must be less than 500MB');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}