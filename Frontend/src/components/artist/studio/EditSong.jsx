import React, { useState, useEffect, useRef } from 'react';
import { Album, Search, ChevronUp, ChevronDown, X, Music, Disc3 } from 'lucide-react';
import api from '../../../api';
import { toast } from 'react-toastify';

const EditSong = ({ track, onClose, onSave }) => {
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState(track.current_album_id || null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [sortOrder, setSortOrder] = useState('asc');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Determine if anything actually changed
  const originalAlbumId = track.current_album_id || null;
  const hasChanges = selectedAlbumId !== originalAlbumId;

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/v1/album/albums');
        const albumsData = response.data.results || (Array.isArray(response.data) ? response.data : []);
        setAlbums(albumsData);
      } catch (err) {
        console.error('Error fetching albums:', err);
        toast.error('Failed to load albums', { theme: 'dark' });
      } finally {
        setLoading(false);
      }
    };

    fetchAlbums();
  }, []);

  const getFilteredAlbums = () => {
    return albums
      .filter(album => album.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  };

  const handleAlbumSelect = (albumId) => {
    setSelectedAlbumId(albumId);
    setIsDropdownOpen(false);
  };

  const handleRemoveAlbum = () => {
    setSelectedAlbumId(null);
    setIsDropdownOpen(false);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleKeyDown = (e) => {
    if (!isDropdownOpen) return;

    const filteredAlbums = getFilteredAlbums();
    const total = filteredAlbums.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => prev < total - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < total) {
          handleAlbumSelect(filteredAlbums[focusedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (!isDropdownOpen) {
      setFocusedIndex(-1);
      setSearchQuery('');
    } else if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSelectedAlbumName = () => {
    if (!selectedAlbumId) return null;
    const album = albums.find(a => a.id === selectedAlbumId);
    return album ? album.name : track.album_name || null;
  };

  const handleSubmit = async () => {
    if (isSubmitting || !hasChanges) return;

    setIsSubmitting(true);
    try {
      const payload = { album_id: selectedAlbumId };
      const response = await api.post(
        `/api/v1/music/music/${track.id}/update_album/`,
        payload
      );

      toast.success(
        selectedAlbumId
          ? `Track moved to "${getSelectedAlbumName()}"`
          : 'Track set as a Single',
        { theme: 'dark', autoClose: 3000 }
      );

      // Forcefully inject the correct album details to ensure prompt UI updates
      const updatedData = {
        ...response.data,
        album_name: getSelectedAlbumName(),
        current_album_id: selectedAlbumId
      };

      onSave(updatedData);
    } catch (err) {
      console.error('Error updating album:', err);
      const errorMsg = err.response?.data?.error || 'Failed to update album assignment';
      toast.error(errorMsg, { theme: 'dark' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAlbumName = getSelectedAlbumName();

  return (
    <div className="p-6 space-y-6">
      {/* Track Info Header */}
      <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-gray-700/50">
          <Music className="h-6 w-6 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg truncate">{track.name}</h3>
          <p className="text-gray-400 text-sm">
            {track.album_name
              ? <>Currently in: <span className="text-blue-400">{track.album_name}</span></>
              : <span className="text-gray-500 italic">Single (no album)</span>
            }
          </p>
        </div>
      </div>

      {/* Album Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Album Assignment
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Choose an album for this track, or leave empty to keep it as a Single.
        </p>

        <div className="relative" ref={dropdownRef}>
          {/* Dropdown Trigger */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full p-3 border rounded-xl bg-gray-800 text-white text-left flex items-center justify-between transition-all duration-200 ${
              isDropdownOpen
                ? 'border-blue-500 ring-1 ring-blue-500/30'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-2">
              {selectedAlbumId ? (
                <Disc3 className="h-5 w-5 text-blue-400" />
              ) : (
                <Album className="h-5 w-5 text-gray-400" />
              )}
              <span className={selectedAlbumId ? 'text-white' : 'text-gray-400'}>
                {selectedAlbumName || 'No album (Single)'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {selectedAlbumId && (
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAlbum();
                  }}
                  className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                  title="Remove from album (set as Single)"
                >
                  <X className="h-4 w-4" />
                </span>
              )}
              {isDropdownOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </div>
          </button>

          {/* Dropdown List */}
          {isDropdownOpen && (
            <div className="absolute z-20 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
              {/* Search and Sort */}
              <div className="p-3 border-b border-gray-700/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search albums..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder-gray-500"
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={toggleSortOrder}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-white flex items-center gap-1 rounded hover:bg-gray-700/50 transition-colors"
                  >
                    Sort {sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
                  </button>
                  {selectedAlbumId && (
                    <button
                      type="button"
                      onClick={handleRemoveAlbum}
                      className="px-2 py-1 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 rounded hover:bg-amber-500/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Set as Single
                    </button>
                  )}
                </div>
              </div>

              {/* Albums List */}
              <div className="max-h-56 overflow-y-auto">
                {loading ? (
                  <div className="px-4 py-6 text-center text-gray-400 text-sm">
                    Loading albums...
                  </div>
                ) : getFilteredAlbums().length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500 text-sm">
                    {searchQuery ? 'No albums match your search' : 'No albums found'}
                  </div>
                ) : (
                  getFilteredAlbums().map((album, index) => (
                    <button
                      key={album.id}
                      type="button"
                      onClick={() => handleAlbumSelect(album.id)}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                        album.id === selectedAlbumId
                          ? 'bg-blue-500/10 text-blue-400'
                          : focusedIndex === index
                            ? 'bg-gray-700/50 text-white'
                            : 'text-gray-300 hover:bg-gray-700/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Disc3 className={`h-4 w-4 ${album.id === selectedAlbumId ? 'text-blue-400' : 'text-gray-500'}`} />
                        <div>
                          <div className="text-sm font-medium">{album.name}</div>
                          <div className="text-xs text-gray-500">
                            {album.tracks?.length || 0} track{(album.tracks?.length || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      {album.id === selectedAlbumId && (
                        <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Indicator */}
      {hasChanges && (
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          <span className="text-sm text-blue-300">
            {selectedAlbumId
              ? `Will move to "${selectedAlbumName}"`
              : 'Will be set as a Single (removed from album)'
            }
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-700/50">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasChanges || isSubmitting}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default EditSong;
