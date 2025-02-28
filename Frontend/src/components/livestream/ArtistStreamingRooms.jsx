import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Play, Users } from 'lucide-react';
import { apiInstance } from '../../api';

const ArtistStreamingRooms = () => {
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [roomDetails, setRoomDetails] = useState({});
  const username = useSelector((state) => state.user.username);
  const navigate = useNavigate();
  
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  
  // Connect to WebSocket server
  useEffect(() => {
    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) {
        console.log("Cleaning up WebSocket connection");
        socketRef.current.close();
      }
    };
  }, []);
  
  // Set up polling for room info
  useEffect(() => {
    const roomInfoPollingInterval = setInterval(() => {
      if (isConnected && availableRooms.length > 0) {
        fetchRoomDetails();
      }
    }, 10000); // Poll every 10 seconds
    
    return () => {
      clearInterval(roomInfoPollingInterval);
    };
  }, [isConnected, availableRooms]);

  // Fetch artist details for rooms
  const fetchRoomDetails = async () => {
    try {
      const roomsWithDetails = {};
      
      // For each room, try to get artist info
      // Assuming room IDs follow a format like "artist_123"
      for (const roomId of availableRooms) {
        if (roomId.startsWith('artist_')) {
          const artistId = roomId.split('_')[1];
          try {
            const response = await apiInstance.get(`/api/artists/${artistId}/`);
            roomsWithDetails[roomId] = response.data;
          } catch (error) {
            console.error(`Error fetching details for room ${roomId}:`, error);
            roomsWithDetails[roomId] = { id: artistId, username: roomId };
          }
        } else {
          // For non-artist rooms, just store basic info
          roomsWithDetails[roomId] = { username: roomId };
        }
      }
      
      setRoomDetails(roomsWithDetails);
    } catch (error) {
      console.error("Error fetching room details:", error);
    }
  };

  const connectWebSocket = () => {
    console.log("Connecting to WebSocket for streaming rooms...");
    
    try {
      // Get the JWT token
      const accessToken = apiInstance.getToken('accessTokenKey');
      
      if (!accessToken) {
        setConnectionError('No access token found!');
        return;
      }
  
      // Use secure WebSocket if site is using HTTPS
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = '8001'; // Your WebSocket server port
      
      // Attach JWT token as a query parameter
      const wsUrl = `${protocol}//${host}:${port}/ws/webrtc/?token=${accessToken}`;
      
      const socketConnection = new WebSocket(wsUrl);
      socketRef.current = socketConnection;
      
      socketConnection.onopen = () => {
        console.log("WebSocket connected successfully for room listings");
        setIsConnected(true);
        setConnectionError('');
        
        // Request available rooms once connected
        requestAvailableRooms();
      };
    
      socketConnection.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          
          if (data.type === 'available_rooms') {
            console.log("Received available streaming rooms:", data.rooms);
            
            // Filter for artist rooms (if you want to implement a naming convention)
            // For example, artist rooms could be prefixed with "artist_"
            const artistRooms = data.rooms.filter(room => 
              room.startsWith('artist_') || true // Remove 'true' if you implement specific filtering
            );
            
            setAvailableRooms(artistRooms);
            
            // Fetch details for these rooms
            if (artistRooms.length > 0) {
              fetchRoomDetails();
            }
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
    
      socketConnection.onerror = (e) => {
        console.error("WebSocket Error:", e);
        setIsConnected(false);
        setConnectionError('Connection error. Check if server is running.');
      };
      
      socketConnection.onclose = (e) => {
        console.log(`WebSocket closed with code: ${e.code}, reason: ${e.reason}`);
        setIsConnected(false);
        
        // Attempt to reconnect after a delay if unexpectedly disconnected
        if (e.code === 1006 || e.code === 1001) {
          setConnectionError('Connection lost. Attempting to reconnect...');
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            connectWebSocket(); // Reconnect
          }, 5000);
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setConnectionError(`Failed to create WebSocket: ${error.message}`);
      
      // Try to reconnect
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        connectWebSocket();
      }, 5000);
    }
  };
  
  // Request available rooms
  const requestAvailableRooms = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'get_available_rooms'
      }));
    }
  };
  
  // Join a streaming room
  const joinStreamingRoom = (roomId) => {
    navigate('/streaming', { state: { roomId } });
  };
  
  // Get placeholder color for artists without photos
  const getColor = (username) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    
    // Generate a consistent color index based on the username
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };
  
  // Refresh available rooms
  const refreshRooms = () => {
    requestAvailableRooms();
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-xl font-bold">Live Artist Streams</h2>
        
        <div className="flex items-center">
          <div className={`mr-4 px-3 py-1 rounded text-white text-sm flex items-center ${isConnected ? 'bg-green-600' : 'bg-red-600'}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-300' : 'bg-red-300'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          <button
            onClick={refreshRooms}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            disabled={!isConnected}
          >
            Refresh
          </button>
        </div>
      </div>
      
      {connectionError && (
        <div className="mb-4 px-3 py-2 bg-red-500 bg-opacity-20 border border-red-500 text-red-100 rounded">
          {connectionError}
        </div>
      )}
      
      {availableRooms.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded flex flex-col items-center justify-center">
          <div className="text-gray-400 mb-2">No artists are currently streaming</div>
          <button
            onClick={refreshRooms}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mt-4"
            disabled={!isConnected}
          >
            Check Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {availableRooms.map((roomId, index) => {
            const roomInfo = roomDetails[roomId] || { username: roomId };
            return (
              <div 
                key={index}
                className="bg-gray-800 rounded overflow-hidden hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => joinStreamingRoom(roomId)}
              >
                <div className="aspect-video bg-black relative">
                  {roomInfo.profile_photo || roomInfo.photo ? (
                    <img 
                      src={roomInfo.profile_photo || roomInfo.photo} 
                      alt={roomInfo.username} 
                      className="w-full h-full object-cover opacity-70"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${getColor(roomInfo.username || 'unknown')}`}>
                      <span className="text-white text-4xl font-bold">
                        {(roomInfo.username || 'A').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white text-xs rounded flex items-center">
                    <div className="w-2 h-2 rounded-full bg-white mr-1 animate-pulse"></div>
                    LIVE
                  </div>
                  
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    {/* We would need to know participants count, using placeholder */}
                    <span>--</span>
                  </div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button 
                      className="w-16 h-16 bg-blue-600 bg-opacity-80 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        joinStreamingRoom(roomId);
                      }}
                    >
                      <Play className="w-8 h-8 text-white ml-1" />
                    </button>
                  </div>
                </div>
                
                <div className="p-3">
                  <div className="font-medium text-white truncate">
                    {roomInfo.username || roomId}
                  </div>
                  <div className="text-sm text-gray-400 truncate">
                    {roomInfo.bio ? 
                      (roomInfo.bio.length > 60 ? roomInfo.bio.substring(0, 60) + '...' : roomInfo.bio) : 
                      'Live streaming now'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ArtistStreamingRooms;