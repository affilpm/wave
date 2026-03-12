import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Hls from 'hls.js';
import {
  setStatus,
  setCurrentTime,
  setDuration,
  skipNext,
} from '../slices/user/playerSlice';
import { PlayerState } from '../types/player';

export const useAudioPlayer = () => {
  const dispatch = useDispatch();
  const currentTrack = useSelector((state: { player: PlayerState }) => state.player.currentTrack);
  const status = useSelector((state: { player: PlayerState }) => state.player.status);
  const volume = useSelector((state: { player: PlayerState }) => state.player.volume);
  const isMuted = useSelector((state: { player: PlayerState }) => state.player.isMuted);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Initialize audio element if not present
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const onTimeUpdate = () => dispatch(setCurrentTime(audio.currentTime));
    const onDurationChange = () => dispatch(setDuration(audio.duration));
    const onEnded = () => dispatch(skipNext());
    const onWaiting = () => dispatch(setStatus('buffering'));
    const onPlaying = () => dispatch(setStatus('playing'));
    const onPause = () => dispatch(setStatus('paused'));

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [dispatch]);

  const currentTrackIdRef = useRef(currentTrack?.id);
  useEffect(() => {
    currentTrackIdRef.current = currentTrack?.id;
  }, [currentTrack?.id]);

  // Handle track changes and HLS setup
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    // Check if we have neither hlsUrl nor a fallback trigger
    const waitingForHls = !currentTrack.hlsUrl && !currentTrack.hlsFailed;
    if (waitingForHls) {
      if (status === 'loading') {
        // Prevent audio from playing previous track's end
        audio.pause();
        audio.src = '';
      }
      return;
    }

    const trackIdAtStart = currentTrack.id;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const startPlaying = () => {
      // Final check: is this still the track Redux wants to play?
      if (currentTrackIdRef.current !== trackIdAtStart) return;

      setTimeout(() => {
        if (status === 'loading' || status === 'playing') {
          audio.play().catch(e => {
            if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
              console.error("Playback failed", e);
            }
          });
        }
      }, 50);
    };

    if (currentTrack.hlsUrl && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        startLevel: -1,
        maxBufferLength: 30,
        backBufferLength: 90,
        fragLoadingTimeOut: 20000,
      });

      hlsRef.current = hls;
      hls.loadSource(currentTrack.hlsUrl);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (currentTrackIdRef.current === trackIdAtStart) {
          startPlaying();
          dispatch(setStatus('playing'));
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          dispatch(setStatus('buffering'));
        }
      });
      
    } else if (currentTrack.hlsUrl && audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = currentTrack.hlsUrl;
      audio.load();
      startPlaying();
      dispatch(setStatus('playing'));
    } else if (currentTrack.hlsFailed && currentTrack.audio_file) {
      audio.src = currentTrack.audio_file;
      audio.load();
      startPlaying();
      dispatch(setStatus('playing'));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentTrack?.id, currentTrack?.hlsUrl, currentTrack?.hlsFailed, dispatch]); // Only re-init if core track identity or URL source changes

  // Handle play/pause and specialized Command-based sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (status === 'playing' && audio.paused) {
      audio.play().catch(e => { if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') console.error("Failed to play", e); });
    } else if (status === 'paused' && !audio.paused) {
      audio.pause();
    } else if (status === 'loading') {
       // If status just became loading but currentTrack is same (e.g. restart), seek to 0
       if (Math.abs(audio.currentTime) > 0.1) {
         audio.currentTime = 0;
       }
    } else if (status === 'idle') {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [status, currentTrack?.id]);

  // Handle Volume and Mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const seek = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      dispatch(setCurrentTime(seconds));
    }
  }, [dispatch]);

  return { audioRef, seek };
};
