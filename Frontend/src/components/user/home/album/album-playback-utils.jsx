import {   
    setMusicId,
    setIsPlaying,
    setQueue,
    clearQueue,
  } from "../../../../slices/user/musicPlayerSlice";
  
  import api from "../../../../api";
  
  // Transform track data for player based on the exact structure provided
  export const prepareTrackForPlayer = (track) => {
    // Handle nested music_details structure from album tracks
    if (track.music_details) {
      return {
        id: Number(track.id),               // Using track.id as the track identifier
        musicId: Number(track.music_details.id), // Store the actual music ID separately
        name: track.music_details.name,
        artist: track.music_details.artist_username,
        artist_full: track.music_details.artist_full_name,
        cover_photo: track.music_details.cover_photo,
        audio_file: track.music_details.audio_file,
        duration: track.music_details.duration,
        release_date: track.music_details.release_date
      };
    }
    
    // Handle flat structure (if coming from a different endpoint)
    return {
      id: Number(track.id),
      name: track.name,
      artist: track.artist_username,
      artist_full: track.artist_full_name,
      cover_photo: track.cover_photo,
      audio_file: track.audio_file,
      duration: track.duration,
      release_date: track.release_date
    };
  };
  
  export const fetchAlbumTracks = async (albumId) => {
    try {
      const response = await api.get(`/api/album/album_data/${albumId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching album tracks:', error);
      return null;
    }
  };
  
  export const handleAlbumPlaybackAction = async ({
    albumId,
    dispatch,
    currentState,
    startPlaying = true
  }) => {
    const { musicId, isPlaying, currentPlaylistId } = currentState;
  
    // Check if we're already playing this album
    const isCurrentAlbum = Number(albumId) === Number(currentPlaylistId);
    
    if (isCurrentAlbum && musicId) {
      // Simply toggle play/pause if it's the same album
      dispatch(setIsPlaying(!isPlaying));
      return;
    }
  
    try {
      // Fetch album data including tracks
      const albumData = await fetchAlbumTracks(albumId);
      if (!albumData || !albumData.tracks || !albumData.tracks.length) {
        console.error('No tracks found for album');
        return;
      }
  
      // Format tracks consistently
      const formattedTracks = albumData.tracks.map(track => {
        const formattedTrack = prepareTrackForPlayer(track);
        // Important: Make sure we're using the correct ID for the music player
        // This should be the music_details.id, not the track.id
        return {
          ...formattedTrack,
          id: Number(track.music_details.id)  // This is crucial - use the actual music ID
        };
      });
      
      // Clear existing queue and set new queue
      dispatch(clearQueue());
      dispatch(setQueue({ 
        tracks: formattedTracks,
        playlistId: Number(albumId)
      }));
      
      // Set the first track and start playing
      if (formattedTracks.length > 0) {
        dispatch(setMusicId(formattedTracks[0].id));
        if (startPlaying) {
          dispatch(setIsPlaying(true));
        }
      }
    } catch (error) {
      console.error('Error in album playback:', error);
    }
  };