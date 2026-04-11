import React, {useState, useRef} from "react";
import { Search, Plus, Library, Heart, Music, ChevronLeft, Check } from 'lucide-react';
import api from "../../../../api";
import { LIBRARY } from "../../../../constants/apiEndpoints";
import { useNavigate } from "react-router-dom";

const SavedPlaylistSection = ({ playlists, isSidebarExpanded, onSavedPlaylistDelete }) => {
    const navigate = useNavigate();
  
    const handleRemove = async (e, playlist) => {
      e.stopPropagation();
      try {
        await api.post(LIBRARY.REMOVE_PLAYLIST, {
          playlist_id: playlist.id
        });
        onSavedPlaylistDelete(playlist);
      } catch (error) {
        console.error('Error removing playlist:', error);
      }
    };
  
    const handlePlaylistClick = (e, id) => {
      navigate(`/saved-playlist/${id}`);
    };

    return (
      <>
        {isSidebarExpanded && (
          <h3 className="px-2 py-3 text-sm font-semibold text-gray-400">Playlists</h3>
        )}
        <div className={`space-y-1 ${isSidebarExpanded ? 'text-base' : 'text-xs'}`}>
          {playlists.map((playlist) => (
            <div
              key={playlist.id || playlist.name}
              onClick={(e) => handlePlaylistClick(e, playlist.id)}
              className="group relative"
            >
              <div className={`
                flex items-center gap-3 p-2 cursor-pointer rounded-md 
                hover:bg-white/10 transition-colors
                ${isSidebarExpanded ? 'text-gray-400 hover:text-white' : 'text-gray-500 justify-center'}
              `}>
                {playlist.icon ? (
                  <div className={`flex items-center justify-center rounded-md ${
                    isSidebarExpanded ? `w-12 h-12 ${playlist.gradient}` : 'w-10 h-10 bg-gray-700'
                  }`}>
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
                  <>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate font-medium text-white">{playlist.name}</span>
                      <span className="text-sm text-gray-400 truncate">
                        Playlist • {playlist.songCount} songs
                      </span>
                    </div>

                    <button 
                      onClick={(e) => handleRemove(e, playlist)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 text-green-500 hover:scale-110 active:scale-95 transition-all rounded-full flex items-center justify-center"
                      title="Remove from Library"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    );
};

export default SavedPlaylistSection;