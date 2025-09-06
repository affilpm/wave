import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';

const ControlButton = React.memo(({ 
  onClick, 
  disabled, 
  className, 
  title, 
  children 
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={className}
    title={title}
  >
    {children}
  </button>
));

const MusicInfo = React.memo(({ 
  isLoading, 
  musicDetails, 
  currentTrack 
}) => (
  <div className="flex items-center space-x-3 min-w-0 flex-1">
    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 relative">
      {isLoading ? (
        <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <h3 className="text-sm font-semibold text-white truncate">
        {musicDetails.name || currentTrack?.name || 'Unknown Track'}
      </h3>
      <p className="text-xs text-gray-400 truncate">
        {musicDetails.artist || currentTrack?.artist || 'Unknown Artist'}
        {currentTrack?.album && (
          <>
            <span className="mx-1">•</span>
            {currentTrack.album}
          </>
        )}
      </p>
      {isLoading && (
        <p className="text-xs text-blue-400">Loading stream...</p>
      )}
    </div>
  </div>
));

export default ControlButton