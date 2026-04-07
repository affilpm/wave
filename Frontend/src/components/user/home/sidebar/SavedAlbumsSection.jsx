import React from "react";
import { Disc3, MoreVertical, Trash2 } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

const SavedAlbumsSection = ({ albums, isSidebarExpanded, onSavedAlbumRemove }) => {
  const navigate = useNavigate();

  const handleAlbumClick = (e, albumId) => {
    // If the click target or its parent is the menu button, don't navigate
    if (e.target.closest('.album-menu-button')) {
      e.stopPropagation();
      return;
    }
    navigate(`/album/${albumId}`);
  };

  return (
    <>
      {isSidebarExpanded && (
        <h3 className="px-2 py-3 text-sm font-semibold text-gray-400">Albums</h3>
      )}
      <div className={`space-y-1 ${isSidebarExpanded ? 'text-base' : 'text-xs'}`}>
        {albums.map((album) => (
          <div
            key={album.id}
            onClick={(e) => handleAlbumClick(e, album.id)}
            className="group relative"
          >
            <div className={`
              flex items-center gap-3 p-2 cursor-pointer rounded-md 
              hover:bg-white/10 transition-colors
              ${isSidebarExpanded ? 'text-gray-400 hover:text-white' : 'text-gray-500 justify-center'}
            `}>
              {album.cover_photo ? (
                <img
                  src={album.cover_photo}
                  alt={album.name}
                  className={`rounded-md object-cover ${
                    isSidebarExpanded ? 'w-12 h-12' : 'w-10 h-10'
                  }`}
                />
              ) : (
                <div
                  className={`flex items-center justify-center rounded-md bg-gray-700 ${
                    isSidebarExpanded ? 'w-12 h-12' : 'w-10 h-10'
                  }`}
                >
                  <Disc3 className="h-5 w-5 text-gray-400" />
                </div>
              )}
              {isSidebarExpanded && (
                <>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate font-medium text-white">{album.name}</span>
                    <span className="text-sm text-gray-400 truncate">
                      Album • {album.artist_username || 'Unknown Artist'}
                    </span>
                  </div>

                  <div className="album-menu-button">
                    <AlbumMenuButton 
                      album={album}
                      onRemove={onSavedAlbumRemove}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

// Simple context menu for album actions
const AlbumMenuButton = ({ album, onRemove }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-full transition-all"
      >
        <MoreVertical className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-8 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(album);
              setIsOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Remove from Library
          </button>
        </div>
      )}
    </div>
  );
};

export default SavedAlbumsSection;
