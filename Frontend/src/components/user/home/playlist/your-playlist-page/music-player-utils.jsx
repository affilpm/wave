import React from "react";
// Shared utility functions for music playback
import {   
  setMusicId,
  setIsPlaying,
  setChangeComplete,
  setQueue,
  addToQueue,
  removeFromQueue,
  clearQueue,
  playNext,
  playPrevious,
  toggleShuffle,
  setRepeat,
  moveTrack,
  markAsPlayed,
  setCurrentPlaylistId
 } from "../../../../../slices/user/musicPlayerSlice";

import api from "../../../../../api";

export const fetchPlaylistTracks = async (playlistId) => {
  try {
    const response = await api.get(`/api/playlist/playlists/${playlistId}/`);
    console.log(response.data.tracks,'afds')

    return response.data.tracks;
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    return null;
  }
};
export const handlePlaybackAction = async ({
  tracks,
  playlistId,
  dispatch,
  currentState,
  startPlaying = true
}) => {
  const { musicId, isPlaying, queue, currentPlaylistId } = currentState;

  // Check if we're already playing this playlist
  const isCurrentPlaylist = playlistId === currentPlaylistId;
  
  if (isCurrentPlaylist && musicId) {
    // Simply toggle play/pause if it's the same playlist
    dispatch(setIsPlaying(!isPlaying));
    return;
  }

  // Always fetch fresh track data when not provided
  let playlistTracks = tracks;
  if (!playlistTracks) {
    try {
      const response = await api.get(`/api/playlist/playlists/${playlistId}/`);
      playlistTracks = response.data.tracks;
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      return;
    }
  }

  const prepareTrackForPlayer = (track) => ({
    id: track.music_details?.id || track.id,
    name: track.music_details?.name || track.name,
    artist: track.music_details?.artist_username || track.artist,
    artist_full: track.music_details?.artist_full_name || track.artist_full,
    cover_photo: track.music_details?.cover_photo || track.cover_photo,
    audio_file: track.music_details?.audio_file || track.audio_file,
    duration: track.music_details?.duration || track.duration
  });

  const formattedTracks = playlistTracks.map(prepareTrackForPlayer);

  // Clear existing queue before setting new one
  dispatch(clearQueue());
  
  // Set current playlist ID first
  dispatch(setCurrentPlaylistId(playlistId));
  
  // Set up the new queue
  dispatch(setQueue({ 
    tracks: formattedTracks,
    playlistId 
  }));

  // Start playback with slight delay to ensure state updates are complete
  setTimeout(() => {
    dispatch(setMusicId(formattedTracks[0].id));
    if (startPlaying) {
      dispatch(setIsPlaying(true));
    }
  }, 100);
};