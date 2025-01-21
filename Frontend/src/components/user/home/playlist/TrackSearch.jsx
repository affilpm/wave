import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import api from '../../../../api';

const TrackSearch = ({ playlistId, onTracksUpdate }) => {
  const [searchOptions, setSearchOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTracks = async (query) => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/playlist/music/?search=${query}`);
        
        if (response.data && Array.isArray(response.data)) {
          const options = response.data.map(track => ({
            value: track.id,
            label: `${track.name} - ${track.artist?.user?.email || 'Unknown Artist'}`,
            track: track
          }));
          setSearchOptions(options);
        } else {
          setSearchOptions([]);
        }
      } catch (error) {
        console.error('Error fetching tracks:', error);
        setSearchOptions([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (searchQuery) {
      const timeoutId = setTimeout(() => fetchTracks(searchQuery), 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchOptions([]);
    }
  }, [searchQuery]);

  const handleTrackSelect = async (selectedOption) => {
    if (!selectedOption) return;

    try {
      await api.post(`/api/playlist/playlists/${playlistId}/add_tracks/`, {
        tracks: [{ music: selectedOption.value }]
      });
      onTracksUpdate(); // Refresh the playlist
    } catch (error) {
      console.error('Error adding track:', error);
    }
  };

  const customStyles = {
    control: (base) => ({
      ...base,
      background: '#282828',
      borderColor: '#404040',
      '&:hover': {
        borderColor: '#505050'
      }
    }),
    menu: (base) => ({
      ...base,
      background: '#282828',
      color: 'white'
    }),
    option: (base, state) => ({
      ...base,
      background: state.isFocused ? '#404040' : '#282828',
      '&:hover': {
        background: '#404040'
      }
    }),
    singleValue: (base) => ({
      ...base,
      color: 'white'
    }),
    input: (base) => ({
      ...base,
      color: 'white'
    })
  };

  return (
    <div className="w-full p-4">
      <Select
        options={searchOptions}
        onInputChange={(value) => setSearchQuery(value)}
        onChange={handleTrackSelect}
        isLoading={isLoading}
        styles={customStyles}
        placeholder="Search and add tracks..."
        isClearable
        className="text-base"
      />
    </div>
  );
};

export default TrackSearch;