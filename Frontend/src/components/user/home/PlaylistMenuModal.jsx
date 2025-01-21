import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pencil, Globe, Lock, Trash2 } from 'lucide-react';

const PlaylistMenuModal = ({ playlist, onEdit, onTogglePrivacy, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (action) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-neutral-800"
        aria-label="More options"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      
      {isOpen && (
        <div
  className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-neutral-800/95 backdrop-blur-sm border border-neutral-700 z-50"
  style={{ transform: 'translateX(12px)' }}
>
          <div className="py-1">
            <div
              onClick={() => handleMenuClick(onEdit)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-neutral-700 cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
              <span>Edit details</span>
            </div>
            
            <div
              onClick={() => handleMenuClick(onTogglePrivacy)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-neutral-700 cursor-pointer"
            >
              {playlist.is_public ? (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Make private</span>
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  <span>Make public</span>
                </>
              )}
            </div>
            
            <div
              onClick={() => handleMenuClick(onDelete)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-neutral-700 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete playlist</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistMenuModal;