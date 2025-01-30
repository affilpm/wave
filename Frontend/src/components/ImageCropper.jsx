import React from 'react';
import Cropper from 'react-easy-crop';
import { X } from 'lucide-react';

const ImageCropper = ({ image, onCropComplete, onCropSave }) => {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);

  const handleSaveCrop = (e) => {
    // Prevent any form submission
    e.preventDefault();
    e.stopPropagation();
    onCropSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl">
        <div className="relative h-96 mb-4">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, croppedAreaPixels) => onCropComplete(croppedAreaPixels)}
            objectFit="contain"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Zoom: {zoom.toFixed(1)}x
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveCrop}
            type="button" // Explicitly set type to button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;