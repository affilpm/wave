import React, {useState} from "react";
import { Search, Plus, Library, Heart, Music, ChevronLeft, MoreVertical, Share2, Delete, Edit } from 'lucide-react';
import api from "../../../../api";
import SavedPlaylistSectionMenuModal from "./SavedPlaylistSectionMenuModal";
import { useNavigate } from "react-router-dom";

const SavedPlaylistSection = ({ playlists, isSidebarExpanded, setLibraryPlaylists }) => {
    const [activeMenu, setActiveMenu] = useState(null);
  const navigate = useNavigate();
    const handleMenuAction = async (e, action, playlist) => {
      e.stopPropagation();
      setActiveMenu(null);
  
      if (action === 'delete') {
        try {
          await api.post('/api/library/remove_playlist/', {
            playlist_id: playlist.id
          });
          setLibraryPlaylists(prev => prev.filter(p => p.id !== playlist.id));
        } catch (error) {
          console.error('Error removing playlist:', error);
        }
      }
    };
  
    const handleMenuClick = (e, playlistId) => {
      e.stopPropagation();
      setActiveMenu(activeMenu === playlistId ? null : playlistId);
    };
  
    const handlesPlaylistClick = (id) => {
      navigate(`/saved-playlist/${id}`);
    };
    return (
      <>
        {isSidebarExpanded && (
          <h3 className="px-2 py-3 text-sm font-semibold text-gray-400">Saved Playlists</h3>
        )}
        <div className={`space-y-1 ${isSidebarExpanded ? 'text-base' : 'text-xs'}`}>
          {playlists.map((playlist) => (
            <div
              key={playlist.id || playlist.name}
              onClick={() => handlesPlaylistClick(playlist.id)}
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
                      onClick={(e) => handleMenuClick(e, playlist.id)}
                      className="p-1 rounded-full hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-400" />
                    </button>
                  </>
                )}
              </div>
              <SavedPlaylistSectionMenuModal
                activeMenu={activeMenu} 
                playlist={playlist} 
                handleMenuAction={handleMenuAction} 

              />
            </div>
          ))}
        </div>
      </>
    );
  };
  
  export default SavedPlaylistSection;