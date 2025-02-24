import React, { useState, useRef, useEffect } from 'react';
import { Camera, X } from 'lucide-react';

const ProfileEditModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialUsername, 
  initialPhoto 
}) => {
  const [username, setUsername] = useState(initialUsername);
  const [previewImage, setPreviewImage] = useState(initialPhoto);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-neutral-900 rounded-2xl w-full max-w-md text-white border border-neutral-800 shadow-2xl"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h2 className="text-xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors rounded-full p-2 hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center gap-4">
            <div 
              className="relative w-40 h-40 group cursor-pointer transition-all duration-300 hover:scale-105"
              onClick={handleImageClick}
            >
              <div className="w-full h-full rounded-full overflow-hidden ring-4 ring-neutral-700 ring-offset-2 ring-offset-neutral-900">
                <img
                  src={previewImage || "/api/placeholder/160/160"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-10 h-10 text-green-400" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg, image/png"
                onChange={handleImageChange}
              />
            </div>
            <button 
              className="text-sm text-green-500 hover:text-green-400 font-medium transition-colors"
              onClick={handleImageClick}
            >
              Choose photo
            </button>
          </div>

          {/* Username Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-300">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              placeholder="Your display name"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 p-6 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-neutral-700 rounded-lg text-white hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(username, imageFile)}
            className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 rounded-lg text-white font-medium hover:from-green-600 hover:to-green-700 transition-colors shadow-lg shadow-green-500/20"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;