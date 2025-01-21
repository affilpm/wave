import React, { useState } from 'react';
import { Music, Upload, Globe, Lock } from 'lucide-react';
import api from '../../../api';

const CreatePlaylistModal = ({ isOpen, onClose, onCreatePlaylist }) => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Please upload only JPG or PNG images');
        return;
      }
      // Validate file size (e.g., 5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      
      setCoverPhoto(file);
      setError(''); // Clear any previous errors
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      setError('Playlist name is required');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', newPlaylistName.trim());
      formData.append('description', description.trim());
      formData.append('is_public', isPublic);
      
      if (coverPhoto) {
        formData.append('cover_photo', coverPhoto);
      }
      
      const response = await api.post('/api/playlist/playlists/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Create a simplified playlist object for the sidebar
      const newPlaylist = {
        name: response.data.name,
        icon: null,
        image: response.data.cover_photo || "/api/placeholder/40/40",
        songCount: 0,
        type: 'Playlist'
      };
      
      onCreatePlaylist(newPlaylist);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating playlist:', error);
      const errorMessage = error.response?.data?.details || 
                          error.response?.data?.error ||
                          'Failed to create playlist. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewPlaylistName('');
    setDescription('');
    setIsPublic(true);
    setCoverPhoto(null);
    setPreviewUrl(null);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create New Playlist</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-start gap-4 mb-6">
          <div className="relative group">
            <div className="w-32 h-32 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="Cover preview" className="w-full h-full object-cover" />
              ) : (
                <Music className="w-16 h-16 text-gray-600" />
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="w-8 h-8 text-white" />
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          
          <div className="flex-1 space-y-4">
            <input
              type="text"
              placeholder="My Awesome Playlist"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            
            <textarea
              placeholder="Add an optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none h-20"
            />

            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-neutral-800 transition-all w-full"
            >
              {isPublic ? (
                <>
                  <Globe size={18} />
                  <span>Public playlist</span>
                </>
              ) : (
                <>
                  <Lock size={18} />
                  <span>Private playlist</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-white hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreatePlaylist}
            disabled={!newPlaylistName.trim()}
            className={`px-6 py-2 rounded-full bg-green-500 text-white font-medium transition-colors ${
              newPlaylistName.trim() ? 'hover:bg-green-400' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePlaylistModal;