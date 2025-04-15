import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Play, Pause, Loader } from 'lucide-react';
import api from '../../../../api';
import { setQueue, setMusicId, setIsPlaying } from '../../../../slices/user/musicPlayerSlice';

const SearchComponent = ({ onClose, isHeaderSearch = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const dispatch = useDispatch();
  const searchInputRef = useRef(null);
  const searchResultsRef = useRef(null);
  
  // Get current playback state from Redux
  const { musicId, isPlaying, queue } = useSelector(state => state.musicPlayer);
  
  // Focus the search input when the component mounts
  useEffect(() => {
    if (searchInputRef.current && !isHeaderSearch) {
      searchInputRef.current.focus();
    }
  }, [isHeaderSearch]);

  // Close the search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchResultsRef.current && 
        !searchResultsRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        if (onClose) onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Debounce search function to avoid making too many API calls
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const debounceTimer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data } = await api.get(`/api/home/search/?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to load search results');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayTrack = (track) => {
    const isCurrentTrack = track.id === musicId;
    
    if (isCurrentTrack) {
      // Toggle play/pause for the current track
      dispatch(setIsPlaying(!isPlaying));
    } else {
      // Set up queue with just this track
      dispatch(setQueue({
        tracks: [track],
        playlistId: null,
        artistId: track.artist_id,
      }));
      
      // Set the track to play
      dispatch(setMusicId(track.id));
      
      // Start playing
      dispatch(setIsPlaying(true));
    }
    
    // Close search if it's in a modal
    if (onClose) onClose();
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  };

  // Checks if a track is currently playing
  const isTrackPlaying = (trackId) => {
    return isPlaying && musicId === trackId;
  };

  return (
    <div className="relative w-full">
      <div className={`flex items-center bg-gray-800 rounded-full px-3 py-2 ${isHeaderSearch ? '' : 'border border-gray-700'}`}>
        <Search className="h-4 w-4 text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for songs, artists..."
          className="bg-transparent text-white text-sm placeholder-gray-400 outline-none flex-1 ml-2"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        {isLoading && <Loader className="h-4 w-4 text-gray-400 animate-spin" />}
      </div>

      {/* Search Results Dropdown */}
      {searchQuery.trim() && searchResults.length > 0 && (
        <div 
          ref={searchResultsRef}
          className="absolute z-50 mt-2 w-full bg-gray-900 rounded-lg shadow-lg max-h-96 overflow-y-auto border border-gray-800"
        >
          <div className="p-2 border-b border-gray-800">
            <span className="text-sm font-medium text-gray-300">Search Results</span>
          </div>
          
          <div className="py-2">
            {searchResults.map((track) => {
              const trackIsPlaying = isTrackPlaying(track.id);
              
              return (
                <div 
                  key={track.id}
                  className={`flex items-center px-4 py-2 hover:bg-gray-800 cursor-pointer ${
                    track.id === musicId ? 'bg-gray-800 bg-opacity-50' : ''
                  }`}
                  onClick={() => handlePlayTrack(track)}
                >
                  <div className="w-10 h-10 mr-3 relative group">
                    <img 
                      src={track.cover_photo} 
                      alt={track.name}
                      className="w-full h-full object-cover rounded"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/assets/default-album.png';
                      }}
                    />
                    {track.id === musicId && (
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${track.id === musicId ? 'text-green-400' : 'text-white'} truncate`}>
                      {track.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{track.artist}</div>
                  </div>
                  <button 
                    className={`ml-2 w-8 h-8 flex items-center justify-center rounded-full ${
                      trackIsPlaying
                        ? 'bg-green-500 hover:bg-green-400'
                        : 'bg-green-600 hover:bg-green-500'
                    } transition-colors`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayTrack(track);
                    }}
                  >
                    {trackIsPlaying ? (
                      <Pause className="h-4 w-4 text-white" />
                    ) : (
                      <Play className="h-4 w-4 text-white" fill="white" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {searchQuery.trim() && searchResults.length === 0 && !isLoading && (
        <div className="absolute z-50 mt-2 w-full bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-4 text-center">
          <p className="text-gray-400 text-sm">No results found for "{searchQuery}"</p>
        </div>
      )}

      {error && (
        <div className="absolute z-50 mt-2 w-full bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-4 text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;