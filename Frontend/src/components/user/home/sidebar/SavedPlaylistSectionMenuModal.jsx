import React, { useState, useRef, useEffect } from "react";
import { Delete, MoreVertical, Plus, CheckCircle } from "lucide-react";

const SavedPlaylistSectionMenuModal = ({ playlist, handleMenuAction }) => {
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
    handleMenuAction(action, playlist);
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMenuClick('delete');
              }}
              className="flex items-center w-full px-4 py-2 text-white text-sm hover:bg-gray-700"
            >
              <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
              Remove from library
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedPlaylistSectionMenuModal;