import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Hls from 'hls.js';
import {
  setStatus,
  setCurrentTime,
  setDuration,
  skipNext,
  handleTrackEnd,
} from '../slices/user/playerSlice';
import { PlayerState } from '../types/player';
import throttle from 'lodash/throttle';
import { toast } from 'react-toastify';

export const useAudioPlayer = () => {
  const dispatch = useDispatch();
  const currentTrack = useSelector((state: { player: PlayerState }) => state.player.currentTrack);
  const status = useSelector((state: { player: PlayerState }) => state.player.status);
  const volume = useSelector((state: { player: PlayerState }) => state.player.volume);
  const isMuted = useSelector((state: { player: PlayerState }) => state.player.isMuted);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isInitialLoadRef = useRef(true);
  const rehydratedTrackIdRef = useRef<string | number | null>(null);

  // Mark the initial track as rehydrated on mount
  useEffect(() => {
    if (isInitialLoadRef.current && currentTrack?.id) {
      rehydratedTrackIdRef.current = currentTrack.id;
    }
  }, []);

  // Initialize audio element if not present
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const onTimeUpdate = () => {
      const time = audio.currentTime;
      dispatch(setCurrentTime(time));
      // Save to localStorage occasionally
      savePlaybackPos(currentTrackIdRef.current, time);
    };
    const onDurationChange = () => dispatch(setDuration(audio.duration));
    const onEnded = () => dispatch(handleTrackEnd());
    const onWaiting = () => dispatch(setStatus('buffering'));
    const onPlaying = () => dispatch(setStatus('playing'));
    const onPause = () => dispatch(setStatus('paused'));
    const onError = (e: any) => {
      // Ignore errors if they are caused by empty src (intentional during loading/reset)
      if (!audio.src || audio.src === window.location.href || (status === 'loading' && audio.error?.code === 4)) {
        return;
      }
      console.error("Audio element error:", audio.error);
      
      if (audio.error?.code === 2) { // 2 = MEDIA_ERR_NETWORK
         toast.error("Network error during playback. You may be rate limited.");
      } else if (audio.error?.code === 4 && status === 'playing') {
         toast.error("Format not supported or stream unavailable.");
      }
      
      dispatch(setStatus('paused'));
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
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

  /**
   * Helper to attempt playback with retry logic and state synchronization
   */
  const attemptPlay = useCallback(async (retryCount = 1) => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      await audio.play();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Likely a rapid track change, ignore
        return;
      }

      if (error.name === 'NotAllowedError') {
        // Auto-play blocked by browser. Must show "paused" so user can click Play.
        dispatch(setStatus('paused'));
        return;
      }

      if (retryCount > 0 && (error.name === 'NotReadableError' || error.name === 'NetworkError')) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
        return attemptPlay(retryCount - 1);
      }

      dispatch(setStatus('paused'));
    }
  }, [dispatch]);

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
      
      // Don't auto-play if this is the rehydrated track
      if (rehydratedTrackIdRef.current === trackIdAtStart) {
        dispatch(setStatus('paused'));
        return;
      }

      setTimeout(() => {
        if (status === 'loading' || status === 'playing') {
          attemptPlay();
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
          // Check if this is still the rehydrated track
          if (rehydratedTrackIdRef.current === trackIdAtStart) {
            dispatch(setStatus('paused'));
          } else {
            startPlaying();
            dispatch(setStatus('playing'));
          }
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          dispatch(setStatus('buffering'));
        } else {
          // If the network request was aborted mid-flight due to track skip, ignore it
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && data.details === 'manifestLoadError' && data.fatal === false) {
             // Often happens during spam clicking, let it pass
          }

          // Aggressive catch for 429 simply by checking if the structure contains 429
          const stringified = JSON.stringify({ r: data.response, n: data.networkDetails, x: (data as any).xhr });
          if (stringified.includes('429')) {
            toast.error("You are switching tracks too fast! Please wait a moment.", { toastId: 'rate-limit', autoClose: 3000 });
            dispatch(setStatus('paused'));
            return;
          }

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && data.fatal) {
             toast.error("Network error during playback.", { toastId: 'net-err' });
          }

          if (data.fatal) {
            dispatch(setStatus('paused'));
          }
        }
      });
      
    } else if (currentTrack.hlsUrl && audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = currentTrack.hlsUrl;
      audio.load();
      if (rehydratedTrackIdRef.current === trackIdAtStart) {
        dispatch(setStatus('paused'));
      } else {
        startPlaying();
        dispatch(setStatus('playing'));
      }
    } else if (currentTrack.hlsFailed && currentTrack.audio_file) {
      audio.src = currentTrack.audio_file;
      audio.load();
      if (rehydratedTrackIdRef.current === trackIdAtStart) {
        dispatch(setStatus('paused'));
      } else {
        startPlaying();
        dispatch(setStatus('playing'));
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentTrack?.id, currentTrack?.hlsUrl, currentTrack?.hlsFailed, dispatch, attemptPlay]);

  // Handle play/pause sync and loading state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (status === 'playing') {
      // If user explicitly plays, clear rehydration lock
      if (rehydratedTrackIdRef.current === currentTrack.id) {
        rehydratedTrackIdRef.current = null;
      }
      if (audio.paused) {
        attemptPlay();
      }
    } else if (status === 'paused') {
      if (!audio.paused) {
        audio.pause();
      }
    } else if (status === 'loading') {
       // Also clear lock on new explicit loads
       if (rehydratedTrackIdRef.current && rehydratedTrackIdRef.current !== currentTrack.id) {
         rehydratedTrackIdRef.current = null;
       }
       // Reset and play for Loading state (important for Repeat One)
       audio.currentTime = 0;
       attemptPlay();
    } else if (status === 'idle') {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [status, currentTrack?.id, attemptPlay]);

  // Periodic Stale Sync Check (Every 2 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || !currentTrack) return;

      // If status says playing but audio is stalled/paused without intention
      if (status === 'playing' && audio.paused && !audio.seeking && audio.readyState >= 2) {
        attemptPlay();
      }
      
      // If status says paused but audio is still playing
      if (status === 'paused' && !audio.paused) {
        audio.pause();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, currentTrack, attemptPlay]);

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
      savePlaybackPos(currentTrackIdRef.current, seconds);
    }
  }, [dispatch]);

  // Throttled persistence helper
  const savePlaybackPos = useCallback(
    throttle((trackId: string | number | undefined, time: number) => {
      if (!trackId) return;
      try {
        localStorage.setItem(`playback_pos_${trackId}`, String(time));
      } catch (e) {
        console.warn("Failed to save playback position", e);
      }
    }, 2000),
    []
  );

  // Restore progress on mount/track change
  useEffect(() => {
    if (currentTrack && audioRef.current && isInitialLoadRef.current) {
      const savedPos = localStorage.getItem(`playback_pos_${currentTrack.id}`);
      if (savedPos) {
        const time = parseFloat(savedPos);
        if (time > 0 && time < (currentTrack.duration || Infinity)) {
          audioRef.current.currentTime = time;
          dispatch(setCurrentTime(time));
        }
      }
      isInitialLoadRef.current = false;
    }
  }, [currentTrack?.id, dispatch]);

  return { audioRef, seek };
};
