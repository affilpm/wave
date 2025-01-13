import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { musicVerificationService } from '../../services/admin/musicVerificationService';

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

const getStatusBadgeStyle = (status) => {
  const styles = {
    pending: 'bg-yellow-400 text-yellow-900',
    approved: 'bg-green-400 text-green-900',
    rejected: 'bg-red-400 text-red-900',
  };
  return styles[status?.toLowerCase()] || styles.pending;
};

const MusicVerification = () => {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const data = await musicVerificationService.getPendingVerifications();
      setVerifications(data);
    } catch (err) {
      setError('Failed to load verification requests');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (musicId) => {
    try {
      await musicVerificationService.approveMusic(musicId);
      await fetchVerifications();
    } catch (err) {
      setError('Failed to approve music');
    }
  };

  const handleReject = async (musicId) => {
    try {
      await musicVerificationService.rejectMusic(musicId);
      await fetchVerifications();
    } catch (err) {
      setError('Failed to reject music');
    }
  };

  if (loading) {
    return <div className="text-center p-8 text-white">Loading...</div>;
  }

  const getArtistEmail = (music) => {
    return music?.artist?.user?.email || 'Unknown Artist';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-300">Music Verification Requests</h2>
        {error && (
          <div className="bg-red-600 text-white px-4 py-2 rounded">
            {error}
          </div>
        )}
      </div>
      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        <table className="w-full text-left">
          <thead className="bg-blue-700 text-white">
            <tr>
              <th className="py-4 px-6">Song</th>
              <th className="py-4 px-6">Artist Email</th>
              <th className="py-4 px-6">Genre</th>
              <th className="py-4 px-6">Submitted</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {verifications.map((music) => (
              <tr key={music.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition">
                <td className="py-4 px-6 text-white">{music.name || 'Untitled'}</td>
                <td className="py-4 px-6 text-white">{getArtistEmail(music)}</td>
                <td className="py-4 px-6 text-white">
                  {music.genres.length > 0
                    ? music.genres.map((genre) => genre.name).join(', ')
                    : 'No Genre'}
                </td>
                <td className="py-4 px-6 text-white">
                  {formatDate(music.submitted_date)}
                </td>
                <td className="py-4 px-6 text-white">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeStyle(music.status)}`}>
                    {music.status || 'Pending'}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex gap-2">
                    {music.status !== 'approved' && (
                      <button 
                        onClick={() => handleApprove(music.id)}
                        className="p-2 bg-green-600 hover:bg-green-500 rounded-full transition"
                      >
                        <CheckCircle className="h-5 w-5 text-white" />
                      </button>
                    )}
                    {music.status !== 'rejected' && (
                      <button 
                        onClick={() => handleReject(music.id)}
                        className="p-2 bg-red-600 hover:bg-red-500 rounded-full transition"
                      >
                        <XCircle className="h-5 w-5 text-white" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {verifications.length === 0 && (
              <tr>
                <td colSpan="5" className="py-8 text-center text-gray-400">
                  No music entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MusicVerification;