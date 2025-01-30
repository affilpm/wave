import React, { useState } from 'react';
import Cropper from 'react-easy-crop';
import { Upload } from 'lucide-react';

const ImageCropperModal = ({
  aspect = 1,
  targetSize = 500,
  minImageSize = 500,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/jpg'],
  onClose,
  onCropComplete,
  onError,
  initialImage = null,
}) => {
  const [image, setImage] = useState(initialImage);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const validateAndProcessImage = async (file) => {
    // Validate file type
    if (!acceptedFileTypes.includes(file.type)) {
      throw new Error(`Please upload only ${acceptedFileTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} images`);
    }
    
    // Validate file size
    if (file.size > maxFileSize) {
      throw new Error(`Image size should be less than ${maxFileSize / (1024 * 1024)}MB`);
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

    // Check if image meets minimum size requirements
    if (dimensions.width < minImageSize || dimensions.height < minImageSize) {
      const willResize = window.confirm(
        `Image is smaller than ${minImageSize}x${minImageSize} pixels. Would you like to automatically resize it? This may affect image quality.`
      );

      if (!willResize) {
        throw new Error(`Please select an image at least ${minImageSize}x${minImageSize} pixels`);
      }
    }

    // Convert to base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imageData = await validateAndProcessImage(file);
      setImage(imageData);
    } catch (err) {
      onError?.(err.message);
    }
  };

  const handleCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleSave = async () => {
    if (!croppedAreaPixels || !image) return;

    try {
      const canvas = document.createElement('canvas');
      const imageObj = new Image();
      imageObj.src = image;

      await new Promise((resolve) => {
        imageObj.onload = resolve;
      });

      canvas.width = targetSize;
      canvas.height = targetSize;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        imageObj,
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
          const croppedFile = new File([blob], 'cropped-image.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          onCropComplete({
            file: croppedFile,
            preview: URL.createObjectURL(blob)
          });
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error cropping image:', error);
      onError?.('Failed to crop image');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Crop Image</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {!image ? (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-lg">
          <Upload className="w-12 h-12 text-gray-400 mb-4" />
          <label className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
            Choose Image
            <input
              type="file"
              accept={acceptedFileTypes.join(',')}
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
          <p className="mt-2 text-sm text-gray-400">
            {acceptedFileTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} files up to {maxFileSize / (1024 * 1024)}MB
          </p>
        </div>
      ) : (
        <>
          <div className="relative h-64">
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
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
              onClick={() => setImage(null)}
              className="px-4 py-2 text-white hover:bg-gray-800 rounded-md"
            >
              Change Image
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-white hover:bg-gray-800 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ImageCropperModal;