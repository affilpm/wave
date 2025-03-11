import React, { useEffect, useState, useRef } from 'react';
import { apiInstance } from '../../api';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import ArtistStreamingControls from './ArtistStreamingControls';
import api from '../../api';


const WebRTCLivestream = () => {
  // All existing state variables from your original component
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [peers, setPeers] = useState(new Map());
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomInfo, setRoomInfo] = useState({});
  
  // New state variables for artist streaming
  const [isArtistStream, setIsArtistStream] = useState(false);
  const [streamInfo, setStreamInfo] = useState({
    title: '',
    description: ''
  });
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  
  const username = useSelector((state) => state.user.username);
  const isArtist = useSelector((state) => state.user.isArtist);
  const artistId = useSelector((state) => state.user.artistId);
  
  const location = useLocation();
  
  // All your existing refs
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const accessToken = apiInstance.getToken('accessTokenKey');
  const roomInputRef = useRef(null);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  
  window.localStreamRef = localStreamRef;
  
  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Check if we're navigating directly to a specific room
  useEffect(() => {
    if (location.state?.roomId) {
      // We're coming from the ArtistStreamingRooms component
      const roomToJoin = location.state.roomId;
      
      // Set a timeout to ensure socket connection is established first
      setTimeout(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          joinRoom(roomToJoin);
        } else {
          // Retry after another short delay
          setTimeout(() => {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
              joinRoom(roomToJoin);
            }
          }, 1000);
        }
      }, 1000);
    }
  }, [location, isConnected]);

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

  // Add room polling interval
  useEffect(() => {
    // Set up a room polling interval as a fallback mechanism
    const roomPollingInterval = setInterval(() => {
      if (isConnected && !isInRoom) {
        console.log("Polling for available rooms...");
        requestAvailableRooms();
      }
    }, 5000); // Poll every 5 seconds when connected but not in a room

    return () => {
      clearInterval(roomPollingInterval);
    };
  }, [isConnected, isInRoom]);

  // Handle token refresh
  useEffect(() => {
    const handleTokenRefresh = (event) => {
      console.log("Token refreshed, reconnecting WebSocket with new token");
      // Close existing connection
      if (socketRef.current) {
        socketRef.current.close();
      }
      // Reconnect with new token
      connectWebSocket();
    };
    
    window.addEventListener('tokenRefreshed', handleTokenRefresh);
    
    return () => {
      window.removeEventListener('tokenRefreshed', handleTokenRefresh);
    };
  }, []);

  // Request available rooms
  const requestAvailableRooms = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'get_available_rooms'
      }));
    }
  };

// Add this function to your WebRTCLivestream component
// Add this function to your WebRTCLivestream component
const debugConnection = () => {
  console.log("=== WebSocket Connection Debugging ===");
  console.log(`Connection Status: ${isConnected ? 'Connected' : 'Disconnected'}`);
  console.log(`Socket readyState: ${socketRef.current ? socketRef.current.readyState : 'No socket'}`);
  console.log(`Available Rooms: ${JSON.stringify(availableRooms)}`);
  console.log(`Room Info: ${JSON.stringify(roomInfo)}`);
  
  // Force request available rooms
  if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
    console.log("Manually requesting available rooms...");
    socketRef.current.send(JSON.stringify({
      type: 'get_available_rooms'
    }));
  } else {
    console.log("Cannot request rooms - socket not open");
  }
};

// Function to get the livestream token
const getLivestreamToken = async () => {
  try {
    // Check if we have a cached livestream token that's still valid
    const cachedToken = localStorage.getItem('livestreamToken');
    const expiresAt = localStorage.getItem('livestreamTokenExpires');
    
    // If token exists and is not expired (with 5 min buffer)
    if (cachedToken && expiresAt && new Date(expiresAt) > new Date(Date.now() + 5 * 60 * 1000)) {
      console.log("Using cached livestream token");
      return cachedToken;
    }
    
    // Otherwise, request a new livestream token
    console.log("Requesting new livestream token");
    
    // Get the regular access token for authorization
    const accessToken = apiInstance.getToken('accessTokenKey');
    
    if (!accessToken) {
      throw new Error('No access token found');
    }

    const response = await api.post('/api/livestream/token/', {
      duration_hours: 24, // Send the duration
    });
    
    console.log("Livestream Token Response:", response.data);

    // If using axios or similar library that puts the response in data property
    if (response.data && response.data.token) {
      // Cache the token and its expiration
      localStorage.setItem('livestreamToken', response.data.token);
      
      // Set expiration (current time + expires_in seconds)
      const expiration = new Date(Date.now() + response.data.expires_in * 1000);
      localStorage.setItem('livestreamTokenExpires', expiration.toISOString());
      
      return response.data.token;
    } else {
      throw new Error('Invalid response format: token not found in response');
    }
  } catch (error) {
    console.error("Error getting livestream token:", error);
    throw error;
  }
};

