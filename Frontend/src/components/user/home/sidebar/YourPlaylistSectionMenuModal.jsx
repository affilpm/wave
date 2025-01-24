import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Globe, Lock, Trash2, MoreVertical } from 'lucide-react';

const YourPlaylistSectionMenuModal = ({ playlist, onEdit, onTogglePrivacy, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
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
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="More options"
      >
        <MoreVertical className="h-5 w-5 text-gray-400" />
      </button>

      {/* Menu Modal */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-48 bg-gray-800 rounded-md shadow-lg z-50">
          <div className="py-1">
            {/* Edit Option */}
            <button
              onClick={() => handleMenuClick(onEdit)}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            >
              <Pencil className="h-4 w-4 mr-3" />
              Edit details
            </button>

            {/* Toggle Privacy Option */}
            <button
              onClick={() => handleMenuClick(onTogglePrivacy)}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            >
              {playlist.is_public ? (
                <>
                  <Lock className="h-4 w-4 mr-3" />
                  Make private
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-3" />
                  Make public
                </>
              )}
            </button>

            {/* Delete Option */}
            <button
              onClick={() => handleMenuClick(onDelete)}
              className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
            >
              <Trash2 className="h-4 w-4 mr-3" />
              Delete playlist
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default YourPlaylistSectionMenuModal;