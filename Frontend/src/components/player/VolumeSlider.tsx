import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface VolumeSliderProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute
}) => {
  const currentVol = isMuted ? 0 : volume;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  return (
    <div className="flex items-center space-x-3 w-full mt-6 opacity-80 hover:opacity-100 transition-opacity">
      <button onClick={onToggleMute} className="text-white/50 hover:text-white transition group focus:outline-none">
        {isMuted || volume === 0 ? (
          <VolumeX className="w-5 h-5 group-active:scale-90 transition-transform" />
        ) : (
          <Volume2 className="w-5 h-5 group-active:scale-90 transition-transform" />
        )}
      </button>
      
      <div className="relative flex-1 h-1 group cursor-pointer flex items-center">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={currentVol}
          onChange={handleChange}
          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="w-full h-1 bg-white/10 rounded-full flex overflow-hidden">
          <div 
            className="h-full bg-white rounded-full"
            style={{ width: `${currentVol * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
