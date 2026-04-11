import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Search, Play, Pause, Loader, User } from 'lucide-react';
import api from '../../../../api';
import { setQueue, setIsPlaying, togglePlay } from '../../../../slices/user/playerSlice';
import { prepareTracksForPlayer } from '../../../../utils/trackUtils';

const SearchComponent = ({ onClose, isHeaderSearch = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ tracks: [], artists: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isResultsVisible, setIsResultsVisible] = useState(true);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const searchResultsRef = useRef(null);
  
  // Get current playback state from Redux
  const { currentTrack, status, currentContext } = useSelector(state => state.player);
  const currentMusicId = currentTrack?.id;
  const isPlaying = status === 'playing';
  
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
        setIsResultsVisible(false);
        if (onClose) onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  // Debounce search function to avoid making too many API calls
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ tracks: [], artists: [] });
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
      const { data } = await api.get(`/api/v1/home/search/?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults({
        tracks: data.tracks || [],
        artists: data.artists || []
      });
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to load search results');
      setSearchResults({ tracks: [], artists: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayTrack = (track) => {
    const context = { type: 'search', id: searchQuery };
    const isSameSong = Number(track.id) === Number(currentMusicId);
    const isSameContext = currentContext?.type === context.type && currentContext?.id === context.id;

    if (isSameSong && isSameContext) {
      dispatch(togglePlay());
    } else {
      const formattedTrack = prepareTracksForPlayer([track])[0];
      dispatch(setQueue({
        tracks: [formattedTrack],
        startIndex: 0,
        context: context
      }));
      dispatch(setIsPlaying(true));
    }

    if (onClose) onClose();
  };

  const handleArtistClick = (artistId) => {
    navigate(`/artist/${artistId}`);
    if (onClose) onClose();
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    setIsResultsVisible(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  };

  // Checks if a track is currently playing
  const isTrackPlaying = (trackId) => {
    const isSameSong = Number(trackId) === Number(currentMusicId);
    const isSameContext = currentContext?.type === 'search' && currentContext?.id === searchQuery;
    return isPlaying && isSameSong && isSameContext;
  };

  const displayResults = searchResults.tracks.length > 0 || searchResults.artists.length > 0;

  return (
    <div className="relative w-full">
      <div className={`flex items-center bg-gray-800 rounded-full px-4 py-2 ${isHeaderSearch ? '' : 'border border-gray-700'}`}>
        <Search className="h-4 w-4 text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for songs or artists"
          className="bg-transparent text-white text-sm placeholder-gray-400 outline-none flex-1 ml-2"
          value={searchQuery}
          onFocus={() => setIsResultsVisible(true)}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        {isLoading && <Loader className="h-4 w-4 text-gray-400 animate-spin" />}
      </div>

      {/* Search Results Dropdown */}
      {searchQuery.trim() && displayResults && isResultsVisible && (
        <div 
          ref={searchResultsRef}
          className="absolute z-50 mt-2 w-full bg-gray-900 rounded-xl shadow-2xl max-h-[500px] overflow-y-auto border border-white/5 backdrop-blur-xl bg-opacity-95"
        >
          {/* Artists Section */}
          {searchResults.artists.length > 0 && (
            <div className="p-3">
              <div className="px-3 py-1 mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Artists</span>
              </div>
              <div className="space-y-1">
                {searchResults.artists.map((artist) => (
                  <div 
                    key={artist.id}
                    className="flex items-center px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group"
                    onClick={() => handleArtistClick(artist.id)}
                  >
                    <div className="w-10 h-10 mr-3 shrink-0">
                      {artist.profile_photo ? (
                        <img 
                          src={artist.profile_photo} 
                          alt={artist.username}
                          className="w-full h-full object-cover rounded-full shadow-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate group-hover:text-green-400 transition-colors">
                        {artist.username || 'Unknown Artist'}
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium">Artist</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tracks Section */}
          {searchResults.tracks.length > 0 && (
            <div className={`p-3 ${searchResults.artists.length > 0 ? 'border-t border-white/5' : ''}`}>
              <div className="px-3 py-1 mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Songs</span>
              </div>
              <div className="space-y-1">
                {searchResults.tracks.map((track) => {
                  const trackIsPlaying = isTrackPlaying(track.id);
                  const isCurrent = Number(track.id) === Number(currentMusicId);

                  return (
                    <div 
                      key={track.id}
                      className={`flex items-center px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer transition-all group ${
                        isCurrent ? 'bg-white/5' : ''
                      }`}
                      onClick={() => handlePlayTrack(track)}
                    >
                      <div className="w-10 h-10 mr-3 shrink-0 relative">
                        <img 
                          src={track.cover_photo} 
                          alt={track.name}
                          className="w-full h-full object-cover rounded shadow-md"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/default-album.png';
                          }}
                        />
                        {isCurrent && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
                            <div className="flex items-end gap-0.5 h-3">
                              <span className="w-0.5 h-full bg-green-500 rounded-full animate-bounce" style={{ animationDuration: '0.6s' }}></span>
                              <span className="w-0.5 h-2/3 bg-green-500 rounded-full animate-bounce" style={{ animationDuration: '0.8s' }}></span>
                              <span className="w-0.5 h-full bg-green-500 rounded-full animate-bounce" style={{ animationDuration: '0.7s' }}></span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold truncate transition-colors ${isCurrent ? 'text-green-400' : 'text-white'}`}>
                          {track.name}
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium truncate">{track.artist}</div>
                      </div>
                      <button 
                        className={`opacity-0 group-hover:opacity-100 ml-2 w-8 h-8 flex items-center justify-center rounded-full transition-all scale-90 group-hover:scale-100 ${
                          trackIsPlaying ? 'bg-green-500' : 'bg-white text-black'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayTrack(track);
                        }}
                      >
                        {trackIsPlaying ? (
                          <Pause className="h-4 w-4 fill-current" />
                        ) : (
                          <Play className="h-4 w-4 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {searchQuery.trim() && !displayResults && !isLoading && (
        <div className="absolute z-50 mt-2 w-full bg-gray-900 rounded-xl shadow-2xl border border-white/5 p-8 text-center backdrop-blur-xl">
          <p className="text-gray-400 text-sm font-medium">No results found for "{searchQuery}"</p>
          <p className="text-gray-600 text-[11px] mt-1">Try searching for something else</p>
        </div>
      )}

      {error && (
        <div className="absolute z-50 mt-2 w-full bg-gray-900 rounded-xl shadow-2xl border border-red-500/20 p-4 text-center backdrop-blur-xl">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;