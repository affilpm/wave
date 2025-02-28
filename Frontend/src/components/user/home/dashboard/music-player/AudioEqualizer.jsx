import React, { useState, useEffect, useRef } from 'react';
import { Sliders } from 'lucide-react';

const AudioEqualizer = ({ howlerRef }) => {
  const [equalizerVisible, setEqualizerVisible] = useState(false);
  const [bands, setBands] = useState([
    { id: 1, frequency: 60, gain: 0, label: '60Hz' },
    { id: 2, frequency: 170, gain: 0, label: '170Hz' },
    { id: 3, frequency: 310, gain: 0, label: '310Hz' },
    { id: 4, frequency: 600, gain: 0, label: '600Hz' },
    { id: 5, frequency: 1000, gain: 0, label: '1kHz' },
    { id: 6, frequency: 3000, gain: 0, label: '3kHz' },
    { id: 7, frequency: 6000, gain: 0, label: '6kHz' },
    { id: 8, frequency: 12000, gain: 0, label: '12kHz' },
    { id: 9, frequency: 16000, gain: 0, label: '16kHz' }
  ]);
  
  const audioContext = useRef(null);
  const sourceNode = useRef(null);
  const gainNodes = useRef([]);
  const analyser = useRef(null);
  const filters = useRef([]);
  const isProcessing = useRef(false);
  
  // Initialize the audio context and nodes
  useEffect(() => {
    if (!howlerRef.current || isProcessing.current) return;
    
    const clampFrequency = (freq) => Math.min(Math.max(freq, 20), 8000);

    const setupEqualizer = () => {
      try {
        const audioElement = howlerRef.current._sounds[0]._node;
        if (!audioElement) return;
    
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext.current = new AudioContext();
    
        sourceNode.current = audioContext.current.createMediaElementSource(audioElement);
        analyser.current = audioContext.current.createAnalyser();
        analyser.current.fftSize = 256;
    
        filters.current = bands.map(band => {
          const filter = audioContext.current.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.value = clampFrequency(band.frequency);
          filter.gain.value = band.gain;
          filter.Q.value = 1.0;
          return filter;
        });
    
        sourceNode.current.connect(filters.current[0]);
        for (let i = 0; i < filters.current.length - 1; i++) {
          filters.current[i].connect(filters.current[i + 1]);
        }
        filters.current[filters.current.length - 1].connect(analyser.current);
        analyser.current.connect(audioContext.current.destination);
    
        isProcessing.current = true;
      } catch (error) {
        console.error('Error initializing equalizer:', error);
      }
    };
    
    // Only set up equalizer when visible to save resources
    if (equalizerVisible && !isProcessing.current) {
      setupEqualizer();
    }
    
    return () => {
      // Clean up when component unmounts
      if (audioContext.current && audioContext.current.state !== 'closed') {
        audioContext.current.close();
        isProcessing.current = false;
      }
    };
  }, [howlerRef, equalizerVisible, bands]);
  
  // Update filter gain values when bands state changes
  useEffect(() => {
    if (!isProcessing.current) return;
    
    bands.forEach((band, index) => {
      if (filters.current[index]) {
        filters.current[index].gain.value = band.gain;
      }
    });
  }, [bands]);
  
  // Handle band value changes
  const handleBandChange = (id, value) => {
    setBands(prev => 
      prev.map(band => 
        band.id === id ? { ...band, gain: parseFloat(value) } : band
      )
    );
  };
  
  // Preset equalizer settings
  const presets = {
    flat: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    bass: [7, 5, 3, 1, 0, 0, 0, 0, 0],
    treble: [0, 0, 0, 0, 0, 2, 4, 6, 8],
    vocal: [-2, -1, 0, 3, 4, 3, 1, 0, -1],
    electronic: [4, 3, 0, -2, -3, 0, 1, 4, 5]
  };
  
  // Apply a preset
  const applyPreset = (presetName) => {
    const presetValues = presets[presetName];
    if (!presetValues) return;
    
    setBands(prev => 
      prev.map((band, index) => ({
        ...band,
        gain: presetValues[index]
      }))
    );
  };
  
  // Reset all bands to zero
  const resetEqualizer = () => {
    setBands(prev => 
      prev.map(band => ({
        ...band,
        gain: 0
      }))
    );
  };
  
  // Toggle equalizer visibility
  const toggleEqualizer = () => {
    setEqualizerVisible(!equalizerVisible);
  };
  
  return (
    <div className="relative">
      <button 
        onClick={toggleEqualizer} 
        className="text-gray-400 hover:text-white p-1 rounded-full"
        title="Equalizer"
      >
        <Sliders className="w-4 h-4" />
      </button>
      
      {equalizerVisible && (
        <div className="absolute bottom-full right-0 mb-2 p-4 bg-black bg-opacity-90 border border-gray-800 rounded-lg shadow-xl w-72 md:w-96 z-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-indigo-400">Equalizer</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => applyPreset('bass')}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 py-1 rounded"
              >
                Bass
              </button>
              <button 
                onClick={() => applyPreset('vocal')}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 py-1 rounded"
              >
                Vocal
              </button>
              <button 
                onClick={() => applyPreset('treble')}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 py-1 rounded"
              >
                Treble
              </button>
              <button 
                onClick={resetEqualizer}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 py-1 rounded"
              >
                Reset
              </button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0">
            {bands.map((band) => (
              <div key={band.id} className="flex flex-col items-center space-y-1">
                <span className="text-xs text-gray-400">{band.gain > 0 ? '+' : ''}{band.gain.toFixed(0)}</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={band.gain}
                  onChange={(e) => handleBandChange(band.id, e.target.value)}
                  className="appearance-none bg-gray-700 h-24 md:h-32 w-4 rounded-full outline-none vertical-slider"
                  style={{
                    WebkitAppearance: 'slider-vertical',
                    writingMode: 'bt-lr'
                  }}
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">{band.label}</span>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-3">
            <span className="text-xs text-gray-500">Adjust bands to customize sound</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioEqualizer;