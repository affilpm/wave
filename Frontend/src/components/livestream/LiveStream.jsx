import React, { useEffect, useState, useRef } from 'react';

const WebRTCLivestream = ({ username = 'Anonymous' }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [peers, setPeers] = useState(new Map());
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [connectionError, setConnectionError] = useState('');
  
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  
  const roomInputRef = useRef(null);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  
  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

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

  const connectWebSocket = () => {
    console.log("Attempting to connect to WebSocket...");
    
    try {
      // Use secure WebSocket if site is using HTTPS
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = '8001'; // Your WebSocket server port
      const wsUrl = `${protocol}//${host}:${port}/ws/webrtc/`;
      
      console.log(`Connecting to ${wsUrl}`);
      const socketConnection = new WebSocket(wsUrl);
      socketRef.current = socketConnection;
      
      socketConnection.onopen = () => {
        console.log("WebSocket connected successfully");
        setIsConnected(true);
        setConnectionError('');
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

  // Handle signaling messages from the server
  const handleSignalingMessage = async (data) => {
    try {
      const type = data.type;
      
      if (type === 'room_joined') {
        console.log(`Joined room ${data.roomId} with ${data.existingParticipants} existing participants`);
        setIsInRoom(true);
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
    } catch (error) {
      console.error("Error stopping local stream:", error);
    }
  };
  
  // Join a room
  const joinRoom = () => {
    try {
      const roomToJoin = roomInputRef.current.value.trim();
      if (!roomToJoin) {
        alert("Please enter a room ID");
        return;
      }
      
      setRoomId(roomToJoin);
      
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'join_room',
          roomId: roomToJoin,
          username: username
        }));
      } else {
        alert("Not connected to server. Please wait or refresh the page.");
      }
    } catch (error) {
      console.error("Error joining room:", error);
    }
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
    } catch (error) {
      console.error("Error leaving room:", error);
    }
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

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h2 className="text-white text-xl font-bold mb-4">WebRTC Live Video Chat</h2>
      
      {/* Connection status */}
      <div className={`mb-4 px-3 py-2 rounded text-white flex items-center ${isConnected ? 'bg-green-600' : 'bg-red-600'}`}>
        <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-300' : 'bg-red-300'}`}></div>
        <span>{isConnected ? 'Server Connected' : 'Server Disconnected'}</span>
        {connectionError && <span className="ml-2 text-sm">({connectionError})</span>}
      </div>
      
      {/* Room joining controls */}
      {!isInRoom ? (
        <div className="bg-gray-800 p-4 rounded mb-4">
          <h3 className="text-white mb-2">Join a Room</h3>
          <div className="flex gap-2">
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
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 p-4 rounded mb-4 flex justify-between items-center">
          <div>
            <span className="text-white">Room: </span>
            <span className="text-green-400 font-bold">{roomId}</span>
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
          {/* Video grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Local video */}
            <div className="bg-gray-800 p-3 rounded">
              <h3 className="text-white mb-2">You ({username})</h3>
              <div className="relative">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  muted 
                  playsInline
                  className="w-full bg-black rounded"
                  style={{ height: '240px' }}
                />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-70 rounded">
                    Starting camera...
                  </div>
                )}
              </div>
            </div>
            
            {/* Remote videos */}
            {Array.from(peers.entries()).map(([peerId, stream]) => (
              <div key={peerId} className="bg-gray-800 p-3 rounded">
                <h3 className="text-white mb-2">Peer {peerId.substring(0, 8)}...</h3>
                <div className="relative">
                  <video 
                    autoPlay 
                    playsInline
                    className="w-full bg-black rounded"
                    style={{ height: '240px' }}
                    ref={el => {
                      if (el) el.srcObject = stream;
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* Chat section */}
          <div className="bg-gray-800 p-3 rounded">
            <h3 className="text-white mb-2">Chat</h3>
            
            <div className="bg-gray-900 h-40 overflow-y-auto p-2 rounded mb-2">
              {receivedMessages.length === 0 ? (
                <div className="text-gray-500 text-center mt-4">No messages yet</div>
              ) : (
                receivedMessages.map((msg, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-blue-400">{msg.username}</span>
                    <span className="text-gray-400 text-xs ml-1">[{msg.timestamp}]</span>
                    <span className="text-white ml-2">{msg.message}</span>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button 
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={!isInRoom || !isConnected}
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