import React, { useState, useEffect, useRef } from 'react';

const AudioEqualizer = ({ howl, isPlaying }) => {
  const [equalizer, setEqualizer] = useState({
    bass: 0,
    mid: 0,
    treble: 0,
    enabled: false
  });
  
  // For checking if we successfully connected
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  
  // Create refs for the audio nodes
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const bassFilterRef = useRef(null);
  const midFilterRef = useRef(null);
  const trebleFilterRef = useRef(null);
  const gainNodeRef = useRef(null);

  // Initialize the audio filters when component mounts or howl changes
  useEffect(() => {
    if (!howl || !howl._sounds || !howl._sounds[0] || !howl._sounds[0]._node) {
      setConnectionStatus('no sound');
      return;
    }
    
    try {
      // Access Howler's WebAudio context
      if (!window.Howler || !window.Howler.ctx) {
        console.error('Howler context is not available');
        setConnectionStatus('no context');
        return;
      }
      
      const ctx = window.Howler.ctx;
      audioContextRef.current = ctx;
      
      // IMPORTANT: We need to intercept the sound node BEFORE it's connected to the destination
      // We'll modify the _node property directly to insert our audio processing chain
      const soundNode = howl._sounds[0]._node;
      
      if (!soundNode) {
        setConnectionStatus('no node');
        return;
      }
      
      console.log('Got sound node:', soundNode);
      
      // Create our filter nodes
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 200;
      bassFilterRef.current = bassFilter;
      
      const midFilter = ctx.createBiquadFilter();
      midFilter.type = 'peaking';
      midFilter.frequency.value = 1000;
      midFilter.Q.value = 1;
      midFilterRef.current = midFilter;
      
      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 3000;
      trebleFilterRef.current = trebleFilter;
      
      // Create a gain node for overall volume control
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0;
      gainNodeRef.current = gainNode;
      
      // Create an analyser node for visualization (if needed later)
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      
      // DIRECT MODIFICATION OF HOWLER INTERNALS
      // This is tricky and may break with Howler updates, but works for now
      
      // Store original connect method to restore it later
      const originalConnect = soundNode.connect;
      
      // Override the connect method to insert our filter chain
      soundNode.connect = function(destination) {
        console.log('Intercepted connection to', destination);
        
        // Connect our chain: source -> filters -> gain -> analyser -> destination
        this.__proto__.connect.call(this, bassFilter);
        bassFilter.connect(midFilter);
        midFilter.connect(trebleFilter);
        trebleFilter.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(destination);
        
        console.log('Equalizer chain connected successfully');
        setConnectionStatus('connected');
      };
      
      // If the node is already connected, we need to reconnect it
      // Force Howler to reconnect by toggling the mute state
      const wasMuted = howl._muted;
      howl.mute(true);
      howl.mute(wasMuted);
      
      // Reset the equalizer values
      updateFilters(equalizer.enabled ? equalizer : { bass: 0, mid: 0, treble: 0, enabled: false });
      
      return () => {
        // Cleanup: restore original connect method to avoid memory leaks
        if (soundNode && typeof originalConnect === 'function') {
          soundNode.connect = originalConnect;
        }
        
        try {
          // Disconnect our nodes
          if (bassFilterRef.current) bassFilterRef.current.disconnect();
          if (midFilterRef.current) midFilterRef.current.disconnect();
          if (trebleFilterRef.current) trebleFilterRef.current.disconnect();
          if (gainNodeRef.current) gainNodeRef.current.disconnect();
          if (analyserRef.current) analyserRef.current.disconnect();
        } catch (err) {
          console.error('Error cleaning up audio nodes:', err);
        }
      };
    } catch (error) {
      console.error('Error setting up equalizer:', error);
      setConnectionStatus('error: ' + error.message);
    }
  }, [howl]);
  
  // Function to update filter values
  const updateFilters = (eq) => {
    if (!bassFilterRef.current || !midFilterRef.current || !trebleFilterRef.current) return;
    
    try {
      const bassValue = eq.enabled ? eq.bass : 0;
      const midValue = eq.enabled ? eq.mid : 0;
      const trebleValue = eq.enabled ? eq.treble : 0;
      
      // Update filters with current time for smooth transition
      const currentTime = audioContextRef.current ? audioContextRef.current.currentTime : 0;
      
      bassFilterRef.current.gain.setValueAtTime(bassValue, currentTime);
      midFilterRef.current.gain.setValueAtTime(midValue, currentTime);
      trebleFilterRef.current.gain.setValueAtTime(trebleValue, currentTime);
      
      console.log(`EQ applied - Bass: ${bassValue}, Mid: ${midValue}, Treble: ${trebleValue}`);
    } catch (err) {
      console.error('Error updating filters:', err);
    }
  };
  
  // Update filter values when equalizer settings change
  useEffect(() => {
    updateFilters(equalizer);
  }, [equalizer]);
  
  const handleEqualizerChange = (band, value) => {
    setEqualizer(prev => ({ ...prev, [band]: parseFloat(value) }));
  };
  
  const toggleEqualizer = () => {
    setEqualizer(prev => ({ ...prev, enabled: !prev.enabled }));
  };
  
  const resetEqualizer = () => {
    setEqualizer({ bass: 0, mid: 0, treble: 0, enabled: equalizer.enabled });
  };
  
  // Apply equalizer presets
  const applyPreset = (preset) => {
    switch(preset) {
      case 'bass':
        setEqualizer({ bass: 7, mid: 0, treble: -2, enabled: true });
        break;
      case 'vocal':
        setEqualizer({ bass: -3, mid: 5, treble: 1, enabled: true });
        break;
      case 'treble':
        setEqualizer({ bass: -2, mid: 0, treble: 7, enabled: true });
        break;
      case 'rock':
        setEqualizer({ bass: 4, mid: -2, treble: 3, enabled: true });
        break;
      default:
        resetEqualizer();
    }
  };
  
  return (
    <div className="bg-gray-900 p-4 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-white font-medium">Equalizer</h4>
          {connectionStatus !== 'connected' && (
            <p className="text-xs text-red-400 mt-1">Status: {connectionStatus}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={toggleEqualizer}
            className={`px-3 py-1 rounded text-xs ${
              equalizer.enabled ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            {equalizer.enabled ? 'ON' : 'OFF'}
          </button>
          <button 
            onClick={resetEqualizer}
            className="px-3 py-1 rounded text-xs bg-gray-700 text-gray-300 hover:bg-gray-600"
            disabled={!equalizer.enabled}
          >
            Reset
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6 mb-4">
        <div className="flex flex-col items-center">
          <div className="h-40 flex items-center">
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={equalizer.bass}
              onChange={(e) => handleEqualizerChange('bass', e.target.value)}
              className="h-36 appearance-none bg-gray-700 rounded-full outline-none"
              style={{ 
                writingMode: 'bt-lr', 
                transform: 'rotate(270deg)',
                WebkitAppearance: 'slider-vertical'
              }}
              disabled={!equalizer.enabled}
            />
          </div>
          <div className="text-center mt-2">
            <div className="text-blue-400 font-medium">{equalizer.bass > 0 ? '+' : ''}{equalizer.bass} dB</div>
            <span className="text-xs text-gray-400">Bass</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="h-40 flex items-center">
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={equalizer.mid}
              onChange={(e) => handleEqualizerChange('mid', e.target.value)}
              className="h-36 appearance-none bg-gray-700 rounded-full outline-none"
              style={{ 
                writingMode: 'bt-lr', 
                transform: 'rotate(270deg)',
                WebkitAppearance: 'slider-vertical'
              }}
              disabled={!equalizer.enabled}
            />
          </div>
          <div className="text-center mt-2">
            <div className="text-blue-400 font-medium">{equalizer.mid > 0 ? '+' : ''}{equalizer.mid} dB</div>
            <span className="text-xs text-gray-400">Mid</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="h-40 flex items-center">
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={equalizer.treble}
              onChange={(e) => handleEqualizerChange('treble', e.target.value)}
              className="h-36 appearance-none bg-gray-700 rounded-full outline-none"
              style={{ 
                writingMode: 'bt-lr', 
                transform: 'rotate(270deg)',
                WebkitAppearance: 'slider-vertical'
              }}
              disabled={!equalizer.enabled}
            />
          </div>
          <div className="text-center mt-2">
            <div className="text-blue-400 font-medium">{equalizer.treble > 0 ? '+' : ''}{equalizer.treble} dB</div>
            <span className="text-xs text-gray-400">Treble</span>
          </div>
        </div>
      </div>
      
      {/* Presets */}
      <div className="mt-4">
        <div className="text-xs text-gray-400 mb-2">Presets</div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => applyPreset('bass')}
            className="px-3 py-1 text-xs rounded bg-gray-700 text-white hover:bg-gray-600"
            disabled={!equalizer.enabled}
          >
            Bass Boost
          </button>
          <button 
            onClick={() => applyPreset('vocal')}
            className="px-3 py-1 text-xs rounded bg-gray-700 text-white hover:bg-gray-600"
            disabled={!equalizer.enabled}
          >
            Vocal
          </button>
          <button 
            onClick={() => applyPreset('treble')}
            className="px-3 py-1 text-xs rounded bg-gray-700 text-white hover:bg-gray-600"
            disabled={!equalizer.enabled}
          >
            Treble Boost
          </button>
          <button 
            onClick={() => applyPreset('rock')}
            className="px-3 py-1 text-xs rounded bg-gray-700 text-white hover:bg-gray-600"
            disabled={!equalizer.enabled}
          >
            Rock
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioEqualizer;