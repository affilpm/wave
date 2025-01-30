import React, { useState, useEffect, useRef } from 'react';
import { Music, Upload, Calendar, AlertCircle, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
// import { Music, Image as ImageIcon, X as XIcon} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { albumService } from '../../../services/artist/albumService'
import api from '../../../api';
import { useDispatch } from 'react-redux';
import { openModal, closeModal } from '../../../slices/artist/modalSlice';
import { debounce } from 'lodash';

const AlbumCreator = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const [albumData, setAlbumData] = useState({
    name: '',
    description: '',
    coverPhoto: null,
    bannerImg: null,
    releaseDate: '',
    status: 'draft',
    is_public: false,  // Add this line
  });
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tracksList, setTracksList] = useState([]);
  const [successMessage, setSuccessMessage] = useState([]);
  const [albumNameError, setAlbumNameError] = useState('');
  const [isTrackDropdownOpen, setIsTrackDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedTrackIndex, setFocusedTrackIndex] = useState(-1);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  useEffect(() => {
    fetchUserTracks();

    // Add click outside listener
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsTrackDropdownOpen(false);
        setFocusedTrackIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset focused index when dropdown closes
  useEffect(() => {
    if (!isTrackDropdownOpen) {
      setFocusedTrackIndex(-1);
      setSearchQuery('');
    } else if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isTrackDropdownOpen]);

  const fetchUserTracks = async () => {
    try {
      const response = await api.get('/api/album/music/');
      setTracksList(response.data);
    } catch (err) {
      setError('Failed to load tracks: ' + (err.response?.data?.error || err.message));
    }
  };

  // Get filtered and sorted tracks
  const getFilteredTracks = () => {
    return tracksList
      .filter(track => 
        !selectedTracks.some(selected => selected.id === track.id) &&
        track.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  };

  const handleKeyDown = (e) => {
    if (!isTrackDropdownOpen) return;

    const filteredTracks = getFilteredTracks();
    const tracksLength = filteredTracks.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedTrackIndex(prev => 
          prev < tracksLength - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedTrackIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedTrackIndex >= 0 && focusedTrackIndex < tracksLength) {
          handleTrackSelection(filteredTracks[focusedTrackIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsTrackDropdownOpen(false);
        break;
      default:
        break;
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };





  const [isChecking, setIsChecking] = useState(false); // Loading state

  const debouncedCheckAlbum = debounce(async (value) => {
    if (!value.trim()) {
      setAlbumNameError('');
      setIsChecking(false); // Stop loading when empty
      return;
    }

    setIsChecking(true); // Start loading when checking
    try {
      const exists = await albumService.checkAlbumExists(value);
      if (exists) {
        setAlbumNameError('An album with this name already exists.');
      } else {
        setAlbumNameError('');
      }
    } catch (err) {
      console.error('Album check error:', err);
      setAlbumNameError(`Failed to check album existence: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsChecking(false); // Stop loading after check is complete
    }
  }, 500);


  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setAlbumData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setAlbumNameError(''); // Clear error on change

    if (name === 'name') {
      debouncedCheckAlbum(value);
    }
  };

  const handleTrackSelection = (track) => {
    setSelectedTracks((prev) => {
      const trackExists = prev.some((t) => t.id === track.id);
      if (trackExists) {
        return prev;
      } else {
        return [
          ...prev,
          {
            id: track.id,
            track_number: prev.length + 1,
            track_details: track,
          },
        ];
      }
    });
    setIsTrackDropdownOpen(false);
    setError('');
  };

  const handleTrackRemove = (trackId) => {
    setSelectedTracks((prev) => {
      const filteredTracks = prev.filter((t) => t.id !== trackId);
      // Reorder remaining tracks
      return filteredTracks.map((track, index) => ({
        ...track,
        track_number: index + 1,
      }));
    });
  };

const [coverPhotoError, setCoverPhotoError] = useState('');
const [bannerImgError, setBannerImgError] = useState('');

const handleFileChange = (e) => {
  const { name, files } = e.target;
  const file = files[0];

  if (file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];

    // Validate file size and type for cover photo
    if (name === 'coverPhoto') {
      if (file.size > maxSize) {
        setCoverPhotoError('Cover photo must be less than 5MB');
        e.target.value = ''; // Clear the input field
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPG, JPEG, and PNG images are accepted');
        
        setCoverPhotoError('Only JPG, JPEG and PNG images are accepted');
        e.target.value = ''; // Clear the input field
        return;
      }

      setAlbumData((prev) => ({
        ...prev,
        coverPhoto: file,
      }));
      setCoverPhotoError(''); // Clear error on successful file selection
    }

    // Validate file size and type for banner image
    if (name === 'bannerImg') {
      if (file.size > maxSize) {
        setBannerImgError('Banner image must be less than 5MB');
        e.target.value = ''; // Clear the input field
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPG, JPEG, and PNG images are accepted');
        
        setBannerImgError('Only JPG, JPEG and PNG images are accepted');
        e.target.value = ''; // Clear the input field
        return;
      }

      setAlbumData((prev) => ({
        ...prev,
        bannerImg: file,
      }));
      setBannerImgError(''); // Clear error on successful file selection
    }
  }
};

const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
  
    try {
      // Validation
      if (!albumData.name?.trim()) {
        throw new Error('Album name is required');
      }
      if (!albumData.coverPhoto) {
        throw new Error('Cover photo is required');
      }
      if (!albumData.releaseDate) {
        throw new Error('Release date is required');
      }
      if (!selectedTracks.length) {
        throw new Error('Please select at least one track');
      }
  
      const formattedTracks = selectedTracks.map((track, index) => ({
        track: track.id,
        track_number: index + 1,
      }));
  
      // Debug log before sending
      console.log('Submitting album data:', {
        ...albumData,
        tracks: formattedTracks
      });
  
      const response = await albumService.createAlbum({
        ...albumData,
        tracks: formattedTracks,
      });
  
      setSuccessMessage('Album created successfully!');
      toast.success('Album created successfully!', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'dark',
      });
    
      dispatch(closeModal());
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to create album');
    } finally {
      setIsLoading(false);
    }
  };

const isFormValid =
  albumData.name.trim() &&
  albumData.coverPhoto &&
  albumData.releaseDate &&
  albumData.description &&
  selectedTracks.length &&
  !albumNameError;

return (
  <div className="max-w-4xl mx-auto p-0">
    <div className="bg-gray-900 rounded-lg border border-black">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-white">Create New Album</h2>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-2 text-white">
                    Album Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                <input
                    type="text"
                    name="name"
                    value={albumData.name}
                    onChange={handleInputChange}
                    className={`w-full p-2 pl-3 pr-12 border rounded-md bg-gray-700 text-white ${
                    isChecking ? 'border-red-500' : ''
                    }`}
                    required
                />
                {isChecking && (
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 text-sm">
                    Checking...
                    </span>
                )}
                </div>
                {albumNameError && (
                <p className="text-xs text-red-400 mt-2">{albumNameError}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">Enter the name of your album.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={albumData.description}
                onChange={handleInputChange}
                className="w-full p-2 rounded-md border border-gray-600 bg-gray-700 text-white h-32"
                required
              />
              <p className="text-xs text-gray-400 mt-2">Provide a short description for your album.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Cover Photo <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <input
                    type="file"
                    name="coverPhoto"
                    onChange={handleFileChange}
                    accept=".jpg, .jpeg, .png"
                    required
                    className="w-full text-gray-400"
                  />
                </div>
                {coverPhotoError ? (
                <p className="text-red-500 text-sm mt-2">{coverPhotoError}</p>
                ) : (
                    <p className="text-gray-400 text-sm mt-2">Accepted formats: JPG, PNG, JPEG (max 5MB)</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Banner Image
                </label>
                <div className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <input
                    type="file"
                    name="bannerImg"
                    onChange={handleFileChange}
                    accept=".jpg, .jpeg, .png"
                    className="w-full text-gray-400"
                  />
                </div>
                {bannerImgError ? (
                <p className="text-red-500 text-sm mt-2">{bannerImgError}</p>
                ) : (
                    <p className="text-gray-400 text-sm mt-2">Accepted formats: JPG, PNG, JPEG (max 5MB)</p>
                )}
            </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Release Date <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <input
                  type="datetime-local"
                  name="releaseDate"
                  value={albumData.releaseDate}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 rounded-md border border-gray-600 bg-gray-700 text-white"
                  max={new Date().toISOString().slice(0, 16)} // Restrict to current date and time
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">Select the release date and time for your album.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Select Tracks <span className="text-red-500">*</span>
              </label>
              
              {/* Selected Tracks Display */}
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTracks.map((track) => (
                  <span
                    key={track.id}
                    className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {track.track_details.name}
                    <button
                      type="button"
                      onClick={() => handleTrackRemove(track.id)}
                      className="hover:text-red-200"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Track Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsTrackDropdownOpen(!isTrackDropdownOpen)}
                  className="w-full p-2 border rounded-md bg-gray-700 text-white text-left flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Music className="h-5 w-5 mr-2" />
                    <span>Select tracks...</span>
                  </div>
                  {isTrackDropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {isTrackDropdownOpen && (
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
                          placeholder="Search tracks..."
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

                    {/* Tracks List */}
                    <div className="max-h-48 overflow-y-auto">
                      {getFilteredTracks().map((track, index) => (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => handleTrackSelection(track)}
                          onMouseEnter={() => setFocusedTrackIndex(index)}
                          className={`w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center justify-between ${
                            focusedTrackIndex === index ? 'bg-gray-700' : ''
                          }`}
                        >
                          <div className="flex items-center">
                            <Music className="h-4 w-4 mr-2" />
                            {track.name}
                          </div>
                          <span className="text-xs text-gray-400">Click to add</span>
                        </button>
                      ))}
                      {getFilteredTracks().length === 0 && (
                        <div className="px-4 py-2 text-gray-400 text-center">
                          No tracks found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
          <div className="flex items-center space-x-2 mb-4">
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      className="sr-only peer"
      checked={albumData.is_public}
      onChange={(e) => setAlbumData(prev => ({ ...prev, is_public: e.target.checked }))}
    />
    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    <span className="ml-3 text-sm font-medium text-white">Make Album Public</span>
  </label>
</div>
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
};

export default AlbumCreator;