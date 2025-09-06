import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { formatTime } from '../../../../../utils/formatters';


const VolumeControls = React.memo(({ 
  currentTime, 
  duration, 
  isMuted, 
  volume, 
  isLoading, 
  onToggleMute, 
  onVolumeChange, 
  onRefreshStream 
}) => (
  <div className="hidden md:flex items-center space-x-3 min-w-0 flex-1 justify-end">
    <div className="flex items-center space-x-2">
      <span className="text-xs text-gray-400 tabular-nums min-w-[2.5rem] text-right">
        {formatTime(currentTime)}
      </span>
      <span className="text-xs text-gray-500">/</span>
      <span className="text-xs text-gray-400 tabular-nums min-w-[2.5rem]">
        {formatTime(duration)}
      </span>
    </div>
    
    <div className="flex items-center space-x-2">
      <button
        onClick={onToggleMute}
        className="p-1 text-gray-400 hover:text-white transition-colors duration-200"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted || volume === 0 ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.23 2.63-.76 3.74-1.58L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        )}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={isMuted ? 0 : volume}
        onChange={onVolumeChange}
        className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        title={`Volume: ${Math.round(volume * 100)}%`}
      />
      <button
        onClick={onRefreshStream}
        disabled={isLoading}
        className="p-1 text-gray-400 hover:text-white transition-colors duration-200 disabled:opacity-50"
        title="Refresh Stream"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
      </button>
    </div>
  </div>
));


export default VolumeControls