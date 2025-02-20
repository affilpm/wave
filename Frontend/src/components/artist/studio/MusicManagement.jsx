import React, { useState, useEffect } from 'react';
import { Trash2, Eye, EyeOff, Search, AlertCircle, Tag } from 'lucide-react';
import api from '../../../api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MusicManagement = () => {
  const [tracks, setTracks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
      fetchTracks();
  }, [currentPage, searchTerm]);
  
  const fetchTracks = async () => {
    try {
      setLoading(true);
  
      // Prepare parameters
      const params = { search: searchTerm, page_size: 8 };
  
      // Only add `page` if search term is empty or when searching
      if (searchTerm) {
        params.page = 1; // Always show the first page for search results
        setCurrentPage(1)
      } else {
        params.page = currentPage <= totalPages ? currentPage : totalPages;
      }
  
      const response = await api.get('/api/music/music/', { params });
  
      // For search results, we handle pagination independently
      if (searchTerm) {
        const musicData = Array.isArray(response.data) ? response.data : response.data.results || [];
        setTracks(musicData);
        setTotalPages(Math.ceil(response.data.count / 8)); // Calculate total pages for search results
      } else {
        // For non-search queries, handle normal pagination
        const musicData = Array.isArray(response.data) ? response.data : response.data.results || [];
        setTracks(musicData);
        setTotalPages(Math.ceil(response.data.count / 8)); // Calculate total pages
      }
      
    } catch (err) {
      setError('Failed to load tracks');
      console.error('API Error:', err);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    } else {
      // Handle edge case where user tries to go beyond the valid page range
      if (newPage > totalPages) {
        setCurrentPage(totalPages); // Set to the last page if exceeded
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
      setShowDeleteAlert(false);
      toast.success('Track deleted successfully!', {
              // position: toast.POSITION.TOP_RIGHT, // Ensure POSITION is accessed like this
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
    } catch (err) {
      setError('Failed to update track visibility');
      console.error('Visibility Toggle Error:', err);
    }
  };

  // Safely filter tracks
  const filteredTracks = tracks.filter((track) =>
    track?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track?.artist_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track?.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track?.genres?.some(genre => 
      typeof genre === 'string' && genre.toLowerCase().includes(searchTerm.toLowerCase())
    )
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Title</th>
                  {/* <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Artist</th> */}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Genres</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Admin Approval Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredTracks.map((track) => (
                  <tr key={track.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-white">{track.name}</td>
                    {/* <td className="px-4 py-3 text-white">{track.artist_name}</td> */}
                    <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                        {Array.isArray(track.genres) && track.genres.map((genre, index) => (
                        <span
                            key={index}
                            className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs flex items-center gap-1"
                        >
                            <Tag className="h-3 w-3" />
                            {genre} {/* Assuming genre has a 'name' property */}
                        </span>
                        ))}
                    </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                        <button
                            onClick={() => {
                            if (track.approval_status === 'pending' || track.approval_status === 'rejected') {
                                toast.error('The track needs to be approved by the admin before changing its status to public.', {
                                position: 'top-right', // Use string for position
                                autoClose: 3000,
                                theme: 'dark',
                                });
                                return;
                            }
                            toggleVisibility(track.id);
                            }}
                            className={`p-2 rounded-lg ${
                            track.is_public
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
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

          {filteredTracks.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              {loading ? 'Loading tracks...' : 'No tracks found matching your search.'}
            </div>
          )}
        </div>
      </div>

      {showDeleteAlert && (
        <div className="fixed bottom-4 right-4 w-96 bg-gray-800 border border-red-500/50 rounded-lg shadow-lg z-50">
            <div className="flex flex-col p-4 space-y-4">
            {/* Alert Header */}
            <div className="flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <span className="text-white text-sm font-medium">
                Are you sure you want to delete this Track?
                </span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
            <button
                onClick={() => setShowDeleteAlert(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-medium hover:bg-gray-600 transition"
                >
                Cancel
                </button>
                <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition"
                >
                Delete
                </button>

            </div>
            </div>
        </div>
        )}
        <div className="flex justify-between items-center mt-4">
    <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-medium hover:bg-gray-600 transition disabled:opacity-50"
    >
        Previous
    </button>
    <span className="text-gray-400">
        Page {currentPage} of {totalPages}
    </span>
    
    <button
      onClick={() => handlePageChange(currentPage + 1)}
      disabled={currentPage === totalPages || filteredTracks.length === 0}
      className="px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-medium hover:bg-gray-600 transition disabled:opacity-50"
    >
      Next
    </button>
</div>
    </div>
  );
};

export default MusicManagement;