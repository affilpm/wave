// PlaylistMenu.js
import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Library } from 'lucide-react';
import api from "../../../../api";

const PlaylistMenu = ({ playlist, onSuccess }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddToLibrary = async () => {
    // Debug log to verify playlist data
    console.log('Adding playlist to library:', playlist);

    if (!playlist?.id) {
      setError('Invalid playlist ID');
      console.error('Missing playlist ID:', playlist);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsMenuOpen(false);
      
      const response = await api.post('/api/library/library/add-playlist/', {
        playlist_id: playlist.id
      });
      
      console.log('API Response:', response.data);
      
      if (response.data.message) {
        setShowModal(true);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      console.error('Error adding playlist:', err.response || err);
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        'Failed to add playlist to library'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Rest of the component remains the same...
  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
        className="absolute top-2 right-2 p-2 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <MoreVertical className="w-5 h-5 text-white" />
      </button>

      {isMenuOpen && (
        <div 
          className="absolute top-12 right-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleAddToLibrary}
            disabled={isLoading}
            className={`w-full px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Library className="w-4 h-4" />
            {isLoading ? 'Adding...' : 'Add to Library'}
          </button>
        </div>
      )}

      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Added to Library</h3>
            <p className="text-gray-300 mb-4">"{playlist.name}" has been added to your library.</p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-green-500 text-white rounded-md py-2 hover:bg-green-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {error && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Error</h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => setError(null)}
              className="w-full bg-red-500 text-white rounded-md py-2 hover:bg-red-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistMenu;