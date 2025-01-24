import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pencil, Globe, Lock, Trash2 } from 'lucide-react';

const PlaylistContextMenu = ({ 
  playlist, 
  onEdit, 
  onTogglePrivacy, 
  onDelete,
  x = 0, 
  y = 0 
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        document.dispatchEvent(new CustomEvent('close-context-menu'));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 rounded-md shadow-lg 
                 bg-neutral-800/95 backdrop-blur-sm 
                 border border-neutral-700 
                 max-h-64 overflow-y-auto 
                 scrollbar-thin scrollbar-thumb-gray-600"
      style={{ 
        top: `${y}px`, 
        left: `${x}px` 
      }}
    >
      <div className="py-1">
        {/* Edit Option */}
        <div
          onClick={() => {
            onEdit();
            document.dispatchEvent(new CustomEvent('close-context-menu'));
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-neutral-700 cursor-pointer"
        >
          <Pencil className="h-4 w-4" />
          <span>Edit details</span>
        </div>

        {/* Toggle Privacy Option */}
        <div
          onClick={() => {
            onTogglePrivacy();
            document.dispatchEvent(new CustomEvent('close-context-menu'));
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-neutral-700 cursor-pointer"
        >
          {playlist.is_public ? (
            <>
              <Lock className="h-4 w-4" />
              <span>Make private</span>
            </>
          ) : (
            <>
              <Globe className="h-4 w-4" />
              <span>Make public</span>
            </>
          )}
        </div>

        {/* Delete Option */}
        <div
          onClick={() => {
            onDelete();
            document.dispatchEvent(new CustomEvent('close-context-menu'));
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-neutral-700 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete playlist</span>
        </div>
      </div>
    </div>
  );
};

// Global context menu hook
export const usePlaylistContextMenu = (playlist, handlers) => {
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      setContextMenu({ 
        x: e.clientX, 
        y: e.clientY 
      });
    };

    const closeContextMenu = () => {
      setContextMenu(null);
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('close-context-menu', closeContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('close-context-menu', closeContextMenu);
    };
  }, []);

  const contextMenuProps = {
    playlist,
    ...handlers,
    x: contextMenu?.x,
    y: contextMenu?.y
  };

  return {
    ContextMenu: contextMenu ? <PlaylistContextMenu {...contextMenuProps} /> : null
  };
};

export default PlaylistContextMenu;