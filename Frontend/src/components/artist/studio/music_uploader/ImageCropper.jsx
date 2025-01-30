import React from 'react';
import Cropper from 'react-easy-crop';
import { X } from 'lucide-react';


const MIN_IMAGE_SIZE = 500; // Minimum width/height requirement
const TARGET_SIZE = 500; // Target size for final image

const ImageCropper = ({ image, onCropComplete, onCropSave, onClose }) => {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [imageDimensions, setImageDimensions] = React.useState(null);

  React.useEffect(() => {
    // Check image dimensions when loaded
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      // Calculate initial zoom to ensure image fills the crop area
      const scale = MIN_IMAGE_SIZE / Math.min(img.width, img.height);
      setZoom(Math.max(scale, 1));
    };
    img.src = image;
  }, [image]);

  const handleSaveCrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onCropSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Crop Image</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {imageDimensions && (imageDimensions.width < MIN_IMAGE_SIZE || imageDimensions.height < MIN_IMAGE_SIZE) ? (
          <div className="text-red-400 p-4 text-center">
            Image is too small. Minimum dimensions required: {MIN_IMAGE_SIZE}x{MIN_IMAGE_SIZE} pixels.
            Current dimensions: {imageDimensions.width}x{imageDimensions.height} pixels.
          </div>
        ) : (
          <>
            <div className="relative h-96 mb-4">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedAreaPixels) => {
                  onCropComplete({
                    ...croppedAreaPixels,
                    targetWidth: TARGET_SIZE,
                    targetHeight: TARGET_SIZE
                  });
                }}
                objectFit="contain"
                minZoom={Math.max(MIN_IMAGE_SIZE / Math.min(imageDimensions?.width || MIN_IMAGE_SIZE, imageDimensions?.height || MIN_IMAGE_SIZE), 1)}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Zoom: {zoom.toFixed(1)}x
              </label>
              <input
                type="range"
                min={Math.max(MIN_IMAGE_SIZE / Math.min(imageDimensions?.width || MIN_IMAGE_SIZE, imageDimensions?.height || MIN_IMAGE_SIZE), 1)}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={onClose}
                type="button"
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCrop}
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Crop
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageCropper;