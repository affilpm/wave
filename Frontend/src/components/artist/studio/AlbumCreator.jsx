import React, { useState, useEffect, useRef } from 'react';
import { Music, Upload, Calendar, AlertCircle, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import albumService from '../../../services/artist/albumService';
import api from '../../../api';
import { useDispatch } from 'react-redux';
import { openModal, closeModal } from '../../../slices/artist/modalSlice';
import { debounce } from 'lodash';
import { v4 as uuidv4 } from 'uuid';  

const MIN_IMAGE_SIZE = 500;
const TARGET_SIZE = 500;
const COVER_ASPECT = 1; // Square for cover
const BANNER_ASPECT = 16 / 9; // Widescreen for banner


const AlbumCreator = () => {
  const dispatch = useDispatch();

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
  const [successMessage, setSuccessMessage] = useState([]);
  const [albumNameError, setAlbumNameError] = useState('');

  const uniqueId = uuidv4();  // Generate a unique ID





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


  const [dateError, setDateError] = useState('');



  
  const handleInputChange = async (e) => {
    const { name, value } = e.target;
  
    if (name === 'name') {
      // Remove spaces from the album name
      const trimmedValue = value.replace(/\s/g, ''); // This removes any spaces
  
      // Validation logic for album name
      if (!trimmedValue) {
        setAlbumNameError('Album name cannot be empty or just whitespace');
      } else if (trimmedValue.length < 3) {
        setAlbumNameError('Album name must be at least 3 characters long');
      } else if (trimmedValue.length > 100) {
        setAlbumNameError('Album name cannot be longer than 100 characters');
      } else {
        setAlbumNameError('');
        debouncedCheckAlbum(trimmedValue);
      }
  
      // Update state for albumData with the modified name (without spaces)
      setAlbumData((prev) => ({
        ...prev,
        [name]: trimmedValue, // Use the value without spaces
      }));
    } else {
      // For other fields, no space removal or specific validation is required
      setAlbumData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  
    if (name === 'releaseDate') {
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          setDateError('Please enter a valid date and time');
        } else {
          setDateError('');
        }
      } catch (err) {
        setDateError('Invalid date format');
      }
    }
  };




//image cropping//
const [coverPhotoError, setCoverPhotoError] = useState('');
const [bannerImgError, setBannerImgError] = useState('');
const [showCoverCropper, setShowCoverCropper] = useState(false);
const [showBannerCropper, setShowBannerCropper] = useState(false);
const [originalCoverImage, setOriginalCoverImage] = useState(null);
const [originalBannerImage, setOriginalBannerImage] = useState(null);
const [coverCrop, setCoverCrop] = useState({ x: 0, y: 0 });
const [bannerCrop, setBannerCrop] = useState({ x: 0, y: 0 });
const [coverZoom, setCoverZoom] = useState(1);
const [bannerZoom, setBannerZoom] = useState(1);
const [coverCroppedAreaPixels, setCoverCroppedAreaPixels] = useState(null);
const [bannerCroppedAreaPixels, setBannerCroppedAreaPixels] = useState(null);
const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
const [bannerPreviewUrl, setBannerPreviewUrl] = useState(null);

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });
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
  
      const img = await createImage(URL.createObjectURL(file));
      
      // Check minimum dimensions based on type
      const minWidth = type === 'cover' ? MIN_IMAGE_SIZE : MIN_IMAGE_SIZE * (16/9);
      const minHeight = type === 'cover' ? MIN_IMAGE_SIZE : MIN_IMAGE_SIZE;
  
      if (img.width < minWidth || img.height < minHeight) {
        const willResize = window.confirm(
          `Image is smaller than ${minWidth}x${minHeight} pixels. Would you like to automatically resize it? This may affect image quality.`
        );
  
        if (!willResize) {
          throw new Error(`Please select an image at least ${minWidth}x${minHeight} pixels`);
        }
      }
  
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'cover') {
          setOriginalCoverImage(e.target.result);
          setShowCoverCropper(true);
          setCoverPhotoError('');
        } else if (type === 'banner') {
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
      toast.error(err.message);
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

    const targetWidth = isCover ? TARGET_SIZE : TARGET_SIZE * (16/9);
    const targetHeight = isCover ? TARGET_SIZE : TARGET_SIZE;

    const canvas = document.createElement('canvas');
    const image = new Image();
    image.src = originalImage;

    await new Promise((resolve) => {
      image.onload = resolve;
    });

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

      const fileName = isCover ? `album-cover-${Date.now()}-${uniqueId}.jpg` : `album-banner-${Date.now()}-${uniqueId}.jpg`;
      const croppedFile = new File([blob], fileName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Update albumData state with the cropped image file
      setAlbumData(prev => ({
        ...prev,
        [isCover ? 'coverPhoto' : 'bannerImg']: croppedFile
      }));

      // Update preview URLs
      if (isCover) {
        setCoverPreviewUrl(URL.createObjectURL(blob));
        setShowCoverCropper(false);
      } else {
        setBannerPreviewUrl(URL.createObjectURL(blob));
        setShowBannerCropper(false);
      }
    }, 'image/jpeg', 0.95);
  } catch (error) {
    console.error('Error cropping image:', error);
    toast.error('Failed to crop image. Please try again.');
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




const handleSubmit = async (e) => {
  e.preventDefault();

  if (isLoading) return;

  setError('');
  setSuccessMessage('');
  setIsLoading(true);

  try {
    // --- Frontend validation ---
    if (!albumData.name?.trim()) {
      throw new Error('Album name is required');
    }
    if (!albumData.coverPhoto) {
      throw new Error('Cover photo is required');
    }
    if (!albumData.releaseDate) {
      throw new Error('Release date is required');
    }
    if (dateError) {
      throw new Error(dateError);
    }
    if (albumNameError) {
      throw new Error('Please fix the album name error before submitting');
    }

    // --- Prepare submission data ---
    const submissionData = {
      name: albumData.name.trim(),
      description: albumData.description.trim(),
      releaseDate: albumData.releaseDate,
      is_public: albumData.is_public,
      coverPhoto: albumData.coverPhoto,
      bannerImg: albumData.bannerImg,
    };

    console.log('Submitting data:', {
      ...submissionData,
      releaseDate: new Date(submissionData.releaseDate).toISOString(),
    });

    const response = await albumService.createAlbum(submissionData);

    toast.success('Album created successfully!', { theme: 'dark' });
    dispatch(closeModal());
  } catch (err) {
    console.error('Album creation error:', err);

    let errorMessage = 'Failed to create album';

    // Handle API errors 
    if (err.response) {
      // Server responded with error
      if (err.response.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (typeof err.response.data === 'object') {
        // Extract field-specific errors (Django REST often returns this way)
        errorMessage = Object.values(err.response.data)
          .flat()
          .join(', ');
      } else {
        errorMessage = err.response.data;
      }
    } else if (err.request) {
      // Request made but no response
      errorMessage = 'No response from server. Please check your network.';
    } else if (err.message) {
      // Custom error (frontend validation)
      errorMessage = err.message;
    }

    setError(errorMessage);
    toast.error(errorMessage, { theme: 'dark' });
  } finally {
    setIsLoading(false);
  }
};

const isFormValid = React.useMemo(() => {
  return Boolean(
    albumData.name.trim() &&
    albumData.coverPhoto &&
    albumData.releaseDate &&
    albumData.description.trim() &&
    !albumNameError &&
    !isLoading
  );
}, [albumData, albumNameError, isLoading]);


return (
  <div className="max-w-4xl mx-auto p-0">
     {showCoverCropper && renderCropper(true)}
     {showBannerCropper && renderCropper(false)}
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
                <div className="relative group">
                  <div className="w-32 h-32 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {coverPreviewUrl ? (
                      <img src={coverPreviewUrl} alt="Cover preview" className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-16 h-16 text-gray-600" />
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Upload className="w-8 h-8 text-white" />
                      <input
                        type="file"
                        name="coverPhoto"
                        onChange={(e) => handleImageChange(e, 'cover')}
                        accept="image/jpeg,image/png"
                        className="hidden"
                      />
                    </label>
                  </div>
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
                <div className="relative group">
                  <div className="w-32 h-32 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {bannerPreviewUrl ? (
                      <img src={bannerPreviewUrl} alt="Banner preview" className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-16 h-16 text-gray-600" />
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Upload className="w-8 h-8 text-white" />
                      <input
  type="file"
  name="bannerImg"
  onChange={(e) => handleImageChange(e, 'banner')}
  accept="image/jpeg,image/png"
  className="hidden"
/>
                    </label>
                  </div>
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