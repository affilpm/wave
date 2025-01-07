import React, { useState, useEffect } from 'react';
import { Music, Upload, Calendar, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { albumService } from '../../../services/albumService';
import api from '../../../api';
import { useDispatch } from 'react-redux';
import { openModal, closeModal } from '../../../slices/modalSlice'; // Import actions

const AlbumCreator = () => {  
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const [albumData, setAlbumData] = useState({

          name: '',
          description: '',
          coverPhoto: null,
          bannerImg: null,
          releaseDate: '',
          status: 'draft'
        });
        const [selectedTracks, setSelectedTracks] = useState([]);
        const [error, setError] = useState('');
        const [isLoading, setIsLoading] = useState(false);
        const [tracksList, setTracksList] = useState([]);
        const [successMessage, setSuccessMessage] = useState([]);
      
        useEffect(() => {
          fetchUserTracks();
        }, []);
      
        // Updated to fetch only logged-in user's tracks
        const fetchUserTracks = async () => {
          try {
            const response = await api.get('/api/music/music/');
            setTracksList(response.data);
          } catch (err) {
            setError('Failed to load tracks: ' + (err.response?.data?.error || err.message));
          }
        };
      
        const handleInputChange = (e) => {
          const { name, value } = e.target;
          setAlbumData(prev => ({
            ...prev,
            [name]: value
          }));
          setError('');
        };
      
        const handleFileChange = (e) => {
          const { name, files } = e.target;
          if (files[0]) {
            const file = files[0];
            const maxSize = 5 * 1024 * 1024; // 5MB limit
            if (file.size > maxSize) {
              setError(`${name} must be less than 5MB`);
              e.target.value = '';
              return;
            }
            
            setAlbumData(prev => ({
              ...prev,
              [name]: file
            }));
            setError('');
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
                track_number: index + 1
              }));
        
              const response = await albumService.createAlbum({
                ...albumData,
                tracks: formattedTracks
              });
              
              setSuccessMessage('Album created successfully!');
            //   navigate('/studio')
            dispatch(closeModal())

              ;
              
            } catch (err) {
              setError(err.message || 'Failed to create album');
            } finally {
              setIsLoading(false);
            }
        };
        
          const handleSaveDraft = async () => {
            setAlbumData(prev => ({ ...prev, status: 'draft' }));
            try {
              await handleSubmit(new Event('submit'));
              setSuccessMessage('Draft saved successfully!');
            } catch (err) {
              setError('Failed to save draft: ' + err.message);
            }
          };
        

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-black rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Create New Album</h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-4 text-red-400 bg-red-900/20 rounded-lg border border-red-900/50">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Album Name*
                </label>
                <input
                  type="text"
                  name="name"
                  value={albumData.name}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded-md border border-gray-600 bg-gray-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Description
                </label>
                <textarea
                  name="description"
                  value={albumData.description}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded-md border border-gray-600 bg-gray-700 text-white h-32"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Cover Photo*
                  </label>
                  <div className="flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-gray-400" />
                    <input
                      type="file"
                      name="coverPhoto"
                      onChange={handleFileChange}
                      accept="image/*"
                      required
                      className="w-full text-gray-400"
                    />
                  </div>
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
                      accept="image/*"
                      className="w-full text-gray-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Release Date*
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
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Select Tracks*
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
                          selectedTracks.some(t => t.id === track.id)
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {selectedTracks.some(t => t.id === track.id) ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>


            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4">
              {/* <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save as Draft'}
              </button> */}
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Album'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AlbumCreator;