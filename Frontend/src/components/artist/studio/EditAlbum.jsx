import React, { useState, useEffect } from 'react';
import { AlertCircle, X, ImageIcon } from 'lucide-react';
import Cropper from 'react-easy-crop';
import api from '../../../api';

const MIN_IMAGE_SIZE = 500;
const TARGET_SIZE = 500;
const COVER_ASPECT = 1; // Square for cover
const BANNER_ASPECT = 16 / 9; // Widescreen for banner

const EditAlbum = ({ album: initialAlbum, onClose, onSave }) => {
  const [originalAlbum, setOriginalAlbum] = useState(null);
  const [album, setAlbum] = useState({
    name: '',
    description: '',
    cover_photo: null,
    banner_img: null,
    tracks: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [albumData, setAlbumData] = useState([]);
  const [coverPhotoError, setCoverPhotoError] = useState('');
  const [bannerImgError, setBannerImgError] = useState('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState(null);
  const [originalCoverImage, setOriginalCoverImage] = useState(null);
  const [originalBannerImage, setOriginalBannerImage] = useState(null);
  const [showCoverCropper, setShowCoverCropper] = useState(false);
  const [showBannerCropper, setShowBannerCropper] = useState(false);
  const [coverCrop, setCoverCrop] = useState({ x: 0, y: 0 });
  const [bannerCrop, setBannerCrop] = useState({ x: 0, y: 0 });
  const [coverZoom, setCoverZoom] = useState(1);
  const [bannerZoom, setBannerZoom] = useState(1);
  const [coverCroppedAreaPixels, setCoverCroppedAreaPixels] = useState(null);
  const [bannerCroppedAreaPixels, setBannerCroppedAreaPixels] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setOriginalAlbum(initialAlbum);
        setAlbum(initialAlbum);

        // Update image previews with full URLs
        if (initialAlbum.cover_photo) {
          // Handle both full URLs and relative paths
          const coverUrl = initialAlbum.cover_photo.startsWith('http') 
            ? initialAlbum.cover_photo 
            : `${import.meta.env.VITE_API_URL}${initialAlbum.cover_photo}`;
          setCoverPreview(coverUrl);
        }

        if (initialAlbum.banner_img) {
          const bannerUrl = initialAlbum.banner_img.startsWith('http')
            ? initialAlbum.banner_img
            : `${import.meta.env.VITE_API_URL}${initialAlbum.banner_img}`;
          setBannerPreview(bannerUrl);
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
  
    // Only check for track order changes
    const tracksOrderChanged = hasTrackOrderChanged(originalAlbum.tracks, album.tracks);
  
    if (tracksOrderChanged) {
      const tracksData = album.tracks.map((track, index) => ({
        track: track.track,
        track_number: index + 1
      }));
      changes.append('tracks', JSON.stringify(tracksData));
      hasChanges = true;
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

  // Modified to only check if track order has changed
  const hasTrackOrderChanged = (originalTracks, currentTracks) => {
    if (originalTracks.length !== currentTracks.length) {
      return true;
    }
    
    // Check if the track order has changed
    return originalTracks.some((track, index) => track.track !== currentTracks[index].track);
  };

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop, targetWidth, targetHeight) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to desired output size
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Draw cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error('Canvas is empty');
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.95
      );
    });
  };

  const handleImageChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        throw new Error('Please upload only JPG, JPEG or PNG images');
      }
      
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size should be less than 5MB');
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'cover') {
          setOriginalCoverImage(e.target.result);
          setShowCoverCropper(true);
          setCoverPhotoError('');
        } else {
          setOriginalBannerImage(e.target.result);
          setShowBannerCropper(true);
          setBannerImgError('');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      if (type === 'cover') {
        setCoverPhotoError(err.message);
      } else {
        setBannerImgError(err.message);
      }
      console.error(err.message);
    }
  };

  const handleCropComplete = (croppedArea, croppedAreaPixels, isCover) => {
    if (isCover) {
      setCoverCroppedAreaPixels(croppedAreaPixels);
    } else {
      setBannerCroppedAreaPixels(croppedAreaPixels);
    }
  };

  const handleCropSave = async (isCover) => {
    try {
      const croppedAreaPixels = isCover ? coverCroppedAreaPixels : bannerCroppedAreaPixels;
      const originalImage = isCover ? originalCoverImage : originalBannerImage;
      
      if (!croppedAreaPixels || !originalImage) {
        console.error('Missing required cropping data');
        return;
      }

      const image = await createImage(originalImage);
      const canvas = document.createElement('canvas');
      const targetWidth = isCover ? TARGET_SIZE : TARGET_SIZE * (16/9);
      const targetHeight = isCover ? TARGET_SIZE : TARGET_SIZE;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

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
        if (!blob) {
          console.error('Failed to generate blob');
          return;
        }

        const fileName = isCover ? 'album-cover.jpg' : 'album-banner.jpg';
        const croppedFile = new File([blob], fileName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        if (isCover) {
          setAlbum(prev => ({ ...prev, cover_photo: croppedFile }));
          setCoverPreviewUrl(URL.createObjectURL(blob));
          setShowCoverCropper(false);
        } else {
          setAlbum(prev => ({ ...prev, banner_img: croppedFile }));
          setBannerPreviewUrl(URL.createObjectURL(blob));
          setShowBannerCropper(false);
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error cropping image:', error);
      if (isCover) {
        setCoverPhotoError('Failed to crop image');
      } else {
        setBannerImgError('Failed to crop image');
      }
    }
  };

  const renderCropper = (isCover) => {
    const image = isCover ? originalCoverImage : originalBannerImage;
    const crop = isCover ? coverCrop : bannerCrop;
    const zoom = isCover ? coverZoom : bannerZoom;
    const setCrop = isCover ? setCoverCrop : setBannerCrop;
    const setZoom = isCover ? setCoverZoom : setBannerZoom;
    const aspect = isCover ? COVER_ASPECT : BANNER_ASPECT;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-lg w-full max-w-2xl p-6 mx-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Crop {isCover ? 'Cover Photo' : 'Banner Image'}
              </h3>
              <button 
                onClick={() => isCover ? setShowCoverCropper(false) : setShowBannerCropper(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative h-96">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(croppedArea, croppedAreaPixels) => 
                  handleCropComplete(croppedArea, croppedAreaPixels, isCover)
                }
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
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

            <div className="flex justify-end gap-2">
              <button
                onClick={() => isCover ? setShowCoverCropper(false) : setShowBannerCropper(false)}
                className="px-4 py-2 text-white hover:bg-gray-800 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCropSave(isCover)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // New function to move track up in the order
  const moveTrackUp = (index) => {
    if (index === 0) return; // Already at the top
    
    const newTracks = [...album.tracks];
    const temp = newTracks[index];
    newTracks[index] = newTracks[index - 1];
    newTracks[index - 1] = temp;
    
    // Update track numbers
    newTracks.forEach((track, idx) => {
      track.track_number = idx + 1;
    });
    
    setAlbum(prev => ({ ...prev, tracks: newTracks }));
  };

  // New function to move track down in the order
  const moveTrackDown = (index) => {
    if (index === album.tracks.length - 1) return; // Already at the bottom
    
    const newTracks = [...album.tracks];
    const temp = newTracks[index];
    newTracks[index] = newTracks[index + 1];
    newTracks[index + 1] = temp;
    
    // Update track numbers
    newTracks.forEach((track, idx) => {
      track.track_number = idx + 1;
    });
    
    setAlbum(prev => ({ ...prev, tracks: newTracks }));
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

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {showCoverCropper && renderCropper(true)}
      {showBannerCropper && renderCropper(false)}
      
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

        {/* Track Reordering Section */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-4">
            Reorder Tracks
          </label>
          
          {/* Existing Tracks List with Reordering Controls */}
          <div className="mb-8 space-y-4">
            {album.tracks.length > 0 ? (
              album.tracks.map((track, index) => (
                <div key={track.id} className="flex items-center gap-4 bg-gray-700 p-4 rounded-lg">
                  <div className="flex-none w-8 h-8 flex items-center justify-center bg-gray-600 rounded-lg text-gray-300">
                    {index + 1}
                  </div>
                  <span className="flex-1 text-white">{track.music_details.name}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveTrackUp(index)}
                      disabled={index === 0}
                      className={`p-2 rounded-lg transition-colors ${
                        index === 0 
                          ? 'text-gray-500 cursor-not-allowed' 
                          : 'text-blue-400 hover:bg-blue-500/20'
                      }`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTrackDown(index)}
                      disabled={index === album.tracks.length - 1}
                      className={`p-2 rounded-lg transition-colors ${
                        index === album.tracks.length - 1
                          ? 'text-gray-500 cursor-not-allowed' 
                          : 'text-blue-400 hover:bg-blue-500/20'
                      }`}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                No tracks in this album yet.
              </div>
            )}
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

export default EditAlbum;