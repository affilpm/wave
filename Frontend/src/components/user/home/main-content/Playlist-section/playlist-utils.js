import api from "../../../../../api";
import { setQueue, setIsPlaying } from "../../../../../slices/user/playerSlice";
import { prepareTracksForPlayer } from "../../../../../utils/trackUtils";

/**
 * Handles playing/pausing a playlist from a card.
 */
export const handlePlaybackAction = async ({ playlistId, dispatch, currentState }) => {
  const { currentContext, status } = currentState;
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';
  const isSameContext = currentContext?.type === 'playlist' && String(currentContext?.id) === String(playlistId);

  if (isSameContext) {
    dispatch(setIsPlaying(!isPlaying));
  } else {
    try {
      const response = await api.get(`/api/v1/playlist/playlists/${playlistId}/`);
      const data = response.data;
      const tracks = data.tracks || [];
      
      const formattedTracks = prepareTracksForPlayer(tracks.map(t => t.music_details || t));

      if (formattedTracks.length > 0) {
        dispatch(setQueue({
          tracks: formattedTracks,
          startIndex: 0,
          context: { type: 'playlist', id: playlistId }
        }));
        dispatch(setIsPlaying(true));
      }
    } catch (error) {
      console.error("Error playing playlist:", error);
      throw error;
    }
  }
};
