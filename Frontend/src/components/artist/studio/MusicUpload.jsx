import React, { useState, useEffect } from 'react';
import { Music, Image as ImageIcon } from 'lucide-react';
import api from '../../../api';


const MusicUpload = () => {

    const [formData, setFormData] = useState({
      name: '',
      selectedGenres: [],
      releaseDate: '',
      description: '',
    });
  
    const [files, setFiles] = useState({
      audio: null,
      cover: null,
      video: null,
    });
  
    const [dragActive, setDragActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [genres, setGenres] = useState([]);
    const [modalSize, setModalSize] = useState('max-w-4xl');
  
    // Fetch genres from backend with authenticated request
    useEffect(() => {
      const fetchGenres = async () => {
        try {
          const response = await api.get('/api/music/genres/');
          setGenres(response.data.map(genre => ({
            id: genre.id,
            value: genre.name.toLowerCase().replace(/ /g, '_'),
            label: genre.name
          })));
        } catch (err) {
          console.error('Error fetching genres:', err);
          setError('Failed to load genres. Please refresh the page.');
          
          // If error is due to authentication, it will be handled by the interceptor
          if (err.response?.status === 401) {
            return;
          }
        }
      };
  
      fetchGenres();
    }, []);
  
    // Keep existing resize effect
    useEffect(() => {
      const handleResize = () => {
        if (window.innerWidth < 640) {
          setModalSize('max-w-full');
        } else if (window.innerWidth < 1024) {
          setModalSize('max-w-2xl');
        } else {
          setModalSize('max-w-4xl');
        }
      };
  
      window.addEventListener('resize', handleResize);
      handleResize();
  
      return () => window.removeEventListener('resize', handleResize);
    }, []);
  
    // Keep existing handlers
    const handleGenreChange = (genreId) => {
      setFormData((prev) => {
        const newSelectedGenres = prev.selectedGenres.includes(genreId)
          ? prev.selectedGenres.filter((id) => id !== genreId)
          : [...prev.selectedGenres, genreId];
        return { ...prev, selectedGenres: newSelectedGenres };
      });
    };
  
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    };
  
    const handleFileChange = (e, type) => {
      const file = e.target.files[0];
      if (file) {
        setFiles((prev) => ({ ...prev, [type]: file }));
      }
    };
  
    const handleDragOver = (e) => {
      e.preventDefault();
      setDragActive(true);
    };
  
    const handleDragLeave = () => setDragActive(false);
  
    const handleDrop = (e) => {
      e.preventDefault();
      setDragActive(false);
      const audioFile = Array.from(e.dataTransfer.files).find((file) =>
        file.type.startsWith('audio/')
      );
      if (audioFile) {
        setFiles((prev) => ({ ...prev, audio: audioFile }));
      }
    };
  
    const getFilePreview = (file) => {
      return file ? `data:${file.type};base64,${convertToBase64(file)}` : null;
    };
  
    const convertToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
      });
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setError(null);
  
      if (!files.audio || !files.cover || !formData.name || formData.selectedGenres.length === 0) {
        setError('Please fill in all required fields');
        return;
      }
  
      setIsLoading(true);
  
      try {
        const formDataToSubmit = new FormData();
        
        // Basic fields
        formDataToSubmit.append('name', formData.name);
        
        // Date handling - ensure proper format for Django
        if (formData.releaseDate) {
          formDataToSubmit.append('release_date', formData.releaseDate);
        }
        
        // Files - append with explicit content types
        if (files.audio) {
          formDataToSubmit.append('audio_file', files.audio);
        }
        
        if (files.cover) {
          formDataToSubmit.append('cover_photo', files.cover);
        }
        
        if (files.video) {
          formDataToSubmit.append('video_file', files.video);
        }
        
        // Genres - append each one separately without brackets
        formData.selectedGenres.forEach(genreId => {
          formDataToSubmit.append('genres', genreId);
        });
  
        // Debug logging
        console.log('Submitting form data:');
        for (let [key, value] of formDataToSubmit.entries()) {
          console.log(`${key}: `, value instanceof File ? `File: ${value.name}` : value);
        }
  
        const response = await api.post('/api/music/music/', formDataToSubmit, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          // Add request transformation debugging
          transformRequest: [(data, headers) => {
            console.log('Request headers:', headers);
            return data;
          }],
        });
  
        // Reset form on success
        setFormData({ name: '', selectedGenres: [], releaseDate: '', description: '' });
        setFiles({ audio: null, cover: null, video: null });
        
        alert('Track uploaded successfully!');
  
      } catch (error) {
        console.error('Upload error details:', {
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        
        if (error.response?.data) {
          const errorMessage = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
          setError(errorMessage);
        } else {
          setError('Failed to upload track. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };
  
  
    // For the image preview CSP issue, use data URLs instead of blob URLs
    const getImagePreview = (file) => {
      if (!file) return null;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    };
  
    // Update the cover photo preview section
    const [coverPreview, setCoverPreview] = useState(null);
  
    useEffect(() => {
      if (files.cover) {
        getImagePreview(files.cover).then(setCoverPreview);
      } else {
        setCoverPreview(null);
      }
    }, [files.cover]);
    // Show error message if there is one
    if (error) {
      return (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      );
    }
  

  return (
    <div className={`bg-white shadow-lg rounded-lg w-full p-6 ${modalSize} overflow-auto`}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Upload New Track</h2>
        <p className="text-gray-600">Share your music with the world</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Audio Upload */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          } ${files.audio ? 'bg-green-50 border-green-500' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('audio-upload').click()}
        >
          <input
            id="audio-upload"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, 'audio')}
          />
          <Music className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {files.audio ? (
            <div className="text-green-600 font-medium">{files.audio.name}</div>
          ) : (
            <>
              <p className="text-lg mb-2">Drag and drop your audio file here</p>
              <p className="text-sm text-gray-500">or click to browse</p>
              <p className="text-xs text-gray-400 mt-2">Supported formats: MP3, WAV, AAC</p>
            </>
          )}
        </div>

        {/* Audio Player */}
{files.audio && (
  <div className="mt-4">
    <audio controls className="w-full">
      <source src={URL.createObjectURL(files.audio)} type={files.audio.type} />
      Your browser does not support the audio element.
    </audio>
  </div>
)}

        {/* Track Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Track Name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md bg-white text-black"
            placeholder="Enter track name"
          />
        </div>

        {/* Genre Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Genres (Select multiple)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {genres.map((genre) => (
              <button
                key={genre.id}
                type="button"
                onClick={() => handleGenreChange(genre.id)}
                className={`p-2 rounded-md text-sm text-left transition-colors ${
                  formData.selectedGenres.includes(genre.id)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {genre.label}
              </button>
            ))}
          </div>
        </div>

        {/* Release Date */}
        <div>
          <label htmlFor="releaseDate" className="block text-sm font-medium text-gray-700 mb-1">
            Release Date
          </label>
          <input
            id="releaseDate"
            type="datetime-local"
            name="releaseDate"
            value={formData.releaseDate}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md bg-white"
          />
        </div>

        {/* Cover Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cover Photo</label>
          <div className="flex items-center space-x-4">
          <div className="w-32 h-32 border rounded-lg overflow-hidden">
      {coverPreview ? (
        <img
          src={coverPreview}
          alt="Cover preview"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}
    </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'cover')}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                        file:rounded-full file:border-0 file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
        
        
        

        {/* Video Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Music Video (Optional)
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleFileChange(e, 'video')}
            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                      file:rounded-full file:border-0 file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* Video Player */}
        {files.video && (
          <div className="mt-4">
            <video controls className="w-full">
              <source src={URL.createObjectURL(files.video)} type="video/mp4" />
              Your browser does not support the video element.
            </video>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full py-2 px-4 rounded-md transition-colors ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          disabled={isLoading || !files.audio || !files.cover || !formData.name || formData.selectedGenres.length === 0}
        >
          {isLoading ? 'Uploading...' : 'Upload Track'}
        </button>
      </form>
    </div>
  );
};

export default MusicUpload;