/**
 * useEqualizer – Connects the Web Audio API to the app's <audio> element,
 * creating 10 peaking BiquadFilterNodes (one per frequency band).
 *
 * The hook reads from Redux's equalizer slice and applies gain values
 * in real-time whenever the preset or individual band values change.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectEqualizerState } from '../slices/user/equalizerSlice';

const BANDS: { key: string; frequency: number }[] = [
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

// Singleton Web Audio context & nodes so that we never double-connect.
let audioCtx: AudioContext | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let filterNodes: BiquadFilterNode[] = [];
let connectedElement: HTMLAudioElement | null = null;

/**
 * Initialise Web Audio context and chain of peaking filters for the given
 * <audio> element. The chain is: source → filter[0] → … → filter[9] → dest.
 */
function ensureAudioGraph(audio: HTMLAudioElement) {
  if (connectedElement === audio && audioCtx && filterNodes.length === BANDS.length) {
    return; // already wired up
  }

  // Tear down any previous graph
  if (audioCtx) {
    try { audioCtx.close(); } catch (_) { /* ignore */ }
  }

  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  sourceNode = audioCtx.createMediaElementSource(audio);

  filterNodes = BANDS.map(({ frequency }) => {
    const f = audioCtx!.createBiquadFilter();
    f.type = 'peaking';
    f.frequency.value = frequency;
    f.Q.value = 1.4; // moderate bandwidth
    f.gain.value = 0;
    return f;
  });

  // Wire the chain
  sourceNode.connect(filterNodes[0]);
  for (let i = 0; i < filterNodes.length - 1; i++) {
    filterNodes[i].connect(filterNodes[i + 1]);
  }
  filterNodes[filterNodes.length - 1].connect(audioCtx.destination);

  connectedElement = audio;
}

export const useEqualizer = (audioRef: React.RefObject<HTMLAudioElement | null>) => {
  const { preset, isEnabled } = useSelector(selectEqualizerState);
  const initialised = useRef(false);

  // Lazily connect to the audio element once it exists
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // We need the audio element to have been created but we don't need
    // it to be playing — waiting for the first play is fine too.
    const tryInit = () => {
      if (initialised.current) return;
      ensureAudioGraph(audio);
      initialised.current = true;
    };

    // Try immediately (player might already be active)
    if (audio.src || audio.currentSrc) {
      tryInit();
    }

    // Also listen for the first play event as a fallback
    const onPlay = () => tryInit();
    audio.addEventListener('play', onPlay, { once: true });

    return () => {
      audio.removeEventListener('play', onPlay);
    };
  }, [audioRef]);

  // Sync gain values whenever the preset or enabled-flag changes
  useEffect(() => {
    if (filterNodes.length !== BANDS.length) return;

    BANDS.forEach(({ key }, i) => {
      const gain = isEnabled ? (preset[key] ?? 0) : 0;
      filterNodes[i].gain.value = gain;
    });
  }, [preset, isEnabled]);

  // Resume AudioContext if it was suspended (browser autoplay policy)
  useEffect(() => {
    if (audioCtx && audioCtx.state === 'suspended') {
      const resume = () => {
        audioCtx?.resume();
        document.removeEventListener('click', resume);
      };
      document.addEventListener('click', resume, { once: true });
    }
  }, []);

  return { audioCtx, filterNodes, BANDS };
};
