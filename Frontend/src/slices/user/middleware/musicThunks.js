//  // musicThunks.js
// import { createAsyncThunk } from '@reduxjs/toolkit';
// import { musicStreamService } from '../../../services/user/musicService';
// import { setCurrentTrack, setIsPlaying, setCurrentSession } from '../playerSlice';

// // Thunk for starting playback
// export const startPlayback = createAsyncThunk(
//   'player/startPlayback',
//   async (track, { dispatch }) => {
//     try {
//       const { audioUrl, sessionId } = await musicStreamService.streamMusic(
//         track.id,
//         track.sessionId
//       );
      
//       // Return enhanced track with streaming info
//       return {
//         ...track,
//         audio_file: audioUrl,
//         sessionId: sessionId
//       };
//     } catch (error) {
//       console.error('Failed to start playback:', error);
//       throw error;
//     }
//   }
// );

// // Thunk for cleaning up audio resources
// export const cleanupAudioResources = createAsyncThunk(
//   'player/cleanupAudioResources',
//   async (url) => {
//     if (url) {
//       musicStreamService.releaseAudioUrl(url);
//     }
//   }
// );

// // Thunk for handling track completion
// export const handleTrackCompletion = createAsyncThunk(
//   'player/handleTrackCompletion',
//   async ({ sessionId, position }, { dispatch }) => {
//     try {
//       await musicStreamService.updateProgress(sessionId, position, true);
//       dispatch(setIsPlaying(false));
//     } catch (error) {
//       console.error('Failed to handle track completion:', error);
//       throw error;
//     }
//   }
// );