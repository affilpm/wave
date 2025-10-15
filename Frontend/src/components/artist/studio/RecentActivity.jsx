import React, { useEffect, useState } from 'react';
import { Music, Clock } from 'lucide-react';
import StudioCard from './StudioCard';
import api from '../../../api'; 

const RecentActivity = () => {
  const [recentSongs, setRecentSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentSongs = async () => {
      try {
        const response = await api.get('api/artists/artist-recent-plays/'); 
        console.log(response.data)
        setRecentSongs(response.data.recently_played); 
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentSongs();
  }, []);

  if (loading) {
    return (
      <StudioCard className="mb-8">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        </div>
        <div className="p-6 text-gray-400">Loading...</div>
      </StudioCard>
    );
  }

  return (
    <StudioCard className="mb-8">
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          {recentSongs.map((song) => (
            <div key={song.music_id} className="flex items-center space-x-4">
              <div className="bg-gray-700 p-1 rounded-lg w-12 h-12 overflow-hidden">
                {song.cover_photo ? (
                  <img
                    src={song.cover_photo}
                    alt={song.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Music className="h-6 w-6 text-gray-400 m-auto" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">{song.name}</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-400">
                    {new Date(song.last_played).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">{song.total_plays} plays</span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StudioCard>
  );
};

export default RecentActivity;