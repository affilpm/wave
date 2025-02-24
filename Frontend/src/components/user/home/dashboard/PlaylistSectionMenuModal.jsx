import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Library, Trash2, CheckCircle, Plus } from 'lucide-react';
import api from "../../../../api";
import toast from 'react-hot-toast';



const PlaylistSectionMenuModal = ({ playlist, onSuccess }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInLibrary, setIsInLibrary] = useState(false);
  const menuRef = useRef(null);
  const [toastMessage, setToastMessage] = useState(null);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true; // To prevent state updates if component is unmounted

    const checkIfInLibrary = async () => {
        if (!playlist?.id) return; // Guard clause to prevent unnecessary API call

        try {
            const response = await api.get(`/api/library/library/check-playlist/${playlist.id}/`);
            if (isMounted) {
                setIsInLibrary(response.data?.is_in_library || false);
            }
        } catch (err) {
            console.error('Failed to check if playlist is in library:', err);
        }
    };

    checkIfInLibrary();

    return () => {
        isMounted = false; // Cleanup function to avoid setting state on unmounted component
    };
}, [playlist?.id]);


const showToast = (message) => {
  setToastMessage(message);
  setTimeout(() => setToastMessage(null), 3000); // Toast disappears after 3 seconds
};


  const handleAddToLibrary = async () => {
    if (!playlist?.id) {
      setError('Invalid playlist ID');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsMenuOpen(false);
      
      const response = await api.post('/api/library/library/add-playlist/', {
        playlist_id: playlist.id
      });
      
      if (response.data.message) {
        // setShowModal(true);
        setIsInLibrary(true);
        if (onSuccess) onSuccess();
        showToast(`"${playlist.name}" added to your library`)
      }
    } catch (err) {
      console.error('Error adding playlist:', err);
      setError('Failed to add playlist to library');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromLibrary = async () => {
    if (!playlist?.id) {
      setError('Invalid playlist ID');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsMenuOpen(false);

      await api.post('/api/library/remove_playlist/', {
        playlist_id: playlist.id 
      });

      // setShowModal(true);
      setIsInLibrary(false);
      if (onSuccess) onSuccess();
      showToast(`"${playlist.name}" removed from your library`)
    } catch (err) {
      console.error('Error removing playlist:', err);
      setError('Failed to remove playlist from library');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
        className="absolute top-4 right-2 p-2 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <MoreVertical className="w-5 h-5 text-white" />
      </button>

      {isMenuOpen && (
        <div 
          className="absolute top-14 right-1 w-40 bg-gray-800 rounded-md shadow-lg py-0 z-[1000]"
          onClick={(e) => e.stopPropagation()}
        >
          {isInLibrary ? (
            <button
              onClick={handleRemoveFromLibrary}
              disabled={isLoading}
              className={`w-full px-3 py-2 text-sm text-white hover:bg-gray-700 rounded-md flex items-center  ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
            <CheckCircle className="h-5 w-5 text-green-500" />
              {isLoading ? 'Removing...' : 'Remove from Library'}
            </button>
          ) : (
            <button
              onClick={handleAddToLibrary}
              disabled={isLoading}
              className={`w-full px-3 py-2 text-sm text-white hover:bg-gray-700 rounded-md flex items-center gap-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
  <div className="flex items-center justify-center w-6 h-6 bg-gray-600 rounded-full">
    <Plus className="h-5 w-5 text-gray-100 " />
  </div>
              {isLoading ? 'Adding...' : 'Add to Library'}
            </button>
          )}
        </div>
      )}

      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              {isInLibrary ?  'Added to Library' : 'Removed from Library' }
            </h3>
            <p className="text-gray-300 mb-4">
              "{playlist.name}" has been {isInLibrary ?  'added to' : 'removed from' } your library.
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-green-500 text-white rounded-md py-2 hover:bg-green-600 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white py-2 px-4 rounded-md shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default PlaylistSectionMenuModal;