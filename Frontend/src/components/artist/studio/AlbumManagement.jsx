import React, { useState, useEffect } from 'react';
import { PenSquare, Trash2 } from 'lucide-react';
import api from '../../../api';

const AlbumManagement = () => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch albums
  const fetchAlbums = async () => {
    try {
      const response = await api.get('/api/album/albums');
      setAlbums(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch albums');
      console.error('Error fetching albums:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle album visibility
  const handleVisibilityToggle = async (albumId) => {
    try {
      const album = albums.find(a => a.id === albumId);
      
      // Toggle the visibility locally first to provide immediate feedback
      const updatedAlbum = { ...album, is_public: !album.is_public };
      
      // Optimistically update the state to reflect the change
      setAlbums(prevAlbums =>
        prevAlbums.map(a =>
          a.id === albumId ? updatedAlbum : a
        )
      );
  
      // Make the API call to update the is_public status
      const response = await api.patch(`/api/album/albums/${albumId}/update_is_public/`, {
        is_public: updatedAlbum.is_public
      });
  
      // After successful response, update the state
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
  // Delete album
  const handleDeleteAlbum = async (albumId) => {
    if (!window.confirm('Are you sure you want to delete this album?')) return;
    
    try {
      await api.delete(`/api/album/albums/${albumId}/`);
      setAlbums(prevAlbums => prevAlbums.filter(album => album.id !== albumId));
    } catch (err) {
      setError('Failed to delete album');
      console.error('Error deleting album:', err);
    }
  };

  // Handle edit navigation
  const handleEditAlbum = (albumId) => {
    // Navigate to edit page or open modal
    console.log('Edit album:', albumId);
  };

  // Fetch albums on component mount
  useEffect(() => {
    fetchAlbums();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
        <div className="text-white text-center">Loading albums...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Album Management</h3>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
      <div className="p-6">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-gray-700">
              <th className="pb-3 text-gray-300">Album Name</th>
              <th className="pb-3 text-gray-300 text-center">Tracks</th>
              <th className="pb-3 text-gray-300 text-center">Visibility</th>
              <th className="pb-3 text-gray-300">Release Date</th>
              <th className="pb-3 text-gray-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {albums.map((album) => (
              <tr key={album.id} className="border-b border-gray-700">
                <td className="py-4 text-white">
                  <div className="flex items-center gap-3">
                    <div>
                      <div>{album.name}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 text-center text-gray-300">
                  {album.tracks?.length || 0}
                </td>
                <td className="py-4 text-center">
                  <button
                    onClick={() => handleVisibilityToggle(album.id)}
                    className="relative inline-flex items-center gap-3"
                  >
                    <div className={`
                      w-12 h-6 rounded-full transition-colors duration-200 ease-in-out
                      ${album.is_public ? 'bg-blue-600' : 'bg-gray-600'}
                    `}>
                      <div className={`
                        w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out
                        transform translate-y-0.5
                        ${album.is_public ? 'translate-x-6' : 'translate-x-1'}
                      `}/>
                    </div>
                    <span className={`text-sm ${album.is_public ? 'text-blue-400' : 'text-gray-400'}`}>
                      {album.is_public ? 'Public' : 'Private'}
                    </span>
                  </button>
                </td>
                <td className="py-4 text-gray-300">
                  {new Date(album.release_date).toLocaleDateString()}
                </td>
                <td className="py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleEditAlbum(album.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                      <PenSquare className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteAlbum(album.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlbumManagement;