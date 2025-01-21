import React, { useState, useEffect } from 'react';
import { Music, Upload } from 'lucide-react';
import api from '../../../api';

const EditPlaylistModal = ({ isOpen, onClose, onEditPlaylist, playlist }) => {
  const [playlistName, setPlaylistName] = useState('');
  const [description, setDescription] = useState('');
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (playlist) {
      setPlaylistName(playlist.name || '');
      setDescription(playlist.description || '');
      setPreviewUrl(playlist.cover_photo || null);
    }
  }, [playlist]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Please upload only JPG or PNG images');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      
      setCoverPhoto(file);
      setError('');
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleEditPlaylist = async () => {
    if (!playlistName.trim()) {
      setError('Playlist name is required');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', playlistName.trim());
      formData.append('description', description.trim());
      
      if (coverPhoto) {
        formData.append('cover_photo', coverPhoto);
      }
      
      const response = await api.patch(`/api/playlist/playlists/${playlist.id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const updatedPlaylist = {
        ...playlist,
        name: response.data.name,
        description: response.data.description,
        cover_photo: response.data.cover_photo
      };
      
      onEditPlaylist(updatedPlaylist);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error editing playlist:', error);
      const errorMessage = error.response?.data?.details || 
                          error.response?.data?.error ||
                          'Failed to edit playlist. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setPlaylistName(playlist?.name || '');
    setDescription(playlist?.description || '');
    setCoverPhoto(null);
    setPreviewUrl(playlist?.cover_photo || null);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Edit Playlist</h2>
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
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            
            <textarea
              placeholder="Add an optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none h-20"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm mb-4">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-white hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleEditPlaylist}
            disabled={!playlistName.trim() || isLoading}
            className={`px-6 py-2 rounded-full bg-green-500 text-white font-medium transition-colors ${
              playlistName.trim() && !isLoading ? 'hover:bg-green-400' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPlaylistModal;