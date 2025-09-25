import React, { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectEqualizerState, setError } from '../../../../../slices/user/equalizerSlice';

const FREQUENCY_BANDS = [
  { key: 'band_31', frequency: 31 },
  { key: 'band_62', frequency: 62 },
  { key: 'band_125', frequency: 125 },
  { key: 'band_250', frequency: 250 },
  { key: 'band_500', frequency: 500 },
  { key: 'band_1k', frequency: 1000 },
  { key: 'band_2k', frequency: 2000 },
  { key: 'band_4k', frequency: 4000 },
  { key: 'band_8k', frequency: 8000 },
  { key: 'band_16k', frequency: 16000 },
];

const AudioEqualizer = ({ audioRef }) => {
  const dispatch = useDispatch();
  const { isEnabled, preset } = useSelector(selectEqualizerState);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
  const filtersRef = useRef([]);
  const isInitializedRef = useRef(false);

  const cleanupAudioContext = useCallback(() => {
    console.log('🧹 Cleaning up audio context...');
    try {
      filtersRef.current.forEach((filter, index) => {
        try {
          filter.disconnect();
        } catch (error) {
          console.warn(`Error disconnecting filter ${index}:`, error);
        }
      });
      filtersRef.current = [];

      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.disconnect();
        } catch (error) {
          console.warn('Error disconnecting gain node:', error);
        }
        gainNodeRef.current = null;
      }

      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (error) {
          console.warn('Error disconnecting source node:', error);
        }
        sourceNodeRef.current = null;
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch((error) => {
          console.warn('Error closing audio context:', error);
        });
        console.log('✅ Audio context closed');
      }
      audioContextRef.current = null;
    } catch (error) {
      console.error('Error during cleanup:', error);
      dispatch(setError(error.message));
    } finally {
      isInitializedRef.current = false;
    }
  }, [dispatch]);

  const initializeAudioContext = useCallback(() => {
    if (!audioRef?.current || isInitializedRef.current) {
      console.log('⚠️ Skipping initialization: audio element not ready or already initialized');
      return false;
    }

    try {
      console.log('🎵 Initializing new audio context...');
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.error('❌ Web Audio API not supported');
        dispatch(setError('Web Audio API not supported'));
        return false;
      }

      const audioContext = new AudioContext();
      let source;
      try {
        source = audioContext.createMediaElementSource(audioRef.current);
        console.log('✅ Media element source created');
      } catch (error) {
        console.error('❌ Failed to create media element source:', error);
        audioContext.close().catch(console.warn);
        dispatch(setError('Failed to create media element source'));
        return false;
      }

      const gainNode = audioContext.createGain();
      const filters = FREQUENCY_BANDS.map(({ frequency }) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = frequency;
        filter.Q.value = 1;
        filter.gain.value = 0;
        return filter;
      });

      let currentNode = source;
      filters.forEach((filter) => {
        currentNode.connect(filter);
        currentNode = filter;
      });
      currentNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      gainNodeRef.current = gainNode;
      filtersRef.current = filters;
      isInitializedRef.current = true;

      console.log('✅ Audio equalizer initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize audio context:', error);
      dispatch(setError(error.message));
      cleanupAudioContext();
      return false;
    }
  }, [audioRef, cleanupAudioContext, dispatch]);

  const applyEqualizerSettings = useCallback(
    (presetData) => {
      if (!filtersRef.current.length || !presetData) {
        console.warn('⚠️ Cannot apply EQ settings: filters not initialized or no preset data');
        return;
      }

      try {
        FREQUENCY_BANDS.forEach(({ key }, index) => {
          const filter = filtersRef.current[index];
          const gainValue = presetData[key] || 0;

          if (filter && typeof gainValue === 'number') {
            if (audioContextRef.current?.state === 'suspended') {
              audioContextRef.current.resume().catch((error) => {
                console.warn('Failed to resume audio context:', error);
                dispatch(setError('Failed to resume audio context'));
              });
            }

            const currentTime = audioContextRef.current.currentTime;
            filter.gain.cancelScheduledValues(currentTime);
            filter.gain.setValueAtTime(filter.gain.value, currentTime);
            filter.gain.linearRampToValueAtTime(gainValue, currentTime + 0.1);
          }
        });

        console.log('✅ Equalizer settings applied:', presetData);
      } catch (error) {
        console.error('❌ Error applying equalizer settings:', error);
        dispatch(setError(error.message));
      }
    },
    [dispatch]
  );

  useEffect(() => {
    if (!audioRef?.current || !isEnabled) return;

    const audio = audioRef.current;

    const handleCanPlay = async () => {
      console.log('🎵 Audio can play, readyState:', audio.readyState);
      if (!isInitializedRef.current) {
        const initialized = initializeAudioContext();
        if (initialized) {
          applyEqualizerSettings(preset);
        }
      }
    };

    const handlePlay = async () => {
      if (audioContextRef.current?.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
          console.log('🔄 Audio context resumed on play');
        } catch (error) {
          console.warn('⚠️ Failed to resume audio context on play:', error);
          dispatch(setError('Failed to resume audio context'));
        }
      }
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);

    if (audio.readyState >= 2) {
      handleCanPlay();
    }

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
    };
  }, [audioRef, isEnabled, initializeAudioContext, preset, applyEqualizerSettings, dispatch]);

  useEffect(() => {
    return () => {
      console.log('🔄 Component unmounting, cleaning up...');
      cleanupAudioContext();
    };
  }, [cleanupAudioContext]);

  useEffect(() => {
    if (isEnabled && isInitializedRef.current) {
      applyEqualizerSettings(preset);
    } else if (!isEnabled && filtersRef.current.length) {
      const flatPreset = Object.fromEntries(FREQUENCY_BANDS.map(({ key }) => [key, 0]));
      applyEqualizerSettings(flatPreset);
    }
  }, [isEnabled, preset, applyEqualizerSettings]);

  return null;
};

export default AudioEqualizer;