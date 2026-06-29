import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2, Eye, EyeOff, Search, AlertCircle, Tag, PenSquare, Disc3 } from 'lucide-react';
import api from '../../../api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import debounce from 'lodash/debounce';
import Modal from '../../Modal';
import EditSong from './EditSong';

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
  const [genres, setGenres] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState(null);

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
        totalPages: data.results ? Math.ceil(data.count / 8) : Math.ceil((data.length || 0) / 8),
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
  }, [clearStaleCache]); useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await api.get('/api/v1/music/genres/');
        const data = response.data.results || response.data || [];
        const genreMap = {};
        data.forEach(genre => {
          genreMap[genre.id] = genre.name;
        });
        setGenres(genreMap);
      } catch (err) {
        console.error('Error fetching genres:', err);
      }
    };
    fetchGenres();
  }, []);


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

      const response = await api.get('/api/v1/music/music/', { params });

      updateCache(debouncedSearchTerm, currentPage, response.data);

      const musicData = Array.isArray(response.data) ? response.data : response.data.results || [];
      const count = response.data.results ? response.data.count : musicData.length;
      setTracks(musicData);
      setTotalPages(Math.ceil(count / 8));

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

  // Smart Polling for status updates (HLS processing, pending approvals, rejected tracks)
  const needsPollingRef = useRef(false);

  useEffect(() => {
    needsPollingRef.current = tracks.some(
      (track) =>
        (track.approval_status === "approved" && !track.hls_processing_complete) ||
        track.approval_status === "pending"
    );
  }, [tracks]);

  useEffect(() => {
    const fetchLatest = () => {
      const params = {
        search: debouncedSearchTerm,
        page_size: 8,
        page: currentPage
      };
      api.get('/api/v1/music/music/', { params }).then(response => {
        const musicData = Array.isArray(response.data) ? response.data : response.data.results || [];
        setTracks(musicData);
        updateCache(debouncedSearchTerm, currentPage, response.data);
      }).catch(err => console.error("Polling error:", err));
    };

    // Background polling interval only runs if we have pending/processing tracks
    const interval = setInterval(() => {
      if (needsPollingRef.current && document.visibilityState === 'visible') {
        fetchLatest();
      }
    }, 5000);

    // Fetch immediately when window regains focus (e.g. switching back from admin tab)
    // This runs unconditionally to catch changes made in other tabs
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLatest();
      }
    };

    window.addEventListener('focus', fetchLatest);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchLatest);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [debouncedSearchTerm, currentPage]);

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
      await api.delete(`/api/v1/music/music/${selectedTrackId}/`);

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
      const response = await api.post(`/api/v1/music/music/${trackId}/toggle_visibility/`);

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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Album</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Genres</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Plays</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Admin Approval Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {tracks.map((track) => (
                  <tr key={track.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-white">{track.name}</td>
                    <td className="px-4 py-3">
                      {track.album_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium border border-blue-500/20">
                          <Disc3 className="h-3 w-3" />
                          {track.album_name}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs italic">Single</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(track.genres) && track.genres.map((genre, index) => {
                          const isObject = typeof genre === 'object' && genre !== null;
                          const genreId = isObject ? genre.id : genre;
                          const genreName = isObject ? genre.name : (genres[genre] || `Genre ID: ${genre}`);
                          return (
                            <div key={index} className="relative group">
                              <span
                                className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-full text-xs flex items-center gap-1 cursor-pointer transition-colors duration-200"
                                title={genreName}
                              >
                                <Tag className="h-3 w-3" />
                                {genreId}
                              </span>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-950 border border-gray-700 text-gray-200 text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
                                {genreName}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          if (!track.hls_processing_complete) {
                            toast.error('The track audio is still processing. Please wait until it is ready.', {
                              position: 'top-right',
                              autoClose: 3000,
                              theme: 'dark',
                            });
                            return;
                          }
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
                        className={`p-2 rounded-lg ${!track.hls_processing_complete
                            ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                            : track.is_public
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400 shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                          } transition-all`}
                        title={!track.hls_processing_complete ? "Processing audio..." : "Toggle visibility"}
                      >
                        {track.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-300 font-medium">
                        {(track.total_plays || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[track.approval_status?.toLowerCase() || 'pending']
                          } ${track.approval_status === 'pending' ? 'border-yellow-500/30' :
                            track.approval_status === 'approved' ? 'border-green-500/30' :
                              'border-red-500/30'
                          }`}>
                          {track.approval_status || 'Pending'}
                        </span>

                        {/* HLS Processing Indicator */}
                        {track.approval_status === 'approved' && track.hls_processing_complete === false && (
                          <span className="text-[10px] text-blue-400 font-medium px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20 animate-pulse flex items-center gap-1 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping mr-0.5"></span>
                            Processing Audio
                          </span>
                        )}
                        {track.approval_status === 'approved' && track.hls_processing_complete === true && (
                          <span className="text-[10px] text-green-400/70 font-medium px-2 py-0.5 whitespace-nowrap">
                            Ready for Release
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedTrackForEdit(track);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
                          title="Edit song"
                        >
                          <PenSquare className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(track.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete song"
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

      {/* Edit Song Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      >
        {selectedTrackForEdit && (
          <div className="max-h-[80vh]">
            <div className="top-0 bg-gray-900 p-6 border-b border-gray-700">
              <h1 className="text-xl font-semibold text-white">Edit Song</h1>
            </div>
            <EditSong
              track={selectedTrackForEdit}
              onClose={() => setIsEditModalOpen(false)}
              onSave={(updatedTrack) => {
                // Update the track in local state
                setTracks(prevTracks =>
                  prevTracks.map(t =>
                    t.id === updatedTrack.id ? { ...t, ...updatedTrack } : t
                  )
                );
                // Update cache
                updateTrackInCache(updatedTrack.id, (t) => ({ ...t, ...updatedTrack }));
                setIsEditModalOpen(false);
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MusicManagement;