import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import api from '../../../api';
const StreamsList = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const response = await api.get('/api/agora/streams/');
        setStreams(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching streams:', err);
        setError('Failed to load streams');
        setLoading(false);
      }
    };
    
    fetchStreams();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchStreams, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleStartStream = async () => {
    try {
      const title = prompt('Enter a title for your stream:');
      if (!title) return;
      
      // Get token with host role
      await api.get('/api/token/', {
        params: {
          role: 'host',
          title: title
        }
      });
      
      // Refresh streams list
      const response = await api.get('/api/agora/streams/');
      setStreams(response.data);
      
      // Find the newest stream by the current user
      const userStream = response.data.find(stream => 
        stream.host.username === localStorage.getItem('username')
      );
      
      if (userStream) {
        window.location.href = `/streams/${userStream.id}?role=host`;
      }
    } catch (err) {
      console.error('Error starting stream:', err);
      alert('Failed to start stream. ' + err.response?.data?.error || err.message);
    }
  };
  
  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading streams...</div>;
  }
  
  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-600">{error}</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Live Streams</h1>
        <button
          onClick={handleStartStream}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Start Streaming
        </button>
      </div>
      
      {streams.length === 0 ? (
        <div className="text-center p-8 bg-gray-100 rounded-lg">
          <p className="text-lg text-gray-600">No active streams at the moment</p>
          <p className="mt-2">Be the first to start a stream!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {streams.map(stream => (
            <div 
              key={stream.id}
              className="border border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="bg-gray-200 h-48 flex items-center justify-center">
                <span className="text-gray-500">Stream Preview</span>
              </div>
              
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{stream.title}</h2>
                <p className="text-gray-700 mb-2">Host: {stream.host.username}</p>
                <p className="text-gray-600 mb-4">
                  Viewers: {stream.participant_count}
                </p>
                
                <Link 
                  to={`/streams/${stream.id}`}
                  className="block text-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  Join Stream
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StreamsList;