import React from 'react';
import { formatTime } from '../../../../../utils/formatters';

const QueueItem = React.memo(({ 
  track, 
  index, 
  isCurrentTrack, 
  isPlaying, 
  isPastTrack,
  onSelect 
}) => {
  const handleClick = () => {
    onSelect(track);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        p-3 cursor-pointer transition-all duration-200 border-b border-gray-800 last:border-b-0
        ${isCurrentTrack 
          ? 'bg-blue-500/20 border-blue-500/30' 
          : isPastTrack
            ? 'bg-gray-800/50 hover:bg-gray-700/50' 
            : 'hover:bg-gray-800'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Track Number or Playing Indicator */}
          <div className="flex-shrink-0 w-6 flex justify-center">
            {isCurrentTrack && isPlaying ? (
              <div className="w-4 h-4 flex items-center justify-center">
                <svg className="w-3 h-3 text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            ) : isCurrentTrack ? (
              <div className="w-4 h-4 flex items-center justify-center">
                <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              </div>
            ) : (
              <span className={`text-sm ${isPastTrack ? 'text-gray-500' : 'text-gray-400'}`}>
                {index + 1}
              </span>
            )}
          </div>

          {/* Track Info */}
          <div className="min-w-0 flex-1">
            <div className={`font-medium truncate ${
              isCurrentTrack 
                ? 'text-blue-400' 
                : isPastTrack
                  ? 'text-gray-500'
                  : 'text-white'
            }`}>
              {track.name}
            </div>
            <div className={`text-sm truncate ${
              isCurrentTrack 
                ? 'text-blue-300' 
                : isPastTrack
                  ? 'text-gray-600'
                  : 'text-gray-400'
            }`}>
              {track.artist}
            </div>
          </div>
        </div>

        {/* Duration */}
        {track.duration > 0 && (
          <div className={`text-sm flex-shrink-0 ${
            isPastTrack ? 'text-gray-600' : 'text-gray-400'
          }`}>
            {formatTime(track.duration)}
          </div>
        )}
      </div>

      {/* Visual indicator for current track */}
      {isCurrentTrack && (
        <div className="absolute left-0 top-0 w-1 h-full bg-blue-400"></div>
      )}
    </div>
  );
});


QueueItem.displayName = 'QueueItem';

export default QueueItem;