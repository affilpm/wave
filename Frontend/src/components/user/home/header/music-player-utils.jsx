// music-player-utils.js
import { setMusicId, setIsPlaying, setQueue, clearQueue, setCurrentPlaylistId } from "../../../../slices/user/musicPlayerSlice";

export const prepareTrackForPlayer = (track) => ({
  id: track.id,
  name: track.name,
  artist: track.artist,
  artist_full: track.artist_full,
  cover_photo: track.cover_photo,
  audio_file: track.audio_file,
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

  // Playing a new track
  dispatch(clearQueue());
  dispatch(setQueue({
    tracks: [formattedTrack],
    playlistId: sectionId
  }));
  dispatch(setCurrentPlaylistId(sectionId));
  dispatch(setMusicId(formattedTrack.id));
  dispatch(setIsPlaying(true));
};