import api from "../../../../../api";
import { setQueue, setIsPlaying, togglePlay } from "../../../../../slices/user/playerSlice";
import { prepareTracksForPlayer } from "../../../../../utils/trackUtils";

/**
 * Handles playing/pausing an album from a card.
 */
export const handleAlbumPlaybackAction = async ({ albumId, dispatch, currentState }) => {
  const { currentContext, status } = currentState;
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';
  const isSameContext = currentContext?.type === 'album' && String(currentContext?.id) === String(albumId);

  if (isSameContext) {
    dispatch(togglePlay());
  } else {
    try {
      const response = await api.get(`/api/v1/album/album-data/${albumId}/`);
      const data = response.data;
      const tracks = data.tracks || [];
      
      // Albums usually have tracks with music_details
      const formattedTracks = prepareTracksForPlayer(tracks.map(t => t.music_details || t));

      if (formattedTracks.length > 0) {
        dispatch(setQueue({
          tracks: formattedTracks,
          startIndex: 0,
          context: { type: 'album', id: albumId }
        }));
        dispatch(setIsPlaying(true));
      }
    } catch (error) {
      console.error("Error playing album:", error);
      throw error;
    }
  }
};
