// import React from 'react';
// import { Play, Pause } from "lucide-react";
// import { useDispatch, useSelector } from 'react-redux';
// import { 
//   setMusicId,
//   setIsPlaying,
//   setQueue,
//   clearQueue,
//   toggleShuffle
// } from "../../../../slices/user/musicPlayerSlice";

// const PlaylistPlayButton = ({ 
//   playlist,
//   size = 'large',
//   className = '',
//   showShuffleButton = false
// }) => {
//   const dispatch = useDispatch();
//   const { musicId, isPlaying, currentPlaylistId, shuffle } = useSelector((state) => state.musicPlayer);

//   // Helper to transform track data for the player - using the same format as PlaylistPage
//   const prepareTrackForPlayer = (track) => ({
//     id: track.music_details.id,
//     name: track.music_details.name,
//     artist: track.music_details.artist_username,
//     artist_full: track.music_details.artist_full_name,
//     cover_photo: track.music_details.cover_photo,
//     audio_file: track.music_details.audio_file,
//     duration: track.music_details.duration
//   });

//   // Check if the current track is from this playlist - same logic as PlaylistPage
//   const isCurrentTrackFromPlaylist = () => {
//     if (!playlist?.tracks || !musicId) return false;
    
//     // Check if current playlist ID matches
//     if (currentPlaylistId !== playlist.id) return false;
    
//     // Check if current track exists in playlist
//     return playlist.tracks.some(track => track.music_details.id === musicId);
//   };

//   // Handle playing the entire playlist - same logic as PlaylistPage handlePlayPlaylist
//   const handlePlayPlaylist = () => {
//     if (!playlist?.tracks?.length) return;

//     // Check if we're already playing this playlist
//     if (isCurrentTrackFromPlaylist()) {
//       // Just toggle play state if it's the same playlist
//       dispatch(setIsPlaying(!isPlaying));
//       return;
//     }

//     // This is a new playlist or a reset - load it
//     const formattedTracks = playlist.tracks.map(prepareTrackForPlayer);
    
//     // Clear existing queue and set new one
//     dispatch(clearQueue());
//     dispatch(setQueue({ 
//       tracks: formattedTracks,
//       playlistId: playlist.id 
//     }));
    
//     // Set the first track and start playing
//     if (formattedTracks.length > 0) {
//       dispatch(setMusicId(formattedTracks[0].id));
//       dispatch(setIsPlaying(true));
//     }
//   };

//   // Handle shuffle functionality - similar to PlaylistPage
//   const handleShuffle = (e) => {
//     e.stopPropagation(); // Prevent triggering the main button
    
//     // Toggle shuffle state
//     dispatch(toggleShuffle());
    
//     // If a playlist exists and not playing, start playing
//     if (playlist?.tracks?.length && !isPlaying) {
//       const formattedTracks = playlist.tracks.map(prepareTrackForPlayer);
      
//       // Update queue if not currently playing this playlist
//       if (currentPlaylistId !== playlist.id) {
//         dispatch(clearQueue());
//         dispatch(setQueue({ 
//           tracks: formattedTracks,
//           playlistId: playlist.id 
//         }));
//       }
      
//       // Start playing if not already
//       dispatch(setIsPlaying(true));
//     }
//   };

//   // Button sizes based on the size prop
//   const buttonSizes = {
//     large: 'w-14 h-14',
//     medium: 'w-12 h-12',
//     small: 'w-10 h-10'
//   };

//   // Icon sizes based on the size prop
//   const iconSizes = {
//     large: 'h-6 w-6',
//     medium: 'h-5 w-5',
//     small: 'h-4 w-4'
//   };

//   const buttonSize = buttonSizes[size] || buttonSizes.large;
//   const iconSize = iconSizes[size] || iconSizes.large;
  
//   const isCurrentAndPlaying = isCurrentTrackFromPlaylist() && isPlaying;

//   return (
//     <div className="flex items-center gap-3">
//       <button
//         className={`rounded-full flex items-center justify-center shadow-xl transition-all bg-green-500 hover:bg-green-400 ${buttonSize} ${className}`}
//         onClick={handlePlayPlaylist}
//         aria-label={isCurrentAndPlaying ? "Pause playlist" : "Play playlist"}
//       >
//         {isCurrentAndPlaying ? (
//           <Pause className={`${iconSize} text-black`} />
//         ) : (
//           <Play className={`${iconSize} text-black ml-1`} />
//         )}
//       </button>

//       {showShuffleButton && (
//         <button
//           className={`p-2 rounded-full text-gray-400 hover:text-white transition-colors ${
//             shuffle ? "text-green-500" : ""
//           }`}
//           onClick={handleShuffle}
//           aria-label="Shuffle playlist"
//         >
//           <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//             <path d="M18 4l3 3-3 3M18 20l3-3-3-3M2 12h16M4 19h4M4 5h8" strokeLinecap="round" strokeLinejoin="round" />
//           </svg>
//         </button>
//       )}
//     </div>
//   );
// };

// export default PlaylistPlayButton;