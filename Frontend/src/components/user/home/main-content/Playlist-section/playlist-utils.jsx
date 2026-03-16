import { setIsPlaying, setQueue, clearQueue, togglePlay } from "../../../../../slices/user/playerSlice";
import api from "../../../../../api";
import { prepareTracksForPlayer } from "../../../../../utils/trackUtils";

export const fetchPlaylistTracks = async (playlistId) => {
  try {
    const response = await api.get(`/api/v1/playlist/playlists/${playlistId}/`);

    return {
      tracks: response.data.tracks,
      playlistName: response.data.name || "Unknown Playlist",
    };
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    return null;
  }
};

export const handlePlaybackAction = async ({
  tracks,
  playlistId,
  playlistName, 
  dispatch,
  currentState,
  startPlaying = true,
}) => {
  const { currentTrack, status, currentContext } = currentState;
  const context = { type: 'playlist', id: playlistId };
  const isSameContext = currentContext?.type === context.type && String(currentContext?.id) === String(context.id);

  if (isSameContext) {
    dispatch(togglePlay());
    return;
  }

  let playlistTracks = tracks;
  let resolvedPlaylistName = playlistName || "Unknown Playlist";

  if (!playlistTracks) {
    try {
      const result = await fetchPlaylistTracks(playlistId);
      if (!result) {
        console.error('Failed to fetch playlist tracks');
        return;
      }
      playlistTracks = result.tracks;
      resolvedPlaylistName = result.playlistName;
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      return;
    }
  }

  const formattedTracks = prepareTracksForPlayer(playlistTracks);

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
