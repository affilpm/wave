import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { ACCESS_TOKEN } from '../../../constants/authConstants';

const GenreManagement = () => {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGenre, setNewGenre] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });

  // Use the established BASE_URL pattern or the proxy
  const API_BASE = '/api/v1/music/genres/';

  useEffect(() => {
    fetchGenres(currentPage);
  }, [currentPage]);

  const fetchGenres = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem(ACCESS_TOKEN);
      const response = await axios.get(`${API_BASE}?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Handle paginated vs non-paginated data
      if (response.data.results) {
        setGenres(response.data.results);
        setPagination({
          count: response.data.count,
          next: response.data.next,
          previous: response.data.previous
        });
      } else {
        setGenres(Array.isArray(response.data) ? response.data : []);
        setPagination({ count: response.data.length, next: null, previous: null });
      }
    } catch (error) {
      console.error('Error fetching genres:', error);
      toast.error('Failed to load genres');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newGenre.trim()) return;

    try {
      const token = localStorage.getItem(ACCESS_TOKEN);
      const response = await axios.post(API_BASE, 
        { name: newGenre.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGenres([...genres, response.data]);
      setNewGenre('');
      toast.success('Genre created successfully');
    } catch (error) {
      console.error('Error creating genre:', error);
      toast.error(error.response?.data?.error || 'Failed to create genre');
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;

    try {
      const token = localStorage.getItem(ACCESS_TOKEN);
      const response = await axios.patch(`${API_BASE}${id}/`, 
        { name: editName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGenres(genres.map(g => g.id === id ? response.data : g));
      setEditingId(null);
      toast.success('Genre updated successfully');
    } catch (error) {
      console.error('Error updating genre:', error);
      toast.error('Failed to update genre');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this genre?')) return;

    try {
      const token = localStorage.getItem(ACCESS_TOKEN);
      await axios.delete(`${API_BASE}${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGenres(genres.filter(g => g.id !== id));
      toast.success('Genre deleted successfully');
    } catch (error) {
      console.error('Error deleting genre:', error);
      toast.error('Failed to delete genre');
    }
  };

  const startEditing = (genre) => {
    setEditingId(genre.id);
    setEditName(genre.name);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Tag className="h-6 w-6 text-violet-400" />
            Genre Management
          </h2>
          <p className="text-gray-400 text-sm mt-1">Add, edit, or remove music genres from the platform.</p>
        </div>
      </div>

      {/* Add New Genre Form */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
        <form onSubmit={handleCreate} className="flex gap-4" onKeyDown={(e) => { if(e.key === 'Enter' && !newGenre.trim()) e.preventDefault(); }}>
          <input
            autoFocus
            type="text"
            value={newGenre}
            onChange={(e) => setNewGenre(e.target.value)}
            placeholder="Enter new genre name (e.g., Synthwave, Lo-fi)"
            className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={!newGenre.trim()}
            className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 
              ${newGenre.trim() 
                ? 'bg-violet-600 hover:bg-violet-700 text-white cursor-pointer' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'}`}
          >
            <Plus className="h-4 w-4" />
            Add Genre
          </button>
        </form>
      </div>

      {/* Genres List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {genres.map((genre) => (
          <div
            key={genre.id}
            className="bg-gray-800/30 border border-gray-700/30 hover:border-violet-500/30 rounded-xl p-4 transition-all group"
          >
            {editingId === genre.id ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 bg-gray-900 border border-violet-500/50 rounded px-2 py-1 text-white text-sm focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdate(genre.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <button
                  onClick={() => handleUpdate(genre.id)}
                  className="p-1 hover:text-green-400 text-gray-400 transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1 hover:text-red-400 text-gray-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                  <span className="text-gray-200 font-medium">{genre.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditing(genre)}
                    className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-violet-400 transition-all"
                    title="Edit Genre"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(genre.id)}
                    className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-400 transition-all"
                    title="Delete Genre"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {genres.length === 0 && (
          <div className="col-span-full py-12 text-center bg-gray-800/20 border border-dashed border-gray-700 rounded-xl">
            <Tag className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No genres found. Add your first one above!</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {(pagination.next || pagination.previous) && (
        <div className="flex items-center justify-between mt-8 bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={!pagination.previous}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-400 text-sm">
            Showing <span className="text-white font-medium">{genres.length}</span> of <span className="text-white font-medium">{pagination.count}</span> genres
          </span>
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={!pagination.next}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default GenreManagement;