const connectWebSocket = async () => {
  console.log("Attempting to connect to WebSocket...");
  
  try {
    // Get special livestream token - getLivestreamToken already returns the token string
    const token = await getLivestreamToken();
    
    if (!token) {
        console.error("No livestream token received.");
        return;
    }

    // Use secure WebSocket if site is using HTTPS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '8000'; // Your WebSocket server port
    
    // Attach JWT token as a query parameter
    const wsUrl = `${protocol}//${host}:${port}/ws/webrtc/?token=${encodeURIComponent(token)}`;
    
    console.log("Connecting to WebSocket...");
    const socketConnection = new WebSocket(wsUrl);
    socketRef.current = socketConnection;
    
    socketConnection.onopen = () => {
      console.log("WebSocket connected successfully");
      setIsConnected(true);
      setConnectionError('');
      
      // Request available rooms once connected
      console.log("Initially requesting available rooms...");
      socketConnection.send(JSON.stringify({
        type: 'get_available_rooms'
      }));
    };
  
    socketConnection.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log("WebSocket message received:", data);
        
        handleSignalingMessage(data);
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
          console.log("Reconnecting now...");
          connectWebSocket(); // Reconnect
        }, 5000);
      }
    };
  
    setSocket(socketConnection);
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

// Check livestream token periodically and renew if needed
useEffect(() => {
  const checkTokenInterval = setInterval(async () => {
    try {
      const expiresAt = localStorage.getItem('livestreamTokenExpires');
      
      // If token will expire in next 30 minutes, get a new one and reconnect
      if (expiresAt && new Date(expiresAt) < new Date(Date.now() + 30 * 60 * 1000)) {
        console.log("Livestream token expiring soon, refreshing...");
        
        // Close existing connection
        if (socketRef.current) {
          socketRef.current.close();
        }
        
        // This will get a new token and reconnect
        await connectWebSocket();
      }
    } catch (error) {
      console.error("Error checking token expiration:", error);
    }
  }, 15 * 60 * 1000); // Check every 15 minutes
  
  return () => {
    clearInterval(checkTokenInterval);
  };
}, []);

// Token refresh event listener (if your app has a global token refresh mechanism)
useEffect(() => {
  const handleTokenRefresh = async () => {
    console.log("Main access token refreshed, refreshing livestream token");
    
    // Clear cached livestream token to force new one
    localStorage.removeItem('livestreamToken');
    localStorage.removeItem('livestreamTokenExpires');
    
    // Close existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Reconnect with new token
    await connectWebSocket();
  };
  
  window.addEventListener('tokenRefreshed', handleTokenRefresh);
  
  return () => {
    window.removeEventListener('tokenRefreshed', handleTokenRefresh);
  };
}, []);

// Connect to WebSocket server on component mount
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

