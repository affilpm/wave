// LikedSongsPlaceholder.jsx
import React from 'react';

const LikedSongsPlaceholder = ({ size = 192 }) => {
  return (
    <div 
      className="bg-gradient-to-br from-purple-700 to-blue-900 rounded-lg flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <div className="text-white font-bold text-xl md:text-2xl mb-2">
          Liked
        </div>
        <div className="text-white font-bold text-xl md:text-2xl">
          Songs
        </div>
      </div>
    </div>
  );
};

export default LikedSongsPlaceholder;