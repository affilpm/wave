import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Sliders } from 'lucide-react';

const SimpleEqualizer = ({ howl, isVisible = false, onClose }) => {
  // Preset EQ settings
  const presets = {
    flat: [0, 0, 0, 0, 0],
    bass: [4, 2, 0, -1, -2],
    treble: [-2, -1, 0, 3, 4],
    vocal: [-1, 0, 3, 1, -1],
    electronic: [3, 0, -1, 2, 1]
  };

  // Define frequency bands with labels
  const bands = [
    { freq: "60Hz", label: "Bass" },
    { freq: "230Hz", label: "Low Mid" },
    { freq: "910Hz", label: "Mid" },
    { freq: "3kHz", label: "High Mid" },
    { freq: "14kHz", label: "Treble" }
  ];

  const [eqValues, setEqValues] = useState(presets.flat);
  const [activePreset, setActivePreset] = useState('flat');
  const [showVisualizer, setShowVisualizer] = useState(true);
  const canvasRef = useRef(null);
  const analyzerRef = useRef(null);
  const animationRef = useRef(null);

  // Initialize audio analyzer for visualizer
  useEffect(() => {
    if (!howl || !showVisualizer) return;

    try {
      // Get Howler sound object
      const audioNode = howl?._sounds[0]?._node;
      if (!audioNode) return;

      const audioCtx = Howler.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 128;
      
      // Connect to Howler's node if possible
      const source = audioCtx.createMediaElementSource(audioNode);
      source.connect(analyzer);
      analyzer.connect(audioCtx.destination);
      
      analyzerRef.current = analyzer;
      
      // Start visualization
      drawVisualizer();
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } catch (error) {
      console.error("Error setting up audio analyzer:", error);
    }
  }, [howl, showVisualizer]);

  // Visualizer drawing function
  const drawVisualizer = () => {
    if (!canvasRef.current || !analyzerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyzer = analyzerRef.current;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyzer.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw frequency bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Gradient from indigo to purple
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#4f46e5');  // indigo-600
        gradient.addColorStop(1, '#7e22ce');  // purple-700
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
  };

  // Apply EQ settings to Howler
  const applyEQ = (values) => {
    if (!howl) return;
    
    // This is a placeholder - Howler doesn't have built-in EQ
    // In a real implementation, you would apply these values to a Web Audio API
    // equalizer connected to Howler's output
    console.log("Applied EQ values:", values);
    
    // Simulate EQ effect with a basic implementation
    try {
      const sound = howl._sounds[0];
      if (!sound) return;
      
      // Apply low/high adjustments through basic tone controls
      // (In a real app, you'd use a full parametric EQ)
      if (values[0] > 0) {
        // Boost bass
        howl._sounds[0]._node.bass = values[0];
      }
      
      if (values[4] > 0) {
        // Boost treble
        howl._sounds[0]._node.treble = values[4];
      }
    } catch (error) {
      console.error("Error applying EQ:", error);
    }
  };

  // Handle preset selection
  const handlePresetChange = (preset) => {
    setActivePreset(preset);
    setEqValues([...presets[preset]]);
    applyEQ(presets[preset]);
  };

  // Handle slider change
  const handleSliderChange = (index, value) => {
    const newValues = [...eqValues];
    newValues[index] = parseInt(value);
    setEqValues(newValues);
    setActivePreset('custom');
    applyEQ(newValues);
  };

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-16 md:bottom-full md:right-0 w-full md:w-80 bg-black bg-opacity-95 border border-gray-900 rounded-t-lg md:rounded-lg shadow-xl z-50">
      <div className="p-3 border-b border-gray-800 flex justify-between items-center">
        <h3 className="text-sm font-medium text-indigo-400 flex items-center">
          <Sliders className="w-4 h-4 mr-2" />
          Equalizer
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Warning about Howler limitations */}
      <div className="bg-gray-900/50 p-2 flex items-start space-x-2 text-xs text-amber-400 mb-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>This is a visual demo. Full EQ functionality requires Web Audio API integration.</p>
      </div>
      
      {/* Visualizer */}
      {showVisualizer && (
        <div className="p-2">
          <canvas 
            ref={canvasRef} 
            width={300} 
            height={60} 
            className="w-full h-16 rounded bg-black/50"
          />
        </div>
      )}
      
      {/* EQ Presets */}
      <div className="px-3 py-2 flex flex-wrap gap-2">
        {Object.keys(presets).map(preset => (
          <button
            key={preset}
            onClick={() => handlePresetChange(preset)}
            className={`text-xs px-3 py-1.5 rounded-full ${
              activePreset === preset 
                ? 'bg-indigo-700 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {preset.charAt(0).toUpperCase() + preset.slice(1)}
          </button>
        ))}
      </div>
      
      {/* EQ Sliders */}
      <div className="p-3 grid grid-cols-5 gap-2">
        {bands.map((band, index) => (
          <div key={band.freq} className="flex flex-col items-center">
            <span className="text-xs text-white mb-1">{band.freq}</span>
            <input
              type="range"
              min="-6"
              max="6"
              step="1"
              value={eqValues[index]}
              onChange={(e) => handleSliderChange(index, e.target.value)}
              className="h-24 appearance-none bg-gray-800/50 rounded-full overflow-hidden w-1.5 vertical-slider"
              style={{
                WebkitAppearance: 'slider-vertical',
                writingMode: 'bt-lr'
              }}
            />
            <span className="mt-1 text-xs text-gray-400">{eqValues[index]} dB</span>
            <span className="text-xs text-gray-500 mt-1">{band.label}</span>
          </div>
        ))}
      </div>
      
      {/* Toggle visualizer */}
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={() => setShowVisualizer(!showVisualizer)}
          className="text-xs px-3 py-1.5 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700"
        >
          {showVisualizer ? 'Hide Visualizer' : 'Show Visualizer'}
        </button>
      </div>
    </div>
  );
};

export default SimpleEqualizer;