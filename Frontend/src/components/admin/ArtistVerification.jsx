import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Search, Users, Filter } from 'lucide-react';
import api from '../../api';
import { ACCESS_TOKEN } from '../../constants/authConstants';

const StatusColors = {
  pending: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    dot: 'bg-amber-400'
  },
  approved: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400'
  },
  rejected: {
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
    dot: 'bg-rose-400'
  }
};

const ArtistVerification = () => {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredArtists, setFilteredArtists] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (!token) {
      navigate('/adminlogin');
      return;
    }

    const fetchArtists = async () => {
      try {
        const response = await api.get('api/artists/list_artists');
        console.log(response.data)
        setArtists(response.data.results);
        setFilteredArtists(response.data.results);
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/adminlogin');
        } else {
          setError('Failed to fetch artists');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, [navigate]);

  useEffect(() => {
    const filtered = artists.filter(artist => 
      artist.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.genre.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredArtists(filtered);
  }, [searchQuery, artists]);

  const handleStatusChange = async (artistId, newStatus) => {
    try {
      await api.post(`api/artists/${artistId}/update_status/`, { status: newStatus });
      setArtists((prevArtists) =>
        prevArtists.map((artist) =>
          artist.id === artistId ? { ...artist, status: newStatus } : artist
        )
      );
    } catch (err) {
      setError('Failed to update artist status');
    }
  };

  const getStatusBadge = (status) => {
    const colors = StatusColors[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };


  const ArtistCard = ({ artist }) => (
    <div className="p-3 bg-gray-800/70 rounded-lg border border-gray-700/50">
      <div className="flex flex-col space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-gray-300 break-all pr-2">{artist.email}</p>
            <span className="inline-block px-3 py-1 bg-violet-500/20 text-violet-400 rounded-full text-xs">
              {artist.genre}
            </span>
          </div>
          <div className="flex gap-1 ml-2 shrink-0">
            {artist.status !== 'approved' && (
              <button
                onClick={() => handleStatusChange(artist.id, 'approved')}
                className="p-1.5 hover:bg-emerald-500/20 rounded-lg transition-colors group"
              >
                <CheckCircle className="h-4 w-4 text-emerald-400 group-hover:text-emerald-300" />
              </button>
            )}
            {artist.status !== 'rejected' && (
              <button
                onClick={() => handleStatusChange(artist.id, 'rejected')}
                className="p-1.5 hover:bg-rose-500/20 rounded-lg transition-colors group"
              >
                <XCircle className="h-4 w-4 text-rose-400 group-hover:text-rose-300" />
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-sm text-gray-300">
              {new Date(artist.submitted_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
          {getStatusBadge(artist.status)}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-3 sm:p-8 border border-gray-700/50 backdrop-blur-sm">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 rounded-xl p-3 sm:p-8 border border-red-500/20">
        <div className="text-center text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 bg-violet-500/10 rounded-lg shrink-0">
            <Users className="h-5 w-5 text-violet-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-200 truncate">Artist Verification</h2>
            <p className="text-sm text-gray-400">Managing {artists.length} verification requests</p>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl 
                       focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 
                       text-gray-200 placeholder-gray-400 transition-colors"
            />
          </div>
          <button className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition-colors shrink-0">
            <Filter className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Responsive Table/Cards */}
      <div className="space-y-4">
        {/* Desktop Table - Hidden on mobile */}
        <div className="hidden md:block bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 backdrop-blur-sm mx-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left py-4 px-6 font-medium text-gray-400">Artist Email</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-400">Genre</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-400">Submitted</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-400">Status</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filteredArtists.map((artist) => (
                  <tr key={artist.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="py-4 px-6 text-gray-300">{artist.email}</td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-violet-500/20 text-violet-400 rounded-full text-xs">
                        {artist.genre}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-gray-300">
                          {new Date(artist.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="text-sm text-gray-400">
                          {new Date(artist.submitted_at).getFullYear()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(artist.status)}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {artist.status !== 'approved' && (
                          <button
                            onClick={() => handleStatusChange(artist.id, 'approved')}
                            className="p-2 hover:bg-emerald-500/20 rounded-lg transition-colors group"
                          >
                            <CheckCircle className="h-4 w-4 text-emerald-400 group-hover:text-emerald-300" />
                          </button>
                        )}
                        {artist.status !== 'rejected' && (
                          <button
                            onClick={() => handleStatusChange(artist.id, 'rejected')}
                            className="p-2 hover:bg-rose-500/20 rounded-lg transition-colors group"
                          >
                            <XCircle className="h-4 w-4 text-rose-400 group-hover:text-rose-300" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards - Shown only on mobile */}
        <div className="md:hidden space-y-2 px-3">
          {filteredArtists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>

        {filteredArtists.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">No artists found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistVerification;