import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Camera, PlayCircle, X, Play, Pause } from 'lucide-react';
import Cropper from 'react-easy-crop';
import api from '../../../../api';
import { updateUserProfile } from '../../../../slices/user/userSlice';
import { handlePlaybackAction } from '../playlist/music-player-utils';
import { useNavigate } from 'react-router-dom';
import { handleSongPlayback } from './music-player-utils';

const MIN_IMAGE_SIZE = 300;
const TARGET_SIZE = 300;

// ProfileEditModal Component with Cropping Feature
const ProfileEditModal = ({ isOpen, onClose, onSave, initialUsername, initialPhoto }) => {
  const [username, setUsername] = useState(initialUsername);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initialPhoto);
  const [error, setError] = useState('');
  
  // Cropper states
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    setUsername(initialUsername);
    setPreviewUrl(initialPhoto);
  }, [initialUsername, initialPhoto]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Validate file type
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
          throw new Error('Please upload only JPG, JPEG or PNG images');
        }
        
        // Validate file size
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Image size should be less than 5MB');
        }

        // Get image dimensions
        const dimensions = await new Promise((resolve) => {
          const img = new Image();
          const objectUrl = URL.createObjectURL(file);
          
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: img.width, height: img.height });
          };
          
          img.src = objectUrl;
        });

        // Check if image needs resizing
        if (dimensions.width < MIN_IMAGE_SIZE || dimensions.height < MIN_IMAGE_SIZE) {
          const willResize = window.confirm(
            `Image is smaller than ${MIN_IMAGE_SIZE}x${MIN_IMAGE_SIZE} pixels. Would you like to automatically resize it? This may affect image quality.`
          );

          if (willResize) {
            const reader = new FileReader();
            reader.onload = (e) => {
              setOriginalImage(e.target.result);
              setShowCropper(true);
            };
            reader.readAsDataURL(file);
          } else {
            throw new Error(`Please select an image at least ${MIN_IMAGE_SIZE}x${MIN_IMAGE_SIZE} pixels`);
          }
        } else {
          // Handle normal sized images
          const reader = new FileReader();
          reader.onload = (e) => {
            setOriginalImage(e.target.result);
            setShowCropper(true);
          };
          reader.readAsDataURL(file);
        }

        setError('');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
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
          const croppedFile = new File([blob], 'profile-photo.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          setImageFile(croppedFile);
          setPreviewUrl(URL.createObjectURL(blob));
          setShowCropper(false);
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error cropping image:', error);
      setError('Failed to crop image. Please try again.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (error) return;
    onSave(username, imageFile);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Edit Profile</h2>

        {showCropper && originalImage ? (
          <div className="space-y-4">
            <div className="relative h-64">
              <Cropper
                image={originalImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                cropShape="round"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Zoom: {zoom.toFixed(1)}x
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {error && (
              <div className="bg-red-900/50 text-red-200 px-3 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCropper(false)}
                className="px-4 py-2 bg-neutral-800 text-white rounded-md hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCropSave}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Apply
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-200">
                Profile Photo
              </label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-neutral-800">
                  <img
                    src={previewUrl || '/api/placeholder/96/96'}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 cursor-pointer group hover:bg-opacity-60">
                    <Camera className="w-8 h-8 text-white opacity-90" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label 
                htmlFor="username" 
                className="block text-sm font-medium text-neutral-200"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {error && (
              <div className="bg-red-900/50 text-red-200 px-3 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-neutral-800 text-white rounded-md hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Main Profile Component remains the same
const Profile = () => {
  const [username, setUsername] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [publicSongs, setPublicSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArtist, setIsArtist] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { musicId, isPlaying, queue, currentPlaylistId } = useSelector((state) => state.musicPlayer);

  const isTrackPlaying = (track) => {
    return musicId === track.id && isPlaying;
  };

  const handleSongPlay = (e, song) => {
    e.stopPropagation();
    handleSongPlayback({
      song,
      sectionId: 'artist-public-songs',
      dispatch,
      currentState: { musicId, isPlaying }
    });
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const artistStatusResponse = await api.get('/api/artists/check-artist-status/');
      setIsArtist(artistStatusResponse.data.is_artist);

      const response = await api.get('/api/users/user');
      setUsername(response.data.username);
      setProfilePhoto(response.data.profile_photo);

      const playlistsResponse = await api.get('/api/playlist/public_playlist_data/');
      setPlaylists(playlistsResponse.data);

      if (artistStatusResponse.data.is_artist) {
        const songsResponse = await api.get('/api/music/public-songs/');
        setPublicSongs(songsResponse.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setLoading(false);
    }
  };

  const handlePlayClick = async (e, playlist) => {
    e.stopPropagation(); // Prevent navigation when clicking play button
    
    try {
      await handlePlaybackAction({
        playlistId: playlist.id,
        dispatch,
        currentState: {
          musicId,
          isPlaying,
          queue,
          currentPlaylistId
        }
      });
    } catch (error) {
      console.error('Error handling playback:', error);
    }
  };

  const handlePlaylistNavigate = (playlistId) => {
    navigate(`/playlist/${playlistId}`);
  };

  const handleSaveProfile = async (newUsername, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('username', newUsername);

      if (imageFile) {
        formData.append('profile_photo', imageFile);
      }

      const response = await api.patch('/api/users/update/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUsername(response.data.username);
      if (response.data.profile_photo) {
        setProfilePhoto(response.data.profile_photo);
      }
      dispatch(updateUserProfile(response.data));
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header - Made smaller */}
        <div className="flex items-center gap-4 mb-8">
          <div 
            className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-neutral-800 overflow-hidden shadow-xl relative group cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            <img
              src={profilePhoto || '/api/placeholder/144/144'}
              alt="Profile"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
              <Camera className="w-8 h-8 text-white opacity-90" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {isArtist && (
              <span className="text-xs text-green-400">Verified Artist</span>
            )}
            <h1 
              className="text-3xl md:text-4xl font-bold hover:text-green-400 transition-colors cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            >
              {username}
            </h1>
            <div className="mt-2 flex gap-3 text-xs text-neutral-400">
              <span>{playlists.filter(p => p.is_public).length} Public Playlists</span>
              {isArtist && <span>{publicSongs.length} Public Songs</span>}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Artist Songs Section - Slimmer design */}
          {isArtist && publicSongs.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Public Songs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {publicSongs.map((song) => (
                <div
                  key={song.id}
                  className="group relative flex items-center gap-3 bg-neutral-800/50 p-3 rounded-lg hover:bg-neutral-700/50 transition-all duration-300"
                >
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <img
                      src={song.cover_photo || '/api/placeholder/48/48'}
                      alt={song.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                    <button
                      onClick={(e) => handleSongPlay(e, song)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      {isTrackPlaying(song) ? (
                        <Pause className="w-6 h-6 text-white" />
                      ) : (
                        <Play className="w-6 h-6 text-white" />
                      )}
                    </button>
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="text-sm font-medium truncate">{song.name}</h3>
                    <p className="text-xs text-neutral-400">
                      {new Date(song.release_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

          {/* Playlists Section - Compact grid */}
          <section>
            <h2 className="text-xl font-bold mb-4">Public Playlists</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {playlists
                .filter((p) => p.is_public)
                .map((playlist) => (
                  <div
                    key={playlist.id}
                    className="group relative bg-neutral-800/50 rounded-lg overflow-hidden hover:bg-neutral-700/50 transition-all duration-300 cursor-pointer"
                    onClick={() => handlePlaylistNavigate(playlist.id)}
                  >
                    <div className="aspect-square relative">
                      <img
                        src={playlist.cover_photo || '/api/placeholder/120/120'}
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Play button overlay */}
                      <button
                        onClick={(e) => handlePlayClick(e, playlist)}
                        className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105 hover:bg-green-400 transition-all duration-200 shadow-xl"
                      >
                        {currentPlaylistId === playlist.id && isPlaying ? (
                          <Pause className="w-5 h-5 text-black" />
                        ) : (
                          <PlayCircle className="w-5 h-5 text-black" />
                        )}
                      </button>
                    </div>
                    <div className="p-2">
                      <h3 className="text-xs font-medium truncate">{playlist.name}</h3>
                      <p className="text-xs text-neutral-400">
                        {playlist.tracks?.length || 0} songs
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>

        <ProfileEditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProfile}
          initialUsername={username}
          initialPhoto={profilePhoto}
        />
      </div>
    </div>
  );
};

export default Profile;