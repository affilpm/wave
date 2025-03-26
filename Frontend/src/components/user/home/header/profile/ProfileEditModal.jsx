import React, { useState, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { v4 as uuidv4 } from 'uuid';  


const MIN_IMAGE_SIZE = 300;
const TARGET_SIZE = 300;

const ProfileEditModal = ({ isOpen, onClose, onSave, initialUsername, initialPhoto }) => {
  const [username, setUsername] = useState(initialUsername);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initialPhoto);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Cropper states
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    setUsername(initialUsername);
    setPreviewUrl(initialPhoto);
    setHasChanges(false); // Reset change tracking
  }, [initialUsername, initialPhoto]);

  const handleUsernameChange = (e) => {
    const trimmedValue = e.target.value.trimStart(); // Prevent leading spaces
    if (/^[a-zA-Z0-9_]*$/.test(trimmedValue)) {
      setUsername(trimmedValue);
      setHasChanges(trimmedValue !== initialUsername); // Track changes
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
          throw new Error('Please upload only JPG, JPEG, or PNG images.');
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Image size should be less than 5MB.');
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          setOriginalImage(e.target.result);
          setShowCropper(true);
          setHasChanges(true);
        };
        reader.readAsDataURL(file);

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
          const uniqueId = uuidv4();  // Generate a unique ID
          const croppedFile = new File([blob], `profile-photo-${Date.now()}-${uniqueId}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          setImageFile(croppedFile);
          setPreviewUrl(URL.createObjectURL(blob));
          setShowCropper(false);
          setHasChanges(true);
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error cropping image:', error);
      setError('Failed to crop image. Please try again.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (error || !hasChanges) return;
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
                onChange={handleUsernameChange}
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
                disabled={!hasChanges}
                className={`px-4 py-2 rounded-md transition-colors ${hasChanges ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-600 text-gray-300 cursor-not-allowed'}`}
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

export default ProfileEditModal;