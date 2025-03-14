import React, { useState, useEffect } from 'react';
import api from '../../../../../api';

const EqualizerControl = () => {
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [currentValues, setCurrentValues] = useState({
    band_31: 0,
    band_62: 0,
    band_125: 0,
    band_250: 0,
    band_500: 0,
    band_1k: 0,
    band_2k: 0,
    band_4k: 0,
    band_8k: 0,
    band_16k: 0
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Fetch all available presets and user's current preset
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [presetsResponse, userPresetResponse] = await Promise.all([
          api.get('/api/music/presets/'),
          api.get('/api/music/user-preset/')
        ]);
        
        setPresets(presetsResponse.data);
        
        // Find and select user's current preset
        const userPresetId = userPresetResponse.data.preset_id;
        const userPreset = presetsResponse.data.find(preset => preset.id === userPresetId);
        
        if (userPreset) {
          setSelectedPreset(userPreset);
          setCurrentValues({
            band_31: userPreset.band_31,
            band_62: userPreset.band_62,
            band_125: userPreset.band_125,
            band_250: userPreset.band_250,
            band_500: userPreset.band_500,
            band_1k: userPreset.band_1k,
            band_2k: userPreset.band_2k,
            band_4k: userPreset.band_4k,
            band_8k: userPreset.band_8k,
            band_16k: userPreset.band_16k
          });
        }
      } catch (error) {
        console.error('Failed to fetch equalizer data:', error);
        setMessage('Failed to load equalizer settings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle preset selection
  const handlePresetChange = (e) => {
    const presetId = parseInt(e.target.value);
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(preset);
      setCurrentValues({
        band_31: preset.band_31,
        band_62: preset.band_62,
        band_125: preset.band_125,
        band_250: preset.band_250,
        band_500: preset.band_500,
        band_1k: preset.band_1k,
        band_2k: preset.band_2k,
        band_4k: preset.band_4k,
        band_8k: preset.band_8k,
        band_16k: preset.band_16k
      });
    }
  };

  // Apply preset to user settings
  const applyPreset = async () => {
    try {
      if (!selectedPreset) return;
      
      await api.post('/api/music/user-preset/', {
        preset_id: selectedPreset.id
      });
      
      setMessage('Equalizer preset applied successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to apply preset:', error);
      setMessage('Failed to apply preset');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Handle slider changes
  const handleSliderChange = (band, value) => {
    setCurrentValues(prev => ({
      ...prev,
      [band]: value
    }));
  };

  // Render frequency bands
  const renderFrequencyBands = () => {
    const bands = [
      { key: 'band_31', label: '31 Hz' },
      { key: 'band_62', label: '62 Hz' },
      { key: 'band_125', label: '125 Hz' },
      { key: 'band_250', label: '250 Hz' },
      { key: 'band_500', label: '500 Hz' },
      { key: 'band_1k', label: '1 kHz' },
      { key: 'band_2k', label: '2 kHz' },
      { key: 'band_4k', label: '4 kHz' },
      { key: 'band_8k', label: '8 kHz' },
      { key: 'band_16k', label: '16 kHz' }
    ];

    return bands.map(band => (
      <div key={band.key} className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-400">{band.label}</span>
          <span className="text-sm font-medium text-gray-400">{currentValues[band.key]} dB</span>
        </div>
        <input
          type="range"
          min="-12"
          max="12"
          step="0.5"
          value={currentValues[band.key]}
          onChange={(e) => handleSliderChange(band.key, parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Updated UI to match the dark theme of the Settings page
  return (
    <div className="bg-gray-800 p-4">
      <div className="mb-4">
        <p className="text-gray-300 text-sm mb-4">Adjust frequency bands to customize your listening experience</p>
      </div>

      {/* Preset Selector */}
      <div className="mb-6">
        <label htmlFor="preset-select" className="block text-sm font-medium text-gray-300 mb-2">
          Select Preset
        </label>
        <select
          id="preset-select"
          value={selectedPreset?.id || ''}
          onChange={handlePresetChange}
          className="block w-full px-4 py-2 text-gray-300 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="" disabled>Select a preset</option>
          {presets.map(preset => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        {selectedPreset && (
          <p className="mt-2 text-sm text-gray-400">{selectedPreset.description}</p>
        )}
      </div>

      {/* Frequency Sliders */}
      <div className="mb-6">
        <h3 className="text-md font-medium text-gray-300 mb-4">Frequency Bands</h3>
        {renderFrequencyBands()}
      </div>

      {/* Apply Button */}
      <div className="flex justify-end">
        <button
          onClick={applyPreset}
          disabled={!selectedPreset}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Apply Preset
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`mt-4 p-3 rounded-md ${message.includes('Failed') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default EqualizerControl;