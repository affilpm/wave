import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setIsPlaying, nextTrack, previousTrack } from '../../../../slices/user/playerSlice';

const MediaSessionControl = ({ currentTrack, audioRef }) => {
  const { isPlaying } = useSelector((state) => state.player);
  const dispatch = useDispatch();
  const hasInteracted = React.useRef(false);

  useEffect(() => {
    const handleUserInteraction = () => {
      hasInteracted.current = true;
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };

    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name,
        artist: currentTrack.artist,
        album: currentTrack.album || '',
        artwork: currentTrack.cover_photo 
          ? [{ src: currentTrack.cover_photo, sizes: '512x512', type: 'image/jpeg' }]
          : []
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (hasInteracted.current) {
          dispatch(setIsPlaying(true));
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        dispatch(setIsPlaying(false));
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        dispatch(previousTrack());  // Remove parentheses
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        dispatch(nextTrack());  // Remove parentheses
      });
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, [currentTrack, dispatch]);

  return null;  // No need to render another audio element
};

export default MediaSessionControl;