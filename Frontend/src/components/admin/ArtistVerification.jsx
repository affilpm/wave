import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import adminApi from '../../adminApi';
import api from '../../api';
import { ACCESS_TOKEN } from '../../constants/authConstants';


const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid date';
  }
};

const ArtistVerification = () => {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
        setArtists(response.data.artists);
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

  if (loading) return <div className="text-white">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
    {/* <div className="p-6 bg-gray-900 min-h-screen text-white"> */}
        
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-300">Artist Verification Requests</h2>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition">
            Filter
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        <table className="w-full text-white">
          <thead>
            <tr className="bg-blue-700 text-white border-b border-gray-700">
              <th className="text-left py-4 px-6">Artist Email</th>
              <th className="text-left py-4 px-6">Genre</th>
              <th className="text-left py-4 px-6">Submitted</th>
              <th className="text-left py-4 px-6">Status</th>
              <th className="text-left py-4 px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((artist) => (
              <tr
                key={artist.id}
                className="border-b border-gray-700 hover:bg-gray-700/50 transition"
              >
                <td className="py-4 px-6">{artist.email}</td>
                <td className="py-4 px-6">{artist.genre} </td>
                <td className="py-4 px-6">{formatDate(artist.submitted_at)}</td>
                <td className="py-4 px-6">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      artist.status === 'pending'
                        ? 'bg-yellow-300 text-yellow-900'
                        : artist.status === 'approved'
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {artist.status}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex gap-2">
                    {artist.status !== 'approved' && (
                      <button
                        onClick={() => handleStatusChange(artist.id, 'approved')}
                        className="p-2 bg-green-600 hover:bg-green-500 rounded-full transition"
                      >
                        <CheckCircle className="h-5 w-5 text-white" />
                      </button>
                    )}
                    {artist.status !== 'rejected' && (
                      <button
                        onClick={() => handleStatusChange(artist.id, 'rejected')}
                        className="p-2 bg-red-600 hover:bg-red-500 rounded-full transition"
                      >
                        <XCircle className="h-5 w-5 text-white" />
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
  

  );
};

export default ArtistVerification;