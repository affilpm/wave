import {
  setCurrentMusic,
  setIsPlaying,
  setQueue,
  clearQueue,
} from "../../../../../slices/user/playerSlice";
import api from "../../../../../api";

// Utility function to convert duration to seconds (aligned with AlbumSection)
const convertToSeconds = (duration) => {
  if (!duration) return 0;
  const [hours = 0, minutes = 0, seconds = 0] = duration.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

// Transform track data for player, aligned with AlbumSection's expectations
export const prepareTrackForPlayer = (track, albumId, albumName) => {
  const details = track.music_details || track; // Handle nested or flat structure
  return {
    id: Number(details.id), // Use music_details.id or track.id
    name: details.name || "Unknown Track",
    title: details.name || "Unknown Track", // Include title for consistency
    artist: details.artist_username || "Unknown Artist",
    artist_full: details.artist_full_name || details.artist_username || "Unknown Artist",
    album: Number(albumId), // Set album field to match item.id in isItemPlaying
    cover_photo: details.cover_photo || "/api/placeholder/192/192",
    audio_file: details.audio_file || "", // Ensure audio_file is included
    duration: details.duration ? convertToSeconds(details.duration) : 0,
    genre: details.genre || "",
    year: details.release_date ? new Date(details.release_date).getFullYear() : null,
    release_date: details.release_date || null,
    track_number: track.track_number || 0,
    album_id: Number(albumId) || null, // Include for consistency
    album_name: albumName || "Unknown Album",
  };
};

// Fetch album tracks and metadata
export const fetchAlbumTracks = async (albumId) => {
  try {
    const response = await api.get(`/api/album/album_data/${albumId}/`);
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
  const { currentMusicId, isPlaying, queue, currentIndex } = currentState;

  // Check if we're already playing this album
  const currentTrack = queue[currentIndex];
  const isCurrentAlbum =
    currentTrack &&
    currentTrack.album === Number(albumId) &&
    currentTrack.id === currentMusicId;

  if (isCurrentAlbum) {
    // Toggle play/pause if it's the same album
    dispatch(setIsPlaying(!isPlaying));
    return;
  }

  // Fetch album tracks
  const albumData = await fetchAlbumTracks(albumId);
  if (!albumData || !albumData.tracks.length) {
    console.error("No tracks found for album");
    return;
  }

  // Format tracks for player
  const formattedTracks = albumData.tracks.map((track) =>
    prepareTrackForPlayer(track, albumId, albumData.name)
  );

  // Clear existing queue and set new queue
  dispatch(clearQueue());
  dispatch(setQueue(formattedTracks));

  // Set the first track and start playing
  if (formattedTracks.length > 0) {
    dispatch(setCurrentMusic(formattedTracks[0]));
    if (startPlaying) {
      dispatch(setIsPlaying(true));
    }
  }
};