import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Sliders,
  Save,
  X,
  Trash2,
  PlusCircle,
  Check
} from 'lucide-react';
import { 
  fetchPresets,
  fetchCurrentPreset,
  savePreset,
  deletePreset,
  toggleEqualizer,
  updateBand,
  resetEqualizer
} from '../../../../../slices/user/equalizerSlice';

const EqualizerPanel = ({ howl, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const {   currentPreset = {}, 
  presets = [], 
  bands = [], 
  isEqualizerActive = false, 
  isLoading = false 
 } = useSelector(state => state.equalizer) || {};
  
  const [newPresetName, setNewPresetName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  
  // Initialize with current preset
  useEffect(() => {
    dispatch(fetchCurrentPreset());
    dispatch(fetchPresets());
  }, [dispatch]);
  
  // Apply equalizer settings to Howler when preset changes or equalizer is toggled
  useEffect(() => {
    if (!howl || !isEqualizerActive) {
      // If equalizer is not active, reset the Web Audio filters
      if (howl && howl._webAudio) {
        resetHowlerFilters(howl);
      }
      return;
    }
    
    // Apply equalizer settings if we have a Howl instance with Web Audio enabled
    if (howl && howl._webAudio) {
      applyEqualizerToHowl(howl, bands);
    }
  }, [howl, currentPreset, isEqualizerActive, bands]);

  const resetHowlerFilters = (howl) => {
    if (howl.equalizer) {
      // Disconnect and remove existing filters
      for (let i = 0; i < howl.equalizer.length; i++) {
        howl.equalizer[i].disconnect();
      }
      howl.equalizer = null;
      
      // Reconnect without filters
      if (howl._audio) {
        for (let i = 0; i < howl._audio.length; i++) {
          if (howl._audio[i]) {
            howl._audio[i].disconnect();
            howl._audio[i].connect(Howler.ctx.destination);
          }
        }
      }
    }
  };
  
  const applyEqualizerToHowl = (howl, bands) => {
    const audioCtx = Howler.ctx;
    
    // Reset existing filters if any
    resetHowlerFilters(howl);
    
    // Create array to hold filter nodes
    howl.equalizer = [];
    
    // Set up filter frequencies based on our bands
    const filterFrequencies = {
      band_32: 32,
      band_64: 64,
      band_125: 125,
      band_250: 250,
      band_500: 500,
      band_1k: 1000,
      band_2k: 2000,
      band_4k: 4000,
      band_8k: 8000,
      band_16k: 16000
    };
    
    // Create filters for each band
    for (const band of bands) {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'peaking';  // EQ filter type
      filter.frequency.value = filterFrequencies[band.id];
      filter.Q.value = 1.0;  // Quality factor
      filter.gain.value = band.value;  // -12 to +12 dB
      
      howl.equalizer.push(filter);
    }
    
    // Connect the filters in series
    for (let i = 0; i < howl.equalizer.length - 1; i++) {
      howl.equalizer[i].connect(howl.equalizer[i + 1]);
    }
    
    // Connect audio to filters and filters to destination
    if (howl._audio) {
      for (let i = 0; i < howl._audio.length; i++) {
        if (howl._audio[i]) {
          howl._audio[i].disconnect();
          howl._audio[i].connect(howl.equalizer[0]);
        }
      }
    }
    
    // Connect the last filter to the destination
    if (howl.equalizer.length > 0) {
      howl.equalizer[howl.equalizer.length - 1].connect(audioCtx.destination);
    }
  };

  const handleBandChange = (id, value) => {
    dispatch(updateBand({ id, value }));
  };

  const handleToggleEqualizer = () => {
    dispatch(toggleEqualizer());
  };

  const handleResetEqualizer = () => {
    dispatch(resetEqualizer());
  };

  const handleSelectPreset = (preset) => {
    // Apply the selected preset
    for (const band of bands) {
      dispatch(updateBand({ id: band.id, value: preset[band.id] || 0 }));
    }
    setSelectedPresetId(preset.id);
  };

  const handleSavePreset = () => {
    if (!currentPreset.name && !newPresetName) return;
    
    const presetToSave = {
      ...currentPreset,
      name: newPresetName || currentPreset.name,
      is_default: true
    };
    
    dispatch(savePreset(presetToSave));
    setNewPresetName('');
    setIsCreatingNew(false);
  };

  const handleDeletePreset = (id) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      dispatch(deletePreset(id));
      if (selectedPresetId === id) {
        setSelectedPresetId(null);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto md:absolute md:inset-auto md:top-0 md:right-0 md:mt-20 md:mr-4 w-full md:w-96 bg-black bg-opacity-95 border border-gray-900 rounded-lg shadow-xl">
      <div className="p-3 border-b border-gray-800 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center">
          <Sliders className="w-4 h-4 text-indigo-400 mr-2" />
          <h3 className="text-sm font-medium text-indigo-400">Equalizer</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleToggleEqualizer}
            className={`text-xs px-2 py-1 rounded ${isEqualizerActive ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            {isEqualizerActive ? 'On' : 'Off'}
          </button>
          <button onClick={onClose} className="text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Main container */}
      <div className="p-4">
        {/* Preset selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-400">Presets</h4>
            <button 
              onClick={() => setIsCreatingNew(true)}
              className="text-xs text-indigo-400 flex items-center"
            >
              <PlusCircle className="w-3 h-3 mr-1" />
              New
            </button>
          </div>
          
          {isCreatingNew ? (
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                placeholder="Preset name"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              />
              <button
                onClick={handleSavePreset}
                disabled={!newPresetName}
                className="p-1 bg-indigo-600 rounded text-white disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsCreatingNew(false);
                  setNewPresetName('');
                }}
                className="p-1 bg-gray-700 rounded text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mb-2">
              {/* Default flat preset */}
              <button
                onClick={() => {
                  handleResetEqualizer();
                  setSelectedPresetId(null);
                }}
                className={`text-xs px-3 py-1.5 rounded ${
                  !selectedPresetId ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                Flat
              </button>
              
              {/* User presets */}
              {presets.map((preset) => (
                <div 
                  key={preset.id} 
                  className="flex items-center"
                >
                  <button
                    onClick={() => handleSelectPreset(preset)}
                    className={`text-xs flex-1 px-3 py-1.5 rounded-l ${
                      selectedPresetId === preset.id ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    {preset.name}
                  </button>
                  <button
                    onClick={() => handleDeletePreset(preset.id)}
                    className="bg-gray-800 rounded-r px-1.5 py-1.5 border-l border-gray-700"
                  >
                    <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Save current preset */}
          {!isCreatingNew && (
            <div className="flex items-center justify-between">
              <button
                onClick={handleResetEqualizer}
                className="text-xs bg-gray-800 px-3 py-1.5 rounded text-gray-300"
              >
                Reset
              </button>
              
              <button
                onClick={() => setIsCreatingNew(true)}
                className="text-xs bg-indigo-600 px-3 py-1.5 rounded text-white flex items-center"
              >
                <Save className="w-3 h-3 mr-1" />
                Save Current
              </button>
            </div>
          )}
        </div>
        
        {/* Equalizer bands */}
        <div className="rounded-lg bg-gray-900 p-4">
          <div className="flex justify-between mb-1 px-4">
            <span className="text-xs text-gray-500">+12 dB</span>
            <span className="text-xs text-gray-500">0 dB</span>
            <span className="text-xs text-gray-500">-12 dB</span>
          </div>
          
          <div className="grid grid-cols-10 gap-2">
          {bands && bands.map((band) => (
              <div key={band.id} className="flex flex-col items-center">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={band.value}
                  onChange={(e) => handleBandChange(band.id, parseInt(e.target.value))}
                  className="equalizer-slider"
                  style={{
                    writingMode: 'bt-lr',
                    WebkitAppearance: 'slider-vertical',
                    height: '150px',
                    width: '20px'
                  }}
                  disabled={!isEqualizerActive}
                />
                <div className="flex flex-col items-center mt-2">
                  <span className="text-xs text-indigo-400 font-medium">{band.value > 0 ? `+${band.value}` : band.value}</span>
                  <span className="text-xs text-gray-500 mt-1">{band.frequency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* CSS for vertical sliders */}
      <style jsx>{`
        /* Styling for modern browsers */
        .equalizer-slider {
          cursor: pointer;
          background: transparent;
        }
        
        .equalizer-slider::-webkit-slider-runnable-track {
          width: 8px;
          background: #374151;
          border-radius: 4px;
        }
        
        .equalizer-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          border: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #6366F1;
          margin-top: -4px;
          margin-left: -4px;
        }
        
        .equalizer-slider:disabled::-webkit-slider-thumb {
          background: #4B5563;
        }
        
        /* Firefox styles */
        .equalizer-slider::-moz-range-track {
          width: 8px;
          background: #374151;
          border-radius: 4px;
        }
        
        .equalizer-slider::-moz-range-thumb {
          border: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #6366F1;
        }
        
        .equalizer-slider:disabled::-moz-range-thumb {
          background: #4B5563;
        }
      `}</style>
    </div>
  );
};

export default EqualizerPanel;