import React, { useState, useEffect } from 'react';
import { AlertCircle, X, ImageIcon, Music, Plus, Trash2 } from 'lucide-react';
import api from '../../../api';

const EditAlbum = ({ album: initialAlbum, onClose, onSave }) => {
  const [originalAlbum, setOriginalAlbum] = useState(null);
  const [album, setAlbum] = useState({
    name: '',
    description: '',
    cover_photo: null,
    banner_img: null,
    tracks: []
  });
  const [availableTracks, setAvailableTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tracksResponse] = await Promise.all([
          api.get('/api/music/music/')
        ]);

        setOriginalAlbum(initialAlbum);
        setAlbum(initialAlbum);
        setAvailableTracks(tracksResponse.data);

        if (initialAlbum.cover_photo) {
          setCoverPreview(initialAlbum.cover_photo);
        }

        if (initialAlbum.banner_img) {
          setBannerPreview(initialAlbum.banner_img);
        }
      } catch (err) {
        setError('Failed to fetch album details: ' + (err.response?.data?.error || err.message));
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialAlbum]);

  const getChangedData = () => {
    if (!originalAlbum) return { changes: new FormData(), hasChanges: false };
  
    const changes = new FormData();
    let hasChanges = false;
  
    const tracksChanged = hasTracksChanged(originalAlbum.tracks, album.tracks);
  
    if (tracksChanged) {
      const tracksData = album.tracks.map((track, index) => ({
        track: track.track,
        track_number: index + 1
      }));
      changes.append('tracks', JSON.stringify(tracksData));
      hasChanges = true;
    } else {
      const tracksData = originalAlbum.tracks.map((track, index) => ({
        track: track.track,
        track_number: index + 1
      }));
      changes.append('tracks', JSON.stringify(tracksData));
    }
  
    if (album.name !== originalAlbum.name) {
      changes.append('name', album.name);
      hasChanges = true;
    }
  
    if (album.description !== originalAlbum.description) {
      changes.append('description', album.description);
      hasChanges = true;
    }
  
    if (album.cover_photo instanceof File) {
      changes.append('cover_photo', album.cover_photo);
      hasChanges = true;
    }
  
    if (album.banner_img instanceof File) {
      changes.append('banner_img', album.banner_img);
      hasChanges = true;
    }
  
    return { changes, hasChanges };
  };

  const hasTracksChanged = (originalTracks, currentTracks) => {
    if (originalTracks.length !== currentTracks.length) {
      return true;
    }
    
    const originalTrackIds = originalTracks.map(track => track.track).sort();
    const currentTrackIds = currentTracks.map(track => track.track).sort();
    
    return originalTrackIds.some((trackId, index) => trackId !== currentTrackIds[index]);
  };

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'cover') {
        setCoverPreview(reader.result);
        setAlbum(prev => ({ ...prev, cover_photo: file }));
      } else {
        setBannerPreview(reader.result);
        setAlbum(prev => ({ ...prev, banner_img: file }));
      }
    };
    reader.readAsDataURL(file);
  };

  const addTrack = () => {
    if (!selectedTrack) return;
    
    const trackToAdd = availableTracks.find(t => t.id.toString() === selectedTrack);
    if (!trackToAdd) return;
  
    setAlbum(prev => ({
      ...prev,
      tracks: [
        ...prev.tracks,
        {
          id: Date.now(),
          track: trackToAdd.id,
          track_number: prev.tracks.length + 1,
          name: trackToAdd.name
        }
      ]
    }));
    
    setSelectedTrack('');
  };

  const removeTrack = (trackToRemove) => {
    setAlbum(prev => ({
      ...prev,
      tracks: prev.tracks
        .filter(track => track.id !== trackToRemove.id)
        .map((track, index) => ({
          ...track,
          track_number: index + 1
        }))
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const { changes, hasChanges } = getChangedData();
      
      if (!hasChanges) {
        onClose();
        return;
      }

      const response = await api.patch(`/api/album/albums/${album.id}/`, changes, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data) {
        onSave(response.data);
        onClose();
      }
    } catch (err) {
      setError('Failed to update album: ' + (err.response?.data?.error || err.message));
      console.error('Error updating album:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    );
  }


  const validateAlbumName = async (name, albumId = null) => {
    try {
      const params = new URLSearchParams({ name });
      if (albumId) {
        params.append('id', albumId);
      }
  
      const response = await fetch(`/api/album/validate_album_name/?${params.toString()}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error validating album name:", error);
      return { exists: false, message: "Error occurred during validation" };
    }
  };

  

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Album Name
          </label>
          <input
            type="text"
            value={album.name}
            onChange={(e) => setAlbum(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={album.description}
            onChange={(e) => setAlbum(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600 h-32"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Cover Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cover Photo
            </label>
            <div className="relative">
              <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-lg">
                {coverPreview ? (
                  <div className="relative">
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="h-48 w-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCoverPreview(null);
                        setAlbum(prev => ({ ...prev, cover_photo: null }));
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4 flex text-sm text-gray-400">
                      <label className="relative cursor-pointer bg-gray-700 rounded-md font-medium text-blue-500 hover:text-blue-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span className="px-3 py-2">Upload cover</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleImageChange(e, 'cover')}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Banner Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Banner Image
            </label>
            <div className="relative">
              <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-lg">
                {bannerPreview ? (
                  <div className="relative">
                    <img
                      src={bannerPreview}
                      alt="Banner preview"
                      className="h-48 w-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBannerPreview(null);
                        setAlbum(prev => ({ ...prev, banner_img: null }));
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4 flex text-sm text-gray-400">
                      <label className="relative cursor-pointer bg-gray-700 rounded-md font-medium text-blue-500 hover:text-blue-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span className="px-3 py-2">Upload banner</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleImageChange(e, 'banner')}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tracks Section */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-4">
            Current Tracks
          </label>
          
          {/* Existing Tracks List */}
          <div className="mb-8 space-y-4">
            {album.tracks.length > 0 ? (
              album.tracks.map((track, index) => (
                <div key={track.id} className="flex items-center gap-4 bg-gray-700 p-4 rounded-lg">
                  <div className="flex-none w-8 h-8 flex items-center justify-center bg-gray-600 rounded-lg text-gray-300">
                    {index + 1}
                  </div>
                  <Music className="h-5 w-5 text-gray-400" />
                  <span className="flex-1 text-white">{track.name}</span>
                  <button
                    type="button"
                    onClick={() => removeTrack(track)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Remove</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                No tracks in this album yet.
              </div>
            )}
          </div>

          {/* Add New Tracks Section */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-4">
              Add New Tracks
            </label>
            <div className="flex gap-4">
              <select
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Select a track to add</option>
                {availableTracks
                  .filter(track => !album.tracks.some(t => t.track === track.id))
                  .map(track => (
                    <option key={track.id} value={track.id}>
                      {track.name}
                    </option>
                  ))
                }
              </select>
              <button
                type="button"
                onClick={addTrack}
                disabled={!selectedTrack}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                <span>Add Track</span>
              </button>
              </div>
            
            <div className="mt-4 text-sm text-gray-400">
              Select tracks from the dropdown above to add them to the album.
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-700">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};


export default EditAlbum