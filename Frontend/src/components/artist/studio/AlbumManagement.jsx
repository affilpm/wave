import React, { useState, useEffect } from 'react';
import { PenSquare, Trash2, Search, AlertCircle, Eye, EyeOff, ToggleLeftIcon } from 'lucide-react';
import api from '../../../api';
import { useNavigate } from 'react-router-dom';
import Modal from '../../modal';
import EditAlbum from './EditAlbum';
const AlbumManagement = () => {
    const [albums, setAlbums] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [selectedAlbumId, setSelectedAlbumId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    // Fetch albums
    const fetchAlbums = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/album/albums');
        setAlbums(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch albums');
        console.error('Error fetching albums:', err);
        setAlbums([]);
      } finally {
        setLoading(false);
      }
    };
  
    useEffect(() => {
      fetchAlbums();
    }, []);
  
    const handleEditAlbum = async (albumId) => {
      try {
        const response = await api.get(`/api/album/albums/${albumId}/`);
        setSelectedAlbum(response.data);
        setIsEditModalOpen(true);
      } catch (err) {
        setError('Failed to fetch album details');
        console.error('Error fetching album details:', err);
      }
    };
  
    const handleSaveAlbum = (updatedAlbum) => {
      setAlbums(prevAlbums =>
        prevAlbums.map(album =>
          album.id === updatedAlbum.id ? updatedAlbum : album
        )
      );
    };
  

  // Toggle album visibility
  const handleVisibilityToggle = async (albumId) => {
    try {
      const album = albums.find(a => a.id === albumId);
      const updatedAlbum = { ...album, is_public: !album.is_public };
      
      setAlbums(prevAlbums =>
        prevAlbums.map(a => a.id === albumId ? updatedAlbum : a)
      );
  
      const response = await api.patch(`/api/album/albums/${albumId}/update_is_public/`, {
        is_public: updatedAlbum.is_public
      });
  
      if (response.data) {
        setAlbums(prevAlbums =>
          prevAlbums.map(a =>
            a.id === albumId ? { ...a, is_public: response.data.is_public } : a
          )
        );
      }
    } catch (err) {
      setError('Failed to update album visibility');
      console.error('Error updating album:', err);
    }
  };

  const handleDelete = (albumId) => {
    setSelectedAlbumId(albumId);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/api/album/albums/${selectedAlbumId}/`);
      setAlbums(prevAlbums => prevAlbums.filter(album => album.id !== selectedAlbumId));
      setShowDeleteAlert(false);
    } catch (err) {
      setError('Failed to delete album');
      console.error('Error deleting album:', err);
    }
  };


  const filteredAlbums = albums.filter((album) =>
    album?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Album Management</h2>
        </div>
        <div className="p-4">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search albums..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Album Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Tracks</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Release Date</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Status(Private/Public)</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAlbums.map((album) => (
                  <tr key={album.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-white">{album.name}</td>
                    <td className="px-4 py-3 text-gray-300">{album.tracks?.length || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-300">
                      {new Date(album.release_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleVisibilityToggle(album.id)}
                        className={`p-2 rounded-lg ${
                          album.is_public
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {album.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
  <div className="flex justify-center gap-2">
    <button
      onClick={async () => {
        try {
          const response = await api.get(`/api/album/albums/${album.id}/`);
          setSelectedAlbum(response.data);
          setIsEditModalOpen(true);
        } catch (err) {
          setError('Failed to fetch album details');
          console.error('Error fetching album details:', err);
        }
      }}
      className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
    >
      <PenSquare className="h-4 w-4" />
    </button>
    <button
      onClick={() => handleDelete(album.id)}
      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  </div>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>








          {filteredAlbums.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              {loading ? 'Loading albums...' : 'No albums found matching your search.'}
            </div>
          )}
        </div>
      </div>

      {showDeleteAlert && (
        <div className="fixed bottom-4 right-4 w-96 bg-gray-800 border border-red-500/50 rounded-lg shadow-md">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-white">Are you sure you want to delete this album?</span>
            </div>
            <div className="space-x-2">
              <button
                onClick={confirmDelete}
                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteAlert(false)}
                className="px-3 py-1 bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
            <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      >
        {selectedAlbum && (
          <div className="max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Edit Album</h2>
            </div>
            <EditAlbum
              album={selectedAlbum}
              onClose={() => setIsEditModalOpen(false)}
              onSave={(updatedAlbum) => {
                setAlbums(prevAlbums =>
                  prevAlbums.map(album =>
                    album.id === updatedAlbum.id ? updatedAlbum : album
                  )
                );
                setIsEditModalOpen(false);
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AlbumManagement;