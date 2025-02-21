import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Eye, EyeOff, Search, AlertCircle, Tag } from 'lucide-react';
import api from '../../../api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { debounce } from 'lodash';

const MusicManagement = () => {
  const [tracks, setTracks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cache, setCache] = useState({});

  // Separate the search term update from the debounced API call
  const updateDebouncedSearchTerm = useCallback(
    debounce((value) => {
      setDebouncedSearchTerm(value);
      setCurrentPage(1);
    }, 500),
    []
  );

  // Handle input change without immediate API calls
  const handleSearchInput = (value) => {
    setSearchTerm(value);
    updateDebouncedSearchTerm(value);
  };

  const getCacheKey = (search, page) => `${search}-${page}`;

  const checkCache = (search, page) => {
    const key = getCacheKey(search, page);
    return cache[key];
  };

  const updateCache = (search, page, data) => {
    const key = getCacheKey(search, page);
    setCache(prevCache => ({
      ...prevCache,
      [key]: {
        data: data.results || data,
        totalPages: Math.ceil(data.count / 8),
        timestamp: Date.now()
      }
    }));
  };

  const clearStaleCache = useCallback(() => {
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000;
    
    setCache(prevCache => {
      const newCache = {};
      Object.entries(prevCache).forEach(([key, value]) => {
        if (now - value.timestamp < CACHE_DURATION) {
          newCache[key] = value;
        }
      });
      return newCache;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(clearStaleCache, 60000);
    return () => clearInterval(interval);
  }, [clearStaleCache]);

  const fetchTracks = useCallback(async () => {
    try {
      setLoading(true);
      
      const cachedData = checkCache(debouncedSearchTerm, currentPage);
      if (cachedData) {
        setTracks(cachedData.data);
        setTotalPages(cachedData.totalPages);
        setLoading(false);
        return;
      }

      const params = { 
        search: debouncedSearchTerm, 
        page_size: 8,
        page: currentPage
      };

      const response = await api.get('/api/music/music/', { params });
      
      updateCache(debouncedSearchTerm, currentPage, response.data);
      
      const musicData = Array.isArray(response.data) ? response.data : response.data.results || [];
      setTracks(musicData);
      setTotalPages(Math.ceil(response.data.count / 8));
      
    } catch (err) {
      setError('Failed to load tracks');
      console.error('API Error:', err);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm]);

  useEffect(() => {
    const cachedData = checkCache(debouncedSearchTerm, currentPage);
    if (!cachedData) {
      fetchTracks();
    } else {
      setTracks(cachedData.data);
      setTotalPages(cachedData.totalPages);
    }
  }, [currentPage, debouncedSearchTerm, fetchTracks]);

  const updateTrackInCache = (trackId, updateFn) => {
    setCache(prevCache => {
      const newCache = { ...prevCache };
      Object.keys(newCache).forEach(key => {
        if (newCache[key].data) {
          newCache[key].data = newCache[key].data.map(track => 
            track.id === trackId ? updateFn(track) : track
          );
        }
      });
      return newCache;
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    } else {
      if (newPage > totalPages) {
        setCurrentPage(totalPages);
      }
    }
  };

  const statusColors = {
    pending: "bg-yellow-500/20 text-yellow-500",
    approved: "bg-green-500/20 text-green-500",
    rejected: "bg-red-500/20 text-red-500"
  };

  const handleDelete = (trackId) => {
    setSelectedTrackId(trackId);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/api/music/music/${selectedTrackId}/`);
      
      setTracks(tracks.filter((track) => track.id !== selectedTrackId));
      setCache(prevCache => {
        const newCache = { ...prevCache };
        Object.keys(newCache).forEach(key => {
          if (newCache[key].data) {
            newCache[key].data = newCache[key].data.filter(
              track => track.id !== selectedTrackId
            );
          }
        });
        return newCache;
      });
      
      setShowDeleteAlert(false);
      toast.success('Track deleted successfully!', {
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'dark',
      });
    } catch (err) {
      setError('Failed to delete track');
      console.error('Delete Error:', err);
    }
  };

  const toggleVisibility = async (trackId) => {
    try {
      const response = await api.post(`/api/music/music/${trackId}/toggle_visibility/`);
      
      setTracks(tracks.map((track) =>
        track.id === trackId ? { ...track, is_public: response.data.is_public } : track
      ));
      
      updateTrackInCache(trackId, track => ({
        ...track,
        is_public: response.data.is_public
      }));
      
    } catch (err) {
      setError('Failed to update track visibility');
      console.error('Visibility Toggle Error:', err);
    }
  };

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
          <h2 className="text-lg font-semibold text-white">Music Library Management</h2>
        </div>
        <div className="p-4">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, artist, or genre..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={searchTerm}
              onChange={(e) => handleSearchInput(e.target.value)}
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Genres</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Admin Approval Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {tracks.map((track) => (
                  <tr key={track.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-white">{track.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(track.genres) && track.genres.map((genre, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs flex items-center gap-1"
                          >
                            <Tag className="h-3 w-3" />
                            {genre}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          if (track.approval_status === 'pending' || track.approval_status === 'rejected') {
                            toast.error('The track needs to be approved by the admin before changing its status to public.', {
                              position: 'top-right',
                              autoClose: 3000,
                              theme: 'dark',
                            });
                            return;
                          }
                          toggleVisibility(track.id);
                        }}
                        className={`p-2 rounded-lg ${track.is_public ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}
                      >
                        {track.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[track.approval_status?.toLowerCase() || 'pending']}`}>
                        {track.approval_status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(track.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tracks.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              {loading ? 'Loading tracks...' : 'No tracks found matching your search.'}
            </div>
          )}
        </div>
      </div>

      {showDeleteAlert && (
        <div className="fixed bottom-4 right-4 w-96 bg-gray-800 border border-red-500/50 rounded-lg shadow-lg z-50">
          <div className="flex flex-col p-4 space-y-4">
            <div className="flex items-center space-x-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              <span className="text-lg">Are you sure you want to delete this track?</span>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteAlert(false)}
                className="px-4 py-2 bg-gray-700/40 rounded-lg text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 rounded-lg text-white hover:bg-red-600"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {tracks.length > 0 && (
        <div className="flex justify-between items-center py-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-600/30 text-white rounded-lg disabled:bg-gray-500"
          >
            Previous
          </button>
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-600/30 text-white rounded-lg disabled:bg-gray-500"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MusicManagement;