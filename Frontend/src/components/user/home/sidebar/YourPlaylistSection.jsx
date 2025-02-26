import React from 'react'
import YourPlaylistSectionManager from './YourPlaylistSectionManager';

const YourPlaylistSection = ({ 
    title, 
    playlists, 
    isSidebarExpanded, 
    onPlaylistUpdate, 
    onPlaylistDelete, 
    onPlaylistClick 
  }) => (
    <>
      {isSidebarExpanded && (
        <h3 className="px-2 py-3 text-sm font-semibold text-gray-400">{title}</h3>
      )}
      <div className={`space-y-1 ${isSidebarExpanded ? 'text-base' : 'text-xs'}`}>
        {playlists.map((playlist) => (
          <div
            key={playlist.id || playlist.name}
            className="group relative"
          >
            <div 
              onClick={(e) => {
                // Prevent playlist click if PlaylistManager elements are clicked
                if (e.target.closest('.playlist-manager-button, .playlist-manager-menu')) {
                  e.stopPropagation();
                  return;
                }
                onPlaylistClick(playlist.id);
              }}
              className={`
                flex items-center gap-3 p-2 cursor-pointer rounded-md 
                hover:bg-white/10 transition-colors
                ${isSidebarExpanded ? 'text-gray-400 hover:text-white' : 'text-gray-500 justify-center'}
              `}
            >
              {playlist.icon ? (
                <div
                  className={`flex items-center justify-center rounded-md ${
                    isSidebarExpanded
                      ? `w-12 h-12 ${playlist.gradient}`
                      : 'w-10 h-10 bg-gray-700'
                  }`}
                >
                  {playlist.icon}
                </div>
              ) : (
                <img
                  src={playlist.image}
                  alt={playlist.name}
                  className={`rounded-md object-cover ${
                    isSidebarExpanded ? 'w-12 h-12' : 'w-10 h-10'
                  }`}
                />
              )}
              {isSidebarExpanded && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate font-medium text-white">{playlist.name}</span>
                  <span className="text-sm text-gray-400 truncate">
                    {playlist.type} • {playlist.songCount} songs
                  </span>
                </div>
              )}
              
              {isSidebarExpanded && playlist.name !== 'Liked Songs' && (
                <div className="playlist-manager-button">
                  <YourPlaylistSectionManager 
                    playlist={playlist}
                    onPlaylistUpdate={onPlaylistUpdate}
                    onPlaylistDelete={onPlaylistDelete}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );

export default YourPlaylistSection