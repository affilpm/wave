import React, { useState, useEffect, useRef } from 'react';
import { Album, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useDispatch } from 'react-redux';
import api from '../../../../api';
import { toast } from 'react-toastify';

const AlbumSelector = ({ selectedAlbum, setSelectedAlbum, trackNumber, setTrackNumber }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedAlbumIndex, setFocusedAlbumIndex] = useState(-1);
  const [sortOrder, setSortOrder] = useState('asc');
  const [albums, setAlbums] = useState([]);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const response = await api.get('/api/album/albums');
        setAlbums(response.data);
      } catch (err) {
        console.error('Error fetching albums:', err);
        toast.error('Failed to load albums');
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
    setSelectedAlbum(albumId);
    const album = albums.find(a => a.id === albumId);
    const maxTrackNumber = album?.tracks?.reduce(
      (max, track) => Math.max(max, track.track_number),
      0
    ) || 0;
    setTrackNumber((maxTrackNumber + 1).toString()); // Automatically set track number
    setIsDropdownOpen(false);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleKeyDown = (e) => {
    if (!isDropdownOpen) return;

    const filteredAlbums = getFilteredAlbums();
    const albumsLength = filteredAlbums.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedAlbumIndex(prev => 
          prev < albumsLength - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedAlbumIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedAlbumIndex >= 0 && focusedAlbumIndex < albumsLength) {
          handleAlbumSelect(filteredAlbums[focusedAlbumIndex].id);
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
      setFocusedAlbumIndex(-1);
      setSearchQuery('');
    } else if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setFocusedAlbumIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSelectedAlbumName = () => {
    const album = albums.find(a => a.id === selectedAlbum);
    return album ? album.name : '';
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-white mb-1">
        Select Album *
      </label>
      
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full p-2 border rounded-md bg-gray-700 text-white text-left flex items-center justify-between"
        >
          <div className="flex items-center">
            <Album className="h-5 w-5 mr-2" />
            <span>{selectedAlbum ? getSelectedAlbumName() : 'Select an album...'}</span>
          </div>
          {isDropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {isDropdownOpen && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg">
            <div className="p-2 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search albums..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={toggleSortOrder}
                className="mt-2 px-3 py-1 text-sm text-gray-300 hover:text-white flex items-center gap-1"
              >
                Sort {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {getFilteredAlbums().map((album, index) => (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => handleAlbumSelect(album.id)}
                  onMouseEnter={() => setFocusedAlbumIndex(index)}
                  className={`w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center justify-between ${
                    focusedAlbumIndex === index ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <Album className="h-4 w-4 mr-2" />
                    {album.name}
                  </div>
                  <span className="text-xs text-gray-400">Click to select</span>
                </button>
              ))}
              {getFilteredAlbums().length === 0 && (
                <div className="px-4 py-2 text-gray-400 text-center">
                  No albums found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedAlbum && (
        <div className="mt-4 text-white">
          <p>Track number will be set automatically based on the album's existing tracks.</p>
        </div>
      )}
    </div>
  );
};

export default AlbumSelector;