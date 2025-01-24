import React, { useState } from 'react';
import YourPlaylistSectionMenuModal from './YourPlaylistSectionMenuModal';
import EditPlaylistModal from '../playlist/EditPlaylistModal';
import api from '../../../../api';

const YourPlaylistSectionManager = ({ playlist, onPlaylistUpdate, onPlaylistDelete }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleTogglePrivacy = async () => {
    try {
      const response = await api.patch(`/api/playlist/playlists/${playlist.id}/`, {
        is_public: !playlist.is_public
      });
      
      onPlaylistUpdate({
        ...playlist,
        is_public: response.data.is_public
      });
    } catch (error) {
      console.error('Error toggling playlist privacy:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      try {
        await api.delete(`/api/playlist/playlists/${playlist.id}/`);
        onPlaylistDelete(playlist.id);
      } catch (error) {
        console.error('Error deleting playlist:', error);
      }
    }
  };

  const handleEditPlaylist = (updatedPlaylist) => {
    onPlaylistUpdate(updatedPlaylist);
    setIsEditModalOpen(false);
  };

  return (
    <>
      <YourPlaylistSectionMenuModal 
        playlist={playlist}
        onEdit={() => setIsEditModalOpen(true)}
        onTogglePrivacy={handleTogglePrivacy}
        onDelete={handleDelete}
      />

      <EditPlaylistModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onEditPlaylist={handleEditPlaylist}
        playlist={playlist}
      />
    </>
  );
};

export default YourPlaylistSectionManager;