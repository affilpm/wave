import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PlayerState } from '../types/player';
import { resume, pause, skipNext, skipPrevious, setCurrentTime } from '../slices/user/playerSlice';

export const useMediaSession = (seekFn: (time: number) => void) => {
  const dispatch = useDispatch();
  const currentTrack = useSelector((state: { player: PlayerState }) => state.player.currentTrack);
  const status = useSelector((state: { player: PlayerState }) => state.player.status);

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      const artworkSrc = currentTrack.artworkUrl || currentTrack.cover_photo || '';
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name || currentTrack.title || 'Unknown Track',
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || '',
        artwork: artworkSrc ? [{ src: artworkSrc, sizes: '512x512', type: 'image/jpeg' }] : []
      });

      navigator.mediaSession.setActionHandler('play', () => dispatch(resume()));
      navigator.mediaSession.setActionHandler('pause', () => dispatch(pause()));
      navigator.mediaSession.setActionHandler('nexttrack', () => dispatch(skipNext()));
      navigator.mediaSession.setActionHandler('previoustrack', () => dispatch(skipPrevious()));
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          seekFn(details.seekTime);
        }
      });
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [currentTrack, dispatch, seekFn]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = status === 'playing' ? 'playing' : status === 'paused' ? 'paused' : 'none';
    }
  }, [status]);
};