// Handle logging out
const handleLogout = () => {
  try {
    // Clear livestream token when logging out
    localStorage.removeItem('livestreamToken');
    localStorage.removeItem('livestreamTokenExpires');
    
    // Use apiInstance's logout method
    apiInstance.handleLogout();
  } catch (error) {
    console.error("Logout failed:", error);
  }
};
  // Additional method to leverage apiInstance error handling
  const handleApiError = async (apiCall) => {
    try {
      return await apiCall();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Token might be expired, try refreshing
        try {
          await apiInstance.refreshAccessToken();
          // Retry the original API call
          return await apiCall();
        } catch (refreshError) {
          console.error("API call failed after token refresh:", refreshError);
          handleLogout();
          throw refreshError;
        }
      }
      throw error;
    }
  };

  // Handle signaling messages from the server
  const handleSignalingMessage = async (data) => {
    try {
      const type = data.type;
      
      if (type === 'available_rooms') {
        console.log("Received available rooms:", data.rooms);
        setAvailableRooms(data.rooms);
        if (data.room_info) {
          setRoomInfo(data.room_info);
        }
      }
      else if (type === 'room_joined') {
        console.log(`Joined room ${data.roomId} with ${data.existingParticipants} existing participants`);
        setIsInRoom(true);
        
        // Check if this is an artist room
        if (data.room_info && data.room_info.is_artist_room) {
          setIsArtistStream(true);
          // Set stream info if you're joining an artist's room
          if (data.room_info.artist_id && data.room_info.artist_id !== artistId) {
            setStreamInfo({
              ...streamInfo,
              artistName: data.room_info.username || 'Unknown Artist'
            });
          }
        }
        
        // Start local stream if we successfully joined the room
        startLocalStream();
      }
      else if (type === 'new_peer') {
        // A new peer has joined, create a connection to them
        const peerId = data.peer;
        console.log(`New peer joined: ${peerId}`);
        createPeerConnection(peerId, true);
      }
      else if (type === 'peer_left') {
        // A peer has left, remove their connection
        const peerId = data.peer;
        console.log(`Peer left: ${peerId}`);
        removePeerConnection(peerId);
      }
      else if (type === 'offer') {
        // Received an offer, create answer
        const peerId = data.sender;
        console.log(`Received offer from: ${peerId}`);
        const peerConnection = peerConnectionsRef.current.get(peerId) || createPeerConnection(peerId, false);
        
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          // Send answer back to the peer
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: 'answer',
              target: peerId,
              sdp: peerConnection.localDescription
            }));
          }
        } catch (error) {
          console.error("Error handling offer:", error);
        }
      }
      else if (type === 'answer') {
        // Received an answer to our offer
        const peerId = data.sender;
        console.log(`Received answer from: ${peerId}`);
        const peerConnection = peerConnectionsRef.current.get(peerId);
        
        if (peerConnection) {
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
          } catch (error) {
            console.error("Error handling answer:", error);
          }
        }
      }
      else if (type === 'ice_candidate') {
        // Received ICE candidate
        const peerId = data.sender;
        const peerConnection = peerConnectionsRef.current.get(peerId);
        
        if (peerConnection) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        }
      }
      else if (type === 'chat') {
        // Add received chat message
        setReceivedMessages(prev => [...prev, {
          username: data.username,
          message: data.message,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } catch (error) {
      console.error("Error handling signaling message:", error);
    }
  };
  
  // Create a peer connection to another user
  const createPeerConnection = (peerId, isInitiator) => {
    try {
      console.log(`Creating ${isInitiator ? 'initiator' : 'receiver'} peer connection with ${peerId}`);
      
      // Create new RTCPeerConnection
      const peerConnection = new RTCPeerConnection(rtcConfig);
      
      // Add local stream tracks to the connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStreamRef.current);
        });
      }
      
      // Set up event handlers
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("ICE candidate generated, sending to peer");
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: 'ice_candidate',
              target: peerId,
              candidate: event.candidate
            }));
          }
        }
      };
      
      peerConnection.ontrack = (event) => {
        console.log("Received remote track");
        if (event.streams && event.streams[0]) {
          setPeers(prevPeers => {
            const newPeers = new Map(prevPeers);
            newPeers.set(peerId, event.streams[0]);
            return newPeers;
          });
        }
      };
      
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state changed: ${peerConnection.connectionState}`);
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed' ||
            peerConnection.connectionState === 'closed') {
          removePeerConnection(peerId);
        }
      };
      
      // If we're the initiator, create and send offer
      if (isInitiator) {
        peerConnection.createOffer()
          .then(offer => peerConnection.setLocalDescription(offer))
          .then(() => {
            console.log("Sending offer to peer");
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({
                type: 'offer',
                target: peerId,
                roomId: roomId,
                sdp: peerConnection.localDescription
              }));
            }
          })
          .catch(err => console.error("Error creating offer:", err));
      }
      
      // Store the connection
      peerConnectionsRef.current.set(peerId, peerConnection);
      
      return peerConnection;
    } catch (error) {
      console.error("Error creating peer connection:", error);
      return null;
    }
  };
  
  // Remove a peer connection
  const removePeerConnection = (peerId) => {
    try {
      console.log(`Removing peer connection with ${peerId}`);
      
      // Close the connection
      const peerConnection = peerConnectionsRef.current.get(peerId);
      if (peerConnection) {
        peerConnection.close();
        peerConnectionsRef.current.delete(peerId);
      }
      
      // Remove the stream
      setPeers(prevPeers => {
        const newPeers = new Map(prevPeers);
        newPeers.delete(peerId);
        return newPeers;
      });
    } catch (error) {
      console.error("Error removing peer connection:", error);
    }
  };
  
  // Start local video stream
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsStreaming(true);
      setIsVideoEnabled(true);
      
      // Add to existing peer connections
      peerConnectionsRef.current.forEach(peerConnection => {
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });
      });
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera or microphone. Please check your permissions.");
    }
  };
  
  // Stop local video stream
  const stopLocalStream = () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      
      setIsStreaming(false);
      setIsScreenSharing(false);
    } catch (error) {
      console.error("Error stopping local stream:", error);
    }
  };
  
  // Toggle audio mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const enabled = !audioTracks[0].enabled;
        audioTracks[0].enabled = enabled;
        setIsMuted(!enabled);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const enabled = !videoTracks[0].enabled;
        videoTracks[0].enabled = enabled;
        setIsVideoEnabled(enabled);
      }
    }
  };

  // Start screen sharing
  const startScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Switch back to camera
        await startLocalStream();
        setIsScreenSharing(false);
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: false
      });
      
      // Save old video track to restore later
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      const oldAudioTrack = localStreamRef.current.getAudioTracks()[0];
      
      // Replace video track in all peer connections
      const videoTrack = stream.getVideoTracks()[0];
      
      peerConnectionsRef.current.forEach(pc => {
        const senders = pc.getSenders();
        const sender = senders.find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
      
      // Create a new stream with screen video and original audio
      const newStream = new MediaStream();
      newStream.addTrack(videoTrack);
      if (oldAudioTrack) {
        newStream.addTrack(oldAudioTrack);
      }
      
      // Update local video
      localStreamRef.current = newStream;
      localVideoRef.current.srcObject = newStream;
      
      // Handle the "ended" event when user stops sharing
      videoTrack.onended = () => {
        startLocalStream(); // Switch back to camera
        setIsScreenSharing(false);
      };
      
      setIsScreenSharing(true);
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  };
  
  // Join a room
  const joinRoom = (roomToJoin = null) => {
    try {
      // Use provided room ID or get from input
      const roomIdToJoin = typeof roomToJoin === 'string' ? 
        roomToJoin : 
        (roomInputRef.current ? roomInputRef.current.value.trim() : '');
      
      if (!roomIdToJoin) {
        alert("Please enter a room ID");
        return;
      }

      setRoomId(roomIdToJoin);
      
      // Check if user is an artist creating their own room
      const isArtistRoom = isArtist && roomIdToJoin.includes(`artist_${artistId}`);
      setIsArtistStream(isArtistRoom);
      
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'join_room',
          roomId: roomIdToJoin,
          username: username,
          is_artist_room: isArtistRoom
        }));
      } else {
        alert("Not connected to server. Please wait or refresh the page.");
      }
    } catch (error) {
      console.error("Error joining room:", error);
    }
  };
  
  // Create a new room
  const createRoom = () => {
    try {
      const roomName = roomInputRef.current.value.trim();
      if (!roomName) {
        alert("Please enter a room name");
        return;
      }
      
      // Simply join the room - it will be created if it doesn't exist
      joinRoom(roomName);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };
  
  // Create an artist room
  const createArtistRoom = () => {
    try {
      if (!isArtist) {
        alert("Only artists can create artist rooms");
        return;
      }
      
      // Format artist room ID
      const artistRoomId = `artist_${artistId}`;
      
      // Set stream info
      setStreamInfo({
        title: streamInfo.title || `${username}'s Live Stream`,
        description: streamInfo.description || 'Welcome to my stream!'
      });
      
      // Join the room as an artist
      joinRoom(artistRoomId);
    } catch (error) {
      console.error("Error creating artist room:", error);
    }
  };
  
  // Update stream info
  const updateStreamInfo = (newInfo) => {
    setStreamInfo({
      ...streamInfo,
      ...newInfo
    });
  };
  
  // Leave the current room
  const leaveRoom = () => {
    try {
      // Stop streaming
      stopLocalStream();
      
      // Close all peer connections
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      setPeers(new Map());
      
      setIsInRoom(false);
      setRoomId('');
      setReceivedMessages([]);
      setIsArtistStream(false);
      
      // Request available rooms again
      requestAvailableRooms();
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  };
  
  // Refresh available rooms
  const refreshRooms = () => {
    requestAvailableRooms();
  };
  
  // Send a chat message
  const sendMessage = () => {
    try {
      if (messageInput.trim() && socketRef.current && socketRef.current.readyState === WebSocket.OPEN && isInRoom) {
        socketRef.current.send(JSON.stringify({
          type: 'chat',
          roomId: roomId,
          message: messageInput
        }));
        setMessageInput('');
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  
  // Check if a room is an artist room
  const isArtistRoom = (roomId) => {
    return roomId && roomId.startsWith('artist_');
  };
  
  // Get artist info for a room
  const getArtistInfo = (roomId) => {
    if (roomInfo && roomInfo[roomId]) {
      return roomInfo[roomId];
    }
    return null;
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h2 className="text-white text-xl font-bold mb-4">WebRTC Live Video Chat</h2>
      
      {/* Connection status */}
      <div className={`mb-4 px-3 py-2 rounded text-white flex items-center ${isConnected ? 'bg-green-600' : 'bg-red-600'}`}>
        <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-300' : 'bg-red-300'}`}></div>
        <span>{isConnected ? 'Server Connected' : 'Server Disconnected'}</span>
        {connectionError && <span className="ml-2 text-sm">({connectionError})</span>}
      </div>
      <div className="mb-4">
  <button 
    onClick={debugConnection}
    className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
  >
    Debug Connection
  </button>
</div>
      {/* Room joining controls */}
      {!isInRoom ? (
        <div className="bg-gray-800 p-4 rounded mb-4">
          <h3 className="text-white mb-2">Join or Create a Room</h3>
          <div className="flex gap-2 mb-4">
            <input
              ref={roomInputRef}
              type="text"
              placeholder="Enter room ID"
              className="flex-1 px-3 py-2 bg-gray-700 text-white rounded"
            />
            <button 
              onClick={joinRoom}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={!isConnected}
            >
              Join Room
            </button>
            <button 
              onClick={createRoom}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              disabled={!isConnected}
            >
              Create Room
            </button>
            
            {/* Artist streaming button */}
            {isArtist && (
              <button 
                onClick={createArtistRoom}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                disabled={!isConnected}
              >
                Start Artist Stream
              </button>
            )}
          </div>
          
          {/* Stream info form for artists */}
          {isArtist && (
            <div className="mb-4 p-3 bg-gray-700 rounded">
              <h3 className="text-white mb-2">Stream Information</h3>
              <div className="mb-2">
                <label className="text-gray-300 block mb-1">Stream Title</label>
                <input 
                  type="text" 
                  value={streamInfo.title}
                  onChange={(e) => updateStreamInfo({ title: e.target.value })}
                  placeholder="Enter your stream title"
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                />
              </div>
              <div>
                <label className="text-gray-300 block mb-1">Description</label>
                <textarea 
                  value={streamInfo.description}
                  onChange={(e) => updateStreamInfo({ description: e.target.value })}
                  placeholder="Describe your stream..."
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                  rows="3"
                />
              </div>
            </div>
          )}
          
          {/* Available rooms section */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white">Available Rooms</h3>
              <button
                onClick={refreshRooms}
                className="px-2 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
                disabled={!isConnected}
              >
                Refresh
              </button>
            </div>
            
            <div className="bg-gray-900 p-3 rounded max-h-60 overflow-y-auto">
              {availableRooms.length === 0 ? (
                <div className="text-gray-500 text-center py-4">No rooms available</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableRooms.map((room, index) => (
                    <div 
                      key={index}
                      className={`bg-gray-800 p-2 rounded flex justify-between items-center cursor-pointer hover:bg-gray-700 ${isArtistRoom(room) ? 'border-l-4 border-purple-500' : ''}`}
                      onClick={() => joinRoom(room)}
                    >
                      <div className="flex-1">
                        <span className="text-white truncate flex items-center">
                          {isArtistRoom(room) && <span className="text-purple-400 mr-1">🎭</span>}
                          {room}
                        </span>
                        {isArtistRoom(room) && getArtistInfo(room) && (
                          <p className="text-gray-400 text-xs">
                            {getArtistInfo(room).username}'s stream
                          </p>
                        )}
                      </div>
                      <button
                        className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          joinRoom(room);
                        }}
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 p-4 rounded mb-4 flex justify-between items-center">
          <div>
            <span className="text-white">Room: </span>
            <span className={`font-bold ${isArtistStream ? 'text-purple-400' : 'text-green-400'}`}>
              {roomId}
              {isArtistStream && <span className="ml-2 text-purple-300">🎭 Artist Stream</span>}
            </span>
            <span className="ml-4 text-white">Participants: </span>
            <span className="text-blue-400 font-bold">{peers.size + 1}</span>
          </div>
          <button 
            onClick={leaveRoom}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Leave Room
          </button>
        </div>
      )}
      
      {isInRoom && (
        <>
          {/* Artist streaming controls */}
          {isArtist && isArtistStream && (
            <ArtistStreamingControls 
              streamInfo={streamInfo} 
              updateStreamInfo={updateStreamInfo}
              toggleMute={toggleMute}
              toggleVideo={toggleVideo}
              startScreenShare={startScreenShare}
              isMuted={isMuted}
              isVideoEnabled={isVideoEnabled}
              isScreenSharing={isScreenSharing}
            />
          )}
          
          {/* Media controls for regular users */}
          {(!isArtist || !isArtistStream) && (
            <div className="bg-gray-800 p-3 rounded mb-4 flex gap-2">
              <button
                onClick={toggleMute}
                className={`px-3 py-2 rounded flex items-center ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  onClick={toggleVideo}
                  className={`px-3 py-2 rounded flex items-center ${isVideoEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {isVideoEnabled ? 'Disable Video' : 'Enable Video'}
                </button>
                <button
                  onClick={startScreenShare}
                  className={`px-3 py-2 rounded flex items-center ${isScreenSharing ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                </button>
              </div>
            )}
            
            {/* Video area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Local video */}
              <div className="bg-gray-800 rounded overflow-hidden">
                <h3 className="text-white p-2 bg-gray-700">Your Video</h3>
                <div className="aspect-video bg-black relative">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    className={`w-full h-full object-cover ${
                      !isVideoEnabled ? 'opacity-0' : 'opacity-100'
                    }`}
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      Video disabled
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
                    {username} {isMuted && '(muted)'}
                  </div>
                </div>
              </div>
              
              {/* Remote videos */}
              <div className="bg-gray-800 rounded overflow-hidden">
                <h3 className="text-white p-2 bg-gray-700">Remote Videos</h3>
                <div className="aspect-video bg-black flex items-center justify-center">
                  {peers.size === 0 ? (
                    <div className="text-gray-500">No other participants</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full h-full p-2">
                      {Array.from(peers).map(([peerId, stream]) => (
                        <div key={peerId} className="relative bg-gray-900 rounded overflow-hidden">
                          <video
                            autoPlay
                            ref={(element) => {
                              if (element) element.srcObject = stream;
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Chat area */}
            <div className="bg-gray-800 rounded">
              <h3 className="text-white p-2 bg-gray-700">Chat</h3>
              <div className="max-h-60 overflow-y-auto p-2">
                {receivedMessages.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">No messages yet</div>
                ) : (
                  receivedMessages.map((msg, index) => (
                    <div key={index} className="mb-2">
                      <span className="text-blue-400 font-bold">{msg.username}: </span>
                      <span className="text-white">{msg.message}</span>
                      <span className="text-gray-500 text-xs ml-2">{msg.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-gray-700 flex">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-l"
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };
  
  export default WebRTCLivestream;
