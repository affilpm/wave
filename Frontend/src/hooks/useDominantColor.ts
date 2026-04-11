import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setDominantColor } from '../slices/user/playerSlice';

/**
 * Hook to manage the player's accent color.
 * Standardized to a fixed brand purple for consistency across all tracks.
 */
export const useDominantColor = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Standard brand purple accent
    const BRAND_PURPLE = '#a855f7';

    // Update Redux state
    dispatch(setDominantColor(BRAND_PURPLE));
    
    // Update CSS variables for the UI
    document.documentElement.style.setProperty('--player-accent', BRAND_PURPLE);
    
    // Ensure smooth transition rules exist for color changes (e.g. on mount/theme toggle)
    document.documentElement.style.setProperty('--player-accent-transition', 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)');
  }, [dispatch]);
};
