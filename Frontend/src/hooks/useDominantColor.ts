import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FastAverageColor } from 'fast-average-color';
import { setDominantColor } from '../slices/user/playerSlice';
import { PlayerState } from '../types/player';

const fac = new FastAverageColor();

function darkenColor(hex: string, percent: number): string {
  // Convert hex to RGB
  let [r, g, b] = [0, 0, 0];
  if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }

  // Darken
  r = Math.floor(r * (1 - percent));
  g = Math.floor(g * (1 - percent));
  b = Math.floor(b * (1 - percent));

  // Convert back to hex
  const toHex = (n: number) => {
    const s = n.toString(16);
    return s.length === 1 ? '0' + s : s;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const useDominantColor = () => {
  const dispatch = useDispatch();
  const currentTrack = useSelector((state: { player: PlayerState }) => state.player.currentTrack);
  const artworkUrl = currentTrack?.artworkUrl || currentTrack?.cover_photo;

  useEffect(() => {
    // Default blue accent
    const DEFAULT_BLUE = '#3b82f6';

    const fallbackToDefault = () => {
      dispatch(setDominantColor(DEFAULT_BLUE));
      document.documentElement.style.setProperty('--player-accent', DEFAULT_BLUE);
    };

    if (!artworkUrl || artworkUrl.includes('placeholder')) {
      fallbackToDefault();
      return;
    }

    fac.getColorAsync(artworkUrl, { algorithm: 'dominant' })
      .then(color => {
        const darkened = darkenColor(color.hex, 0.20);
        dispatch(setDominantColor(darkened));
        document.documentElement.style.setProperty('--player-accent', darkened);
        
        // Ensure smooth transition rules exist globally for color changes
        document.documentElement.style.setProperty('transition', 'all 600ms ease');
      })
      .catch(e => {
        console.warn('Failed to extract dominant color:', e);
        fallbackToDefault();
      });
  }, [artworkUrl, dispatch]);
};
