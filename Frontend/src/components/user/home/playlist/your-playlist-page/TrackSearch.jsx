import React, { useState, useEffect } from 'react';
import { Search, X, Plus } from 'lucide-react';
import api from '../../../../../api';

const TrackSearch = ({ playlistId, onTracksUpdate }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const fetchTracks = async (query) => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/playlist/music/?search=${query}&playlist_id=${playlistId}`);
        console.log('Search Results:', response.data);
        if (response.data && Array.isArray(response.data)) {
          setSearchResults(response.data);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Error fetching tracks:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (searchQuery) {
      const timeoutId = setTimeout(() => fetchTracks(searchQuery), 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, playlistId]);

  useEffect(() => {
    return () => {
      setSearchResults([]);
      setSearchQuery('');
      setShowResults(false);
    };
  }, [playlistId]);

  const handleTrackSelect = async (trackId) => {
    try {
      await api.post(`/api/playlist/playlists/${playlistId}/add_tracks/`, {
        tracks: [{ music: trackId }]
      });
      onTracksUpdate();
      setSearchQuery('');
      setShowResults(false);
    } catch (error) {
      console.error('Error adding track:', error);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto mt-8">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="block w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-700 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Let's find something for your playlist"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setShowResults(false);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      {showResults && searchQuery && (
        <div className="absolute w-full mt-2 bg-gray-800 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-400">Searching...</div>
          ) : searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((track) => (
                <button
                  key={track.id}
                  onClick={() => handleTrackSelect(track.id)}
                  className="w-full px-4 py-2 hover:bg-gray-700 flex items-center gap-3 group"
                >
                  <img
                    src={track.cover_photo || "/api/placeholder/40/40"}
                    alt={track.name}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div className="flex flex-col items-start">
                    <span className="text-white font-medium">{track.name}</span>
                    <span className="text-sm text-gray-400">
                      {track.artist_full_name} 
                    </span>
                  </div>
                  <div className="ml-auto opacity-0 group-hover:opacity-100">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <Plus className="text-black text-xl" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400">
              No songs found to add
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackSearch;