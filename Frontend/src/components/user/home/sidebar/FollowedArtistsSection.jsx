import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Music } from 'lucide-react';

const FollowedArtistsSection = ({ artists, isSidebarExpanded }) => {
  const navigate = useNavigate();

  // Function to handle navigation to artist page
  const handleArtistClick = (artistId) => {
    navigate(`/artist/${artistId}`);
  };

  // Function to generate colors for artist avatars without profile photos
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  
  const getColor = (username) => {
    // Generate a consistent color index based on the username
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <>
      {isSidebarExpanded && (
        <h3 className="px-2 py-3 text-sm font-semibold text-gray-400">Followed Artists</h3>
      )}
      <div className={`space-y-1 ${isSidebarExpanded ? 'text-base' : 'text-xs'}`}>
        {artists.map((artist) => (
          <div
            key={artist.id}
            onClick={() => handleArtistClick(artist.id)}
            className="group"
          >
            <div className={`
              flex items-center gap-3 p-2 cursor-pointer rounded-md 
              hover:bg-white/10 transition-colors
              ${isSidebarExpanded ? 'text-gray-400 hover:text-white' : 'text-gray-500 justify-center'}
            `}>
              {artist.profile_photo ? (
                <img
                  src={`${import.meta.env.VITE_API_URL}${artist.profile_photo}`}
                  alt={artist.username}
                  className={`rounded-full object-cover ${
                    isSidebarExpanded ? 'w-12 h-12' : 'w-10 h-10'
                  }`}
                />
              ) : (
                <div
                  className={`flex items-center justify-center rounded-full ${getColor(artist.username)} ${
                    isSidebarExpanded ? 'w-12 h-12' : 'w-10 h-10'
                  }`}
                >
                  {artist.username.charAt(0).toUpperCase()}
                </div>
              )}
              {isSidebarExpanded && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate font-medium text-white">{artist.username}</span>
                  <span className="text-sm text-gray-400 truncate">
                    Artist
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default FollowedArtistsSection;