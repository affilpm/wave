// // musicService.js
// let apiInstance = null;

// class EnhancedMusicStreamService {
//   constructor() {
//     this.api = null;
//   }

//   setApiInstance(instance) {
//     apiInstance = instance;
//     this.api = instance.api;
//   }

//   getApi() {
//     if (!this.api) {
//       if (apiInstance) {
//         this.api = apiInstance.api;
//       } else {
//         throw new Error('API instance not initialized. Call setApiInstance first.');
//       }
//     }
//     return this.api;
//   }

//   async streamMusic(musicId, sessionId = null) {
//     try {
//       const response = await this.getApi()({
//         method: 'GET',
//         url: `api/music/${musicId}/stream/`,
//         params: sessionId ? { session_id: sessionId } : {},
//         responseType: 'blob',
//         onDownloadProgress: (progressEvent) => {
//           const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
//           console.log('Download Progress:', percentCompleted);
//         }
//       });

//       const newSessionId = response.headers['x-session-id'];
//       const audioUrl = URL.createObjectURL(response.data);
      
//       return {
//         audioUrl,
//         sessionId: newSessionId,
//         contentLength: response.headers['content-length']
//       };
//     } catch (error) {
//       console.error('Error streaming music:', error);
//       throw error;
//     }
//   }

//   async seekToPosition(musicId, sessionId, position) {
//     if (!sessionId) {
//       throw new Error('Session ID is required for seeking');
//     }

//     try {
//       const bitrate = 128000; // 128kbps
//       const bytePosition = Math.floor((position * bitrate) / 8);
      
//       const response = await this.getApi()({
//         method: 'GET',
//         url: `api/music/${musicId}/stream/`,
//         params: { session_id: sessionId },
//         headers: {
//           Range: `bytes=${bytePosition}-`
//         },
//         responseType: 'blob'
//       });

//       return {
//         audioUrl: URL.createObjectURL(response.data),
//         contentLength: response.headers['content-length']
//       };
//     } catch (error) {
//       console.error('Error seeking in music stream:', error);
//       throw error;
//     }
//   }

//   async updateProgress(sessionId, position, completed = false) {
//     if (!sessionId) return;

//     try {
//       await this.getApi().post('api/music/track-progress/', {
//         session_id: sessionId,
//         position,
//         completed
//       });
//     } catch (error) {
//       console.error('Error updating progress:', error);
//     }
//   }

//   releaseAudioUrl(url) {
//     if (url) {
//       URL.revokeObjectURL(url);
//     }
//   }
// }

// // Create and export service instance
// export const musicStreamService = new EnhancedMusicStreamService();