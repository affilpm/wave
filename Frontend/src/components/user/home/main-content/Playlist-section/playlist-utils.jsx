import { setCurrentMusic, setIsPlaying, setQueue, clearQueue } from "../../../../../slices/user/playerSlice";
import api from "../../../../../api";
import { convertToSeconds } from "../../../../../utils/formatters";

export const fetchPlaylistTracks = async (playlistId) => {
  try {
    const response = await api.get(`/api/playlist/playlists/${playlistId}/`);
    console.log(response.data.tracks, 'afds');
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
  const { currentMusicId, isPlaying, queue, currentIndex } = currentState;

  // Check if we're already playing this playlist
  const isCurrentPlaylist = queue.length > 0 && queue.some((track) => Number(track.playlist_id) === Number(playlistId));

  if (isCurrentPlaylist && currentMusicId) {
    // Simply toggle play/pause if it's the same playlist
    dispatch(setIsPlaying(!isPlaying));
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

  const prepareTrackForPlayer = (track) => ({
    id: Number(track.music_details?.id || track.id),
    name: track.music_details?.name || track.name,
    title: track.music_details?.name || track.name,
    artist: track.music_details?.artist_username || track.artist,
    artist_full: track.music_details?.artist_full_name || track.artist_full,
    album: track.music_details?.album_name || "Unknown Album",
    cover_photo: track.music_details?.cover_photo || track.cover_photo,
    audio_file: track.music_details?.audio_file || track.audio_file,
    duration: track.music_details?.duration ? convertToSeconds(track.music_details.duration) : 0,
    genre: track.music_details?.genre || "",
    year: track.music_details?.release_date
      ? new Date(track.music_details.release_date).getFullYear()
      : null,
    release_date: track.music_details?.release_date,
    track_number: track.track_number || 0,
    playlist_id: Number(playlistId),
    playlist_name: resolvedPlaylistName,
  });

  const formattedTracks = playlistTracks.map(prepareTrackForPlayer);

  // Clear existing queue before setting new one
  dispatch(clearQueue());
  dispatch(setQueue(formattedTracks));

  // Set track and start playing immediately without timeout
  if (formattedTracks.length > 0) {
    dispatch(setCurrentMusic(formattedTracks[0]));
    if (startPlaying) {
      dispatch(setIsPlaying(true));
    }
  }
};
