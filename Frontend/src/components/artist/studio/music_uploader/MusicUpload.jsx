import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Music, Image as ImageIcon, X, ChevronDown, ChevronUp, Search,  Edit2 } from 'lucide-react';
import api from '../../../../api';
import { openModal, closeModal } from '../../../../slices/artist/modalSlice'; // Import actions
import { debounce } from 'lodash';
// import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import { toast } from 'react-toastify';
import ImageCropper from './ImageCropper';
import ResizeImage from './RezizeImage';

const MIN_IMAGE_SIZE = 500;
const MAX_IMAGE_SIZE = 2048;
const TARGET_SIZE = 500;




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


    const [showCropper, setShowCropper] = useState(false);
    const [originalImage, setOriginalImage] = useState(null);
    const dispatch = useDispatch()
    const [dragActive, setDragActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [genres, setGenres] = useState([]);
    const [imageInputKey, setImageInputKey] = useState(Date.now());
    const [coverPreview, setCoverPreview] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);


    const [albums, setAlbums] = useState([]);
    const [selectedAlbum, setSelectedAlbum] = useState('');
    const [trackNumber, setTrackNumber] = useState('');
    const [showAlbumSection, setShowAlbumSection] = useState(false);
  

    useEffect(() => {
      const fetchAlbums = async () => {
        try {
          const response = await api.get('/api/album/album_data');
          // Filter to only show public albums or those belonging to the user
          const filteredAlbums = response.data.filter(album => 
            album.is_public || album.artist_username === localStorage.getItem('username')
          );
          setAlbums(filteredAlbums);
        } catch (err) {
          console.error('Error fetching albums:', err);
          toast.error('Failed to load albums');
        }
      };
  
      fetchAlbums();
    }, []);

    
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
      const trimmedValue = value.trim(); // Remove leading and trailing spaces
    
      // Update form data with the trimmed value
      setFormData((prev) => ({ ...prev, [name]: value }));
    
      // If the name field changes, check for duplicates and validate the input
      if (name === 'name') {
        // Check if the value contains only whitespaces
        if (trimmedValue === "") {
          setNameValidation({
            isChecking: false,
          });
        } else {
          checkTrackName(value); // Check for duplicates or other validation
          setNameValidation({
            error: "", // Clear error when valid input
            isChecking: false,
          });
        }
      }
    };



    
  
    // Cancel debounced function on unmount
    useEffect(() => {
      return () => {
        checkTrackName.cancel();
      };
    }, []);
  


  
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
  




    


    const handleFileChange = async (e, type) => {
      const file = e.target.files[0];
      if (file) {
        if (type === 'cover') {
          try {
            // Validate image file type
            if (!file.type.startsWith('image/')) {
              throw new Error('Please select an image file');
            }
  
            const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
            if (!allowedImageTypes.includes(file.type)) {
              throw new Error('Only JPG, JPEG, and PNG images are accepted');
            }
  
            if (file.size > 5 * 1024 * 1024) {
              throw new Error('Image must be smaller than 5MB');
            }
  
            // Create a promise to get image dimensions
            const getDimensions = new Promise((resolve, reject) => {
              const img = new Image();
              const objectUrl = URL.createObjectURL(file);
              
              img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                resolve({ width: img.width, height: img.height });
              };
              
              img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Failed to load image'));
              };
              
              img.src = objectUrl;
            });
  
            const dimensions = await getDimensions;
  
            // Check if image is too large
            if (dimensions.width > MAX_IMAGE_SIZE || dimensions.height > MAX_IMAGE_SIZE) {
              throw new Error(`Image must be no larger than ${MAX_IMAGE_SIZE}x${MAX_IMAGE_SIZE} pixels`);
            }
  
            // Handle small images
            if (dimensions.width < MIN_IMAGE_SIZE || dimensions.height < MIN_IMAGE_SIZE) {
              const willResize = window.confirm(
                `Image is smaller than ${MIN_IMAGE_SIZE}x${MIN_IMAGE_SIZE} pixels. Would you like to automatically resize it? This may affect image quality.`
              );
  
              if (willResize) {
                const resized = await ResizeImage(file);
                console.log('Resized image details:', {
                  width: resized.width,
                  height: resized.height,
                  size: resized.file.size
                });
                
                setOriginalImage(resized.url);
                setShowCropper(true);
                // toast.success('Image has been resized successfully');
                return;
              } else {
                throw new Error(`Please select an image at least ${MIN_IMAGE_SIZE}x${MIN_IMAGE_SIZE} pixels`);
              }
            }
  
            // Handle normal sized images
            const reader = new FileReader();
            reader.onload = (e) => {
              setOriginalImage(e.target.result);
              setShowCropper(true);
            };
            reader.readAsDataURL(file);
  
          } catch (error) {
            console.error('Image processing error:', error);
            setFileErrors((prev) => ({
              ...prev,
              cover: error.message
            }));
            toast.error(error.message);
            resetImageInput();
          }
        } else {
          // Handle other file types (audio, video)
          setFiles((prev) => ({ ...prev, [type]: file }));
        }
      }
    };

    

  
    const handleCropSave = async () => {
      if (!croppedAreaPixels || !originalImage) return;
  
      try {
        const canvas = document.createElement('canvas');
        const image = new Image();
        image.src = originalImage;
  
        await new Promise((resolve) => {
          image.onload = resolve;
        });
  
        // Set fixed output dimensions
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;
  
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          canvas.width,
          canvas.height
        );
  
        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], 'cropped-cover.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
  
            const previewUrl = URL.createObjectURL(blob);
            setCoverPreview(previewUrl);
            setFiles((prev) => ({ ...prev, cover: croppedFile }));
            setShowCropper(false);
          }
        }, 'image/jpeg', 0.95);
      } catch (error) {
        console.error('Error cropping image:', error);
        toast.error('Failed to crop image. Please try again.');
      }
    };
  
    const resetImageInput = () => {
      setImageInputKey(Date.now());
      setFiles(prev => ({ ...prev, cover: null }));
      setCoverPreview(null);
      setOriginalImage(null);
      setShowCropper(false);
    };
  
    


    const handleDragOver = (e) => {
      e.preventDefault();
      setDragActive(true);
    };
    
    const handleDragLeave = () => setDragActive(false);
    
    const handleDrop = (e) => {
      e.preventDefault();
      setDragActive(false);
    
      const file = Array.from(e.dataTransfer.files)[0];
      if (file) {
        if (file.type.startsWith('audio/')) {
          const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/aac'];
          if (!allowedAudioTypes.includes(file.type)) {
            setFileErrors((prev) => ({
              ...prev,
              audio: 'Only MP3, WAV, and AAC files are accepted',
            }));
            toast.error('Only MP3, WAV, and AAC files are accepted');
            return;
          }
    
          if (file.size > 10 * 1024 * 1024) {
            setFileErrors((prev) => ({
              ...prev,
              audio: 'Audio file must be smaller than 10MB',
            }));
            toast.error('Audio file must be smaller than 10MB');
            return;
          }
    
          // Clear errors for valid drag-and-drop audio file
          setFileErrors((prev) => ({
            ...prev,
            audio: null,
          }));
          setFiles((prev) => ({ ...prev, audio: file }));
        } else {
          setFileErrors((prev) => ({
            ...prev,
            audio: 'Please select a valid audio file',
          }));
          toast.error('Please select a valid audio file');
        }
      }
    };
  
  
    const getAudioDuration = (file) => {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.src = URL.createObjectURL(file);
        audio.addEventListener('loadedmetadata', () => {
          URL.revokeObjectURL(audio.src);
          resolve(audio.duration);
        });
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


        if (files.audio) {
          const audioDuration = await getAudioDuration(files.audio);
          // Convert seconds to ISO 8601 duration format
          // This format is compatible with Django's DurationField
          const hours = Math.floor(audioDuration / 3600);
          const minutes = Math.floor((audioDuration % 3600) / 60);
          const seconds = Math.floor(audioDuration % 60);
          const milliseconds = Math.round((audioDuration % 1) * 1000000); // microseconds for Django
          
          const durationString = `P0DT${hours}H${minutes}M${seconds}.${milliseconds}S`;
          console.log('Sending duration:', durationString); // Add this line
          formDataToSubmit.append('duration', durationString);
        }


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

        if (selectedAlbum && trackNumber) {
          formDataToSubmit.append('album', selectedAlbum);
          formDataToSubmit.append('track_number', trackNumber);
        }
    
        const response = await api.post('/api/music/music/', formDataToSubmit, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
    
        if (response.status === 201) {
          setFormData({ name: '', selectedGenres: [], releaseDate: '', description: '' });
          setFiles({ audio: null, cover: null, video: null });
          setSelectedAlbum('');
          setTrackNumber('');
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
  


    const renderAlbumSection = () => (
      <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Add to Album</h3>
        <button
          type="button"
          onClick={() => setShowAlbumSection(!showAlbumSection)}
          className="text-blue-500 hover:text-blue-400"
        >
          {showAlbumSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {showAlbumSection && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Select Album (Optional)
              </label>
              <select
                value={selectedAlbum}
                onChange={(e) => {
                  setSelectedAlbum(e.target.value);
                  if (e.target.value) {
                    // Get the next available track number for this album
                    const album = albums.find(a => a.id.toString() === e.target.value);
                    const maxTrackNumber = album?.tracks?.reduce(
                      (max, track) => Math.max(max, track.track_number),
                      0
                    ) || 0;
                    setTrackNumber((maxTrackNumber + 1).toString());
                  } else {
                    setTrackNumber('');
                  }
                }}
                className="w-full p-2 border rounded-md bg-gray-700 text-white border-gray-600"
              >
                <option value="">Select an album...</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedAlbum && (
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Track Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  className="w-full p-2 border rounded-md bg-gray-700 text-white border-gray-600"
                  required={!!selectedAlbum}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );



  
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
        formData.name.trim() !== "" && 
        formData.selectedGenres.length > 0 &&
        formData.selectedGenres.every(id => id && id !== 'undefined') &&
        formData.releaseDate &&
        // !fileErrors.cover &&
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
    <div className="max-w-5xl mx-auto p-5">
      <div className="mb-8">
        <h2 className="text-2xl p-2 font-bold mb-1 text-white">Upload New Track</h2>
      <div className="p-1 border-b border-gray-700 "></div>
      <p className="text-white p-1 ">Share your music with the world</p>

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
              required
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
{/* Release Date */}
<div>
  <label htmlFor="releaseDate" className="block text-sm font-medium text-white mb-1">
    Release Date
  </label>
  <input
    id="releaseDate"
    type="datetime-local"
    name="releaseDate"
    value={formData.releaseDate}
    onChange={handleInputChange}
    className="w-full p-2 border rounded-md text-white bg-gray-700"
    max={new Date().toISOString().slice(0, 16)} // Restrict to current date and time
  />
</div>






{/* Cover Photo Section */}
<div>
  <label className="block text-sm font-medium text-white mb-1">
    Cover Photo (JPG/PNG only)
  </label>
  <div className="flex items-center space-x-4">
    <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gray-700">
      {coverPreview ? (
        <div className="relative group">
          <img
            src={coverPreview}
            alt="Cover preview"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}
    </div>

    <div className="flex-1 space-y-2">
      <input
        key={imageInputKey}
        type="file"
        accept=".jpg,.jpeg,.png"
        onChange={(e) => handleFileChange(e, 'cover')}
        className={`text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
          file:rounded-full file:border-0 file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100
          ${coverPreview ? 'file:bg-green-50 file:text-green-700 hover:file:bg-green-100' : ''}`}
  title={coverPreview ? 'Change file' : 'Upload image'}
/>
      {fileErrors.cover ? (
        <p className="text-red-400 text-sm">{fileErrors.cover}</p>
      ) : (
        <p className="text-gray-400 text-sm">
          {coverPreview ? 'Change image - ' : 'Upload image - '}
          Accepted formats: JPG, PNG, JPEG (max 5MB)
        </p>
      )}
    </div>
  </div>
</div>

      {/* Image Cropper Modal */}
      {showCropper && originalImage && (
      <ImageCropper
        image={originalImage}
        onCropComplete={setCroppedAreaPixels}
        onCropSave={handleCropSave}
        onClose={() => setShowCropper(false)}
      />
    )}
        

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


{renderAlbumSection()}



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
    // </div>
    // </div>

  );
};

export default MusicUpload;