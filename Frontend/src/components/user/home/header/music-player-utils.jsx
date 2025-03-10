// music-player-utils.js
import { setMusicId, setIsPlaying, setQueue, clearQueue, setCurrentPlaylistId } from "../../../../slices/user/musicPlayerSlice";

export const prepareTrackForPlayer = (track) => ({
  id: track.id,
  name: track.name,
  artist_name: track.artist?.user?.name || "Unknown Artist", 
  artist_full: track.artist_full,
  cover_photo: track.cover_photo,
  duration: track.duration

});

export const handleSongPlayback = ({ 
  song, 
  sectionId, 
  dispatch, 
  currentState: { musicId, isPlaying }
}) => {
  const formattedTrack = prepareTrackForPlayer(song);
  
  // If clicking the currently playing track, just toggle play/pause
  if (musicId === formattedTrack.id) {
    dispatch(setIsPlaying(!isPlaying));
    return;
  }

  // Playing a new single song (not a playlist)
  console.log(formattedTrack)
  dispatch(clearQueue());
  dispatch(setQueue({
    tracks: [formattedTrack],
    playlistId: null,  // Set to null because we're playing a single song, not a playlist
    artistId: song.artist_id || null
  }));
  dispatch(setMusicId(formattedTrack.id));
  dispatch(setIsPlaying(true));
};

// Create a separate function for playlist playback
export const handlePlaylistPlayback = ({
  playlist,
  startTrackId = null,
  dispatch,
  currentState: { musicId, isPlaying, currentPlaylistId }
}) => {
  const tracks = playlist.tracks.map(prepareTrackForPlayer);
  
  // If this playlist is already playing, just toggle play/pause
  if (currentPlaylistId === playlist.id) {
    dispatch(setIsPlaying(!isPlaying));
    return;
  }
  dispatch(clearQueue());
  dispatch(setQueue({
    tracks: tracks,
    playlistId: playlist.id,
    artistId: null
  }));
  
  // If a specific track ID is provided, start with that track
  if (startTrackId && tracks.some(track => track.id === startTrackId)) {
    dispatch(setMusicId(startTrackId));
  } else {
    // Otherwise start with the first track
    dispatch(setMusicId(tracks[0].id));
  }
  
  dispatch(setIsPlaying(true));
};