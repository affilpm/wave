// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import api from '../../../../api';

// const LibrarySection = ({ isSidebarExpanded }) => {
//   const [libraryPlaylists, setLibraryPlaylists] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);
  
//   const navigate = useNavigate();

//   useEffect(() => {
//     const fetchLibraryPlaylists = async () => {
//       try {
//         const response = await api.get('/api/library/playlists/');
//         const formattedPlaylists = response.data.map(playlist => ({
//           id: playlist.id,
//           name: playlist.name,
//           image: playlist.cover_photo || "/api/placeholder/40/40",
//           songCount: playlist.tracks?.length || 0,
//           type: 'Added Playlist',
//           description: playlist.description,
//           isPublic: playlist.is_public
//         }));
        
//         setLibraryPlaylists(formattedPlaylists);
//       } catch (err) {
//         console.error('Error fetching library playlists:', err);
//         setError('Failed to load library playlists');
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchLibraryPlaylists();
//   }, []);

//   const handlePlaylistClick = (playlistId) => {
//     navigate(`/playlist/${playlistId}`);
//   };

//   if (isLoading) {
//     return <div className="text-gray-400 text-center py-4">Loading library playlists...</div>;
//   }

//   if (error) {
//     return <div className="text-red-400 text-center py-4">{error}</div>;
//   }

//   if (libraryPlaylists.length === 0) {
//     return null;
//   }

//   return (
//     <>
//       {isSidebarExpanded && (
//         <h3 className="px-2 py-3 text-sm font-semibold text-gray-400">Added to Library</h3>
//       )}
//       <div className={`space-y-1 ${isSidebarExpanded ? 'text-base' : 'text-xs'}`}>
//         {libraryPlaylists.map((playlist) => (
//           <div
//             key={playlist.id}
//             onClick={() => handlePlaylistClick(playlist.id)}
//             className="group"
//           >
//             <div className={`
//               flex items-center gap-3 p-2 cursor-pointer rounded-md 
//               hover:bg-white/10 transition-colors
//               ${isSidebarExpanded ? 'text-gray-400 hover:text-white' : 'text-gray-500 justify-center'}
//             `}>
//               <img
//                 src={playlist.image}
//                 alt={playlist.name}
//                 className={`rounded-md object-cover ${
//                   isSidebarExpanded ? 'w-12 h-12' : 'w-10 h-10'
//                 }`}
//               />
//               {isSidebarExpanded && (
//                 <div className="flex flex-col min-w-0 flex-1">
//                   <span className="truncate font-medium text-white">:DFVBERTBTERBT{playlist.name}</span>
//                   <span className="text-sm text-gray-400 truncate">
//                     {playlist.type} • {playlist.songCount} songs:
//                   </span>
//                   :
//                 </div>
//               )}
//             </div>
//           </div>
//         ))}
//       </div>
//     </>
//   );
// };

// export default LibrarySection;