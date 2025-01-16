import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Music, Image as ImageIcon, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import api from '../../../api';
import { openModal, closeModal } from '../../../slices/modalSlice'; // Import actions
import { debounce } from 'lodash';
import { toast } from 'react-toastify';
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
    const [fileErrors, setFileErrors] = useState({
      cover: null
    });

    const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
  
    const [nameValidation, setNameValidation] = useState({
      isChecking: false,
      error: null
    });
  
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedGenreIndex, setFocusedGenreIndex] = useState(-1);
    const [sortOrder, setSortOrder] = useState('asc');

    
    // Create a debounced function to check track name
    const checkTrackName = debounce(async (name) => {
      if (!name) {
        setNameValidation({ isChecking: false, error: null });
        return;
      }
  
      setNameValidation({ isChecking: true, error: null });
  
      try {
        const response = await api.get(`/api/music/music/check_name/?name=${encodeURIComponent(name)}`);
        
        if (response.data.exists) {
          setNameValidation({
            isChecking: false,
            error: 'A track with this name already exists'
          });
        } else {
          setNameValidation({ isChecking: false, error: null });
        }
      } catch (error) {
        setNameValidation({
          isChecking: false,
          error: 'Error checking track name'
        });
      }
    }, 500); // 500ms delay
  
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      
      // If the name field changes, check for duplicates
      if (name === 'name') {
        checkTrackName(value);
      }
    };
  
    // Cancel debounced function on unmount
    useEffect(() => {
      return () => {
        checkTrackName.cancel();
      };
    }, []);
  
  const dispatch = useDispatch()
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
            value: genre.id,  // Change this to use value instead of id
            label: genre.name
          })));
        } catch (err) {
          console.error('Error fetching genres:', err);
          setError('Failed to load genres. Please refresh the page.');
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
  
  
    const handleGenreSelect = (genreId) => {
      setFormData(prev => {
        const updatedGenres = prev.selectedGenres.includes(genreId)
          ? prev.selectedGenres
          : [...prev.selectedGenres, genreId];
        return { ...prev, selectedGenres: updatedGenres };
      });
      setIsGenreDropdownOpen(false);
    };
  
    const handleGenreRemove = (genreId) => {
      setFormData(prev => ({
        ...prev,
        selectedGenres: prev.selectedGenres.filter(id => id !== genreId)
      }));
    };
  
    const getGenreName = (genreId) => {
      const genre = genres.find(g => g.value === genreId);
      return genre ? genre.label : '';
    };
  

    const handleFileChange = (e, type) => {
      const file = e.target.files[0];
      if (file) {
        if (type === 'cover') {
          // Check if it's an image file
          if (!file.type.startsWith('image/')) {
            setFileErrors({
              ...fileErrors,
              cover: 'Please select an image file'
            });
            e.target.value = ''; // Reset input
            setFiles(prev => ({ ...prev, [type]: null }));
            return;
          }
    
          // Check for specific image types
          const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
          if (!allowedImageTypes.includes(file.type)) {
            setFileErrors({
              ...fileErrors,
              cover: 'Only JPG, JPEG and PNG images are accepted'
            });
            e.target.value = ''; // Reset input
            setFiles(prev => ({ ...prev, [type]: null }));
            return;
          }
    
          // Check file size
          if (file.size > 5 * 1024 * 1024) {
            setFileErrors({
              ...fileErrors,
              cover: 'Image must be smaller than 5MB'
            });
            e.target.value = ''; // Reset input
            setFiles(prev => ({ ...prev, [type]: null }));
            return;
          }
    
          // Clear any previous errors if file is valid
          setFileErrors({
            ...fileErrors,
            cover: null
          });
        }
        
        setFiles(prev => ({ ...prev, [type]: file }));
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
        formDataToSubmit.append('name', formData.name);
        
        if (formData.releaseDate) {
          formDataToSubmit.append('release_date', formData.releaseDate);
        }
    
        if (files.audio) formDataToSubmit.append('audio_file', files.audio);
        if (files.cover) formDataToSubmit.append('cover_photo', files.cover);
        if (files.video) formDataToSubmit.append('video_file', files.video);
    
        // Append genres correctly (using genre IDs)
        formData.selectedGenres.forEach(genreId => {
          if (genreId && genreId !== 'undefined') {  // Add validation
            formDataToSubmit.append('genres[]', genreId.toString());  // Ensure it's a string
          }
        });
    
        const response = await api.post('/api/music/music/', formDataToSubmit, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
    
        if (response.status === 201) {
          setFormData({ name: '', selectedGenres: [], releaseDate: '', description: '' });
          setFiles({ audio: null, cover: null, video: null });
          dispatch(closeModal());
          toast.success('Track uploaded successfully!', {
            position: 'top-right', // You can choose 'top-left', 'top-center', etc.
            autoClose: 3000, // Duration in milliseconds
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: 'dark', // or 'dark'
          });
        }
    
      } catch (error) {
        // Log error details for debugging
        console.error('Upload error details:', {
          message: error.message,
          stack: error.stack,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
    
        // Handle specific error response from backend
        if (error.response?.data) {
          const errorMessage = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
          setError(errorMessage);
        } else if (error.request) {
          setError('No response received from the server. Please check your network connection.');
        } else {
          setError('An unexpected error occurred. Please try again.');
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
    const isFormValid = () => {
      return (
        files.audio && 
        files.cover && 
        formData.name && 
        formData.selectedGenres.length > 0 &&
        formData.selectedGenres.every(id => id && id !== 'undefined') &&
        !fileErrors.cover &&
        !nameValidation.isChecking &&
        !nameValidation.error
      );
    };


    // Enhanced keyboard navigation for genre dropdown
    const handleKeyDown = (e) => {
      if (!isGenreDropdownOpen) return;
  
      const filteredGenres = getFilteredGenres();
      const genresLength = filteredGenres.length;
  
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedGenreIndex(prev => 
            prev < genresLength - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedGenreIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedGenreIndex >= 0 && focusedGenreIndex < genresLength) {
            handleGenreSelect(filteredGenres[focusedGenreIndex].value);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsGenreDropdownOpen(false);
          break;
        default:
          break;
      }
    };
  
    // Get filtered and sorted genres
    const getFilteredGenres = () => {
      return genres
        .filter(genre => 
          !formData.selectedGenres.includes(genre.value) &&
          genre.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
          const comparison = a.label.localeCompare(b.label);
          return sortOrder === 'asc' ? comparison : -comparison;
        });
    };
  
    const toggleSortOrder = () => {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };
  
    // Effect for dropdown focus management
    useEffect(() => {
      if (!isGenreDropdownOpen) {
        setFocusedGenreIndex(-1);
        setSearchQuery('');
      } else if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isGenreDropdownOpen]);
  
    // Click outside listener
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsGenreDropdownOpen(false);
          setFocusedGenreIndex(-1);
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    
  return (
    <div className="max-w-4xl mx-auto p-0">
    <div className="bg-gray-900 rounded-lg border border-black">
      <div className="p-6 border-b border-black ">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 text-white">Upload New Track</h2>
        <p className="text-white">Share your music with the world</p>
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
          <Music className="mx-auto h-12 w-12 text-gray-400 mb-4"/>
          {files.audio ? (
            <div className="text-green-600 font-medium">{files.audio.name}</div>
          ) : (
            <>
              <p className="text-lg mb-2 text-white">Drag and drop your audio file here</p>
              <p className="text-sm text-white">or click to browse</p>
              <p className="text-xs text-white mt-2">Supported formats: MP3, WAV, AAC</p>
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
        <label htmlFor="name" className="block text-sm font-medium text-white mb-1">
            Track Name
          </label>
          <div className="relative">
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded-md bg-gray-700 text-white ${
                nameValidation.error ? 'border-red-500' : ''
              }`}
              placeholder="Enter track name"
            />
            {nameValidation.isChecking && (
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 text-sm">
                Checking...
              </span>
            )}
          </div>
          {nameValidation.error && (
            <p className="mt-1 text-sm text-red-500">
              {nameValidation.error}
            </p>
          )}
        </div>

        {/* Enhanced Genre Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-white mb-1">
            Select Genres
          </label>
          
          {/* Selected Genres Display */}
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.selectedGenres.map(genreId => (
              <span
                key={genreId}
                className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
              >
                {getGenreName(genreId)}
                <button
                  type="button"
                  onClick={() => handleGenreRemove(genreId)}
                  className="hover:text-red-200"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>

          {/* Genre Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
              className="w-full p-2 border rounded-md bg-gray-700 text-white text-left flex items-center justify-between"
            >
              <div className="flex items-center">
                <Music className="h-5 w-5 mr-2" />
                <span>Select genres...</span>
              </div>
              {isGenreDropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {isGenreDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg">
                {/* Search and Sort Controls */}
                <div className="p-2 border-b border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search genres..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={toggleSortOrder}
                    className="mt-2 px-3 py-1 text-sm text-gray-300 hover:text-white flex items-center gap-1"
                  >
                    Sort {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>

                {/* Genres List */}
                <div className="max-h-48 overflow-y-auto">
                  {getFilteredGenres().map((genre, index) => (
                    <button
                      key={genre.value}
                      type="button"
                      onClick={() => handleGenreSelect(genre.value)}
                      onMouseEnter={() => setFocusedGenreIndex(index)}
                      className={`w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center justify-between ${
                        focusedGenreIndex === index ? 'bg-gray-700' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <Music className="h-4 w-4 mr-2" />
                        {genre.label}
                      </div>
                      <span className="text-xs text-gray-400">Click to add</span>
                    </button>
                  ))}
                  {getFilteredGenres().length === 0 && (
                    <div className="px-4 py-2 text-gray-400 text-center">
                      No genres found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Release Date */}
        <div>
          <label htmlFor="releaseDate" className="block text-sm  font-medium text-white mb-1">
            Release Date
          </label>
          <input
            id="releaseDate"
            type="datetime-local"
            name="releaseDate"
            value={formData.releaseDate}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md text-white bg-gray-700"
          />
        </div>

  {/* Cover Photo */}
<div>
  <label className="block text-sm font-medium text-white mb-1">
    Cover Photo (JPG/PNG only)
  </label>
  <div className="flex items-center space-x-4">
    <div className="w-32 h-32 border rounded-lg overflow-hidden">
      {coverPreview ? (
        <img
          src={coverPreview}
          alt="Cover preview"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}
    </div>
    <div className="flex-1 space-y-2">
      <input
        type="file"
        accept=".jpg,.jpeg,.png"
        onChange={(e) => handleFileChange(e, 'cover')}
        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                  file:rounded-full file:border-0 file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {fileErrors.cover ? (
        <p className="text-red-400 text-sm">{fileErrors.cover}</p>
      ) : (
        <p className="text-gray-400 text-sm">Accepted formats: JPG, PNG, JPEG (max 5MB)</p>
      )}
    </div>
  </div>
</div>
        
        
        

        {/* Video Upload */}
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Music Video (Optional)
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleFileChange(e, 'video')}
            className="text-sm text-white file:mr-4 file:py-2 file:px-4 
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
    !isFormValid()
      ? 'bg-gray-400 cursor-not-allowed' 
      : 'bg-blue-600 hover:bg-blue-700 text-white'
  }`}
  disabled={!isFormValid()}
>
  {isLoading ? 'Uploading...' : 'Upload Track'}
</button>
      </form>
    </div>
    </div>
    </div>

  );
};

export default MusicUpload;