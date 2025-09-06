import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import QueueItem from './QueueItem';

const QueueOverlay = React.memo(({ 
  showQueue, 
  queue, 
  currentMusicId, 
  isPlaying, 
  onClose, 
  onTrackSelect 
}) => {
  const { isShuffled, currentIndex, shuffleHistory } = useSelector((state) => state.player);

  const displayQueue = useMemo(() => {
    if (!queue.length) return [];

    if (!isShuffled) {
      // Linear playback: show tracks from current index onward
      return queue.slice(currentIndex);
    }

    // Shuffled mode: show only current track and unplayed tracks
    const currentTrack = currentMusicId ? queue.find(track => track.id === currentMusicId) : null;
    const playedIds = new Set(shuffleHistory); // Exclude current track from playedIds
    const remainingTracks = queue.filter(track => !playedIds.has(track.id) && track.id !== currentMusicId);

    // Maintain original order for remaining tracks to avoid random reordering
    return [
      ...(currentTrack ? [currentTrack] : []),
      ...remainingTracks
    ];
  }, [queue, isShuffled, currentMusicId, currentIndex, shuffleHistory]);

  if (!showQueue) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-t-lg shadow-2xl max-h-64 overflow-hidden z-50">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-white font-semibold">
          {isShuffled ? 'Shuffled Queue' : 'Queue'} ({displayQueue.length})
        </h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto max-h-48">
        {displayQueue.length === 0 ? (
          <div className="p-3 text-gray-400 text-center">Queue is empty</div>
        ) : (
          displayQueue.map((track, index) => (
            <QueueItem
              key={track.id}
              track={track}
              index={index}
              isCurrentTrack={track.id === currentMusicId}
              isPlaying={isPlaying}
              onSelect={onTrackSelect}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default QueueOverlay;