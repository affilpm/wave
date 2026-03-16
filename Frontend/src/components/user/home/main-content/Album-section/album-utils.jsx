import {
  setIsPlaying,
  setQueue,
  clearQueue,
  togglePlay,
} from "../../../../../slices/user/playerSlice";
import api from "../../../../../api";
import { prepareTracksForPlayer } from "../../../../../utils/trackUtils";


// Fetch album tracks and metadata
export const fetchAlbumTracks = async (albumId) => {
  try {
    const response = await api.get(`/api/v1/album/album_data/${albumId}/`);
    return {
      tracks: response.data.tracks || [],
      name: response.data.name || "Unknown Album",
    };
  } catch (error) {
    console.error("Error fetching album tracks:", error);
    return null; // Return null to allow AlbumSection to handle gracefully
  }
};

// Handle album playback action
export const handleAlbumPlaybackAction = async ({
  albumId,
  dispatch,
  currentState,
  startPlaying = true,
}) => {
  const { currentTrack, status, currentContext } = currentState;
  const context = { type: 'album', id: albumId };
  const isSameContext = currentContext?.type === context.type && String(currentContext?.id) === String(context.id);

  if (isSameContext) {
    dispatch(togglePlay());
    return;
  }

  // Fetch album tracks
  const albumData = await fetchAlbumTracks(albumId);
  if (!albumData || !albumData.tracks.length) {
    console.error("No tracks found for album");
    return;
  }

  // Format tracks for player
  const formattedTracks = prepareTracksForPlayer(albumData.tracks);

  // Clear existing queue and set new queue
  dispatch(clearQueue());
  dispatch(setQueue({
    tracks: formattedTracks,
    startIndex: 0,
    context: context
  }));

  if (startPlaying) {
    dispatch(setIsPlaying(true));
  }
};