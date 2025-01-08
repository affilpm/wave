import React, { useState, useEffect } from 'react';
import { Music, Upload, Calendar, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { albumService } from '../../../services/albumService';
import api from '../../../api';
import { useDispatch } from 'react-redux';
import { openModal, closeModal } from '../../../slices/modalSlice'; // Import actions
import { debounce } from 'lodash';

const AlbumCreator = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [albumData, setAlbumData] = useState({
    name: '',
    description: '',
    coverPhoto: null,
    bannerImg: null,
    releaseDate: '',
    status: 'draft',
  });
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tracksList, setTracksList] = useState([]);
  const [successMessage, setSuccessMessage] = useState([]);
  const [albumNameError, setAlbumNameError] = useState(''); // New state for album name error

  useEffect(() => {
    fetchUserTracks();
  }, []);

  const fetchUserTracks = async () => {
    try {
      const response = await api.get('/api/music/music/');
      setTracksList(response.data);
    } catch (err) {
      setError('Failed to load tracks: ' + (err.response?.data?.error || err.message));
    }
  };






    // Create debounced check function
    const debouncedCheckAlbum = debounce(async (value) => {
        if (!value.trim()) {
          setAlbumNameError('');
          return;
        }
        
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
        }
      }, 500); // Wait 500ms after user stops typing
    


      const handleInputChange = async (e) => {
        const { name, value } = e.target;
        setAlbumData((prev) => ({
          ...prev,
          [name]: value,
        }));
        setError('');
      
        if (name === 'name') {
          debouncedCheckAlbum(value);
        }
      };
    


      // Clean up debounce on component unmount
      useEffect(() => {
        return () => {
          debouncedCheckAlbum.cancel();
        };
      }, []);




  

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files[0]) {
      const file = files[0];
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']; // Allowed file types

      // Check file size
      if (file.size > maxSize) {
        setError(`${name} must be less than 5MB`);
        e.target.value = ''; // Clear the input field
        return; // Prevent storing the file
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        setError(`${name} must be a PNG, JPEG, or JPG file`);
        e.target.value = ''; // Clear the input field
        return; // Prevent storing the file
      }

      // If the file is valid, update the state for the cover photo or banner image
      setAlbumData((prev) => ({
        ...prev,
        [name]: file,
      }));
      setError(''); // Clear any previous errors if the file is valid
    }
  };

  const handleTrackSelection = (track) => {
    setSelectedTracks((prev) => {
      const trackExists = prev.some((t) => t.id === track.id);
      if (trackExists) {
        // Remove track if already selected
        return prev.filter((t) => t.id !== track.id);
      } else {
        // Add track with updated track number
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
    setError('');
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

      // Format tracks data for submission
      const formattedTracks = selectedTracks.map((track, index) => ({
        track: track.id,
        track_number: index + 1,
      }));

      const response = await albumService.createAlbum({
        ...albumData,
        tracks: formattedTracks,
      });

      setSuccessMessage('Album created successfully!');
      dispatch(closeModal());
    } catch (err) {
      setError(err.message || 'Failed to create album');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setAlbumData((prev) => ({ ...prev, status: 'draft' }));
    try {
      await handleSubmit(new Event('submit'));
      setSuccessMessage('Draft saved successfully!');
    } catch (err) {
      setError('Failed to save draft: ' + err.message);
    }
  };

  // Validation for enabling the submit button
  const isFormValid =
    albumData.name.trim() &&
    albumData.coverPhoto &&
    albumData.releaseDate &&
    albumData.description && 
    selectedTracks.length &&
    !albumNameError;

  return (
    <div className={`max-w-4xl mx-auto p-6 `}>
      <div className="bg-gray-900 rounded-lg border border-black">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Create New Album</h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error message display */}
            {/* {error && (
              <div className="flex items-center gap-2 p-4 text-red-400 bg-red-900/20 rounded-lg border border-red-900/50">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )} */}
            <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-2 text-white">
                    Album Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="name"
                    value={albumData.name}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-md border border-gray-600 bg-gray-700 text-white"
                    required
                />
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
                {/* {!albumData.description.trim() && (
                  <p className="text-xs text-red-400 mt-2">This field is required.</p>
                )} */}
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
                  {/* <p className="text-xs text-gray-400 mt-2">Only .png, .jpeg, .jpg files are allowed.</p>
                  {!albumData.coverPhoto && (
                    <p className="text-xs text-red-400 mt-2">Cover photo is required.</p>
                  )} */}
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
                  <p className="text-xs text-gray-400 mt-2">Only .png, .jpeg, .jpg files are allowed.</p>
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
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">Select the release date and time for your album.</p>
                {/* {!albumData.releaseDate && (
                  <p className="text-xs text-red-400 mt-2">Release date is required.</p>
                )} */}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Select Tracks <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-600 rounded-md p-4 space-y-4">
                  {tracksList.map((track) => (
                    <div key={track.id} className="flex items-center space-x-4 text-white">
                      <Music className="h-5 w-5" />
                      <span>{track.name}</span>
                      <button
                        type="button"
                        onClick={() => handleTrackSelection(track)}
                        className={`ml-auto px-3 py-1 rounded-md ${
                          selectedTracks.some((t) => t.id === track.id)
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {selectedTracks.some((t) => t.id === track.id) ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
                {/* {!selectedTracks.length && (
                  <p className="text-xs text-red-400 mt-2">Please select at least one track.</p>
                )} */}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
              {/* <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Save as Draft
              </button> */}
            </div>

            {/* Success Message
            {successMessage && (
              <div className="flex items-center gap-2 p-4 text-green-400 bg-green-900/20 rounded-lg border border-green-900/50">
                <AlertCircle className="h-5 w-5" />
                <span>{successMessage}</span>
              </div>
            )} */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AlbumCreator;