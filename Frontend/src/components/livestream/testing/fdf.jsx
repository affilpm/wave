// src/components/LiveStream/LiveStreamPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import AgoraRTM from 'agora-rtm-sdk';
import axios from 'axios';
import api from '../../../api';
import ChatBox from '../chat';

const LiveStreamPage = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [streamInfo, setStreamInfo] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [messages, setMessages] = useState([]);
  
  // References for Agora SDK
  const clientRef = useRef(null);
  const rtmClientRef = useRef(null);
  const rtmChannelRef = useRef(null);
  const localTrackRef = useRef({ audioTrack: null, videoTrack: null });
  const remoteUsersRef = useRef({});
  
  // Container refs
  const videoContainerRef = useRef(null);
  
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        
        // Fetch stream details
        const streamResponse = await api.get(`/api/agora/streams/${streamId}/`);
        setStreamInfo(streamResponse.data);
        
        // Determine if current user is host
        const urlParams = new URLSearchParams(window.location.search);
        const role = urlParams.get('role') || 'audience';
        setIsHost(role === 'host');
        
        // Get Agora token
        const tokenResponse = await api.get('/api/agora/token/', {
          params: {
            channel: streamResponse.data.channel_name,
            role: role
          }
        });
        
        const { token, rtm_token, channel, uid, app_id, username } = tokenResponse.data;
        
        // Initialize Agora RTC
        await initializeRTC(app_id, channel, token, uid);
        
        // Initialize Agora RTM for chat
        await initializeRTM(app_id, rtm_token, uid, username, channel);
        
        // Load existing chat messages
        const messagesResponse = await api.get(`/api/streams/${streamId}/chat/`);
        setMessages(messagesResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error initializing stream:', err);
        setError('Failed to join the stream. Please try again later.');
        setLoading(false);
      }
    };
    
    initialize();
    
    // Cleanup function
    return () => {
      leaveChannel();
    };
  }, [streamId]);
  
  const initializeRTC = async (appId, channel, token, uid) => {
    // Create RTC client
    clientRef.current = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
    
    // Set client role
    await clientRef.current.setClientRole(isHost ? 'host' : 'audience');
    
    // Event listeners
    clientRef.current.on('user-published', handleUserPublished);
    clientRef.current.on('user-unpublished', handleUserUnpublished);
    clientRef.current.on('user-joined', handleUserJoined);
    clientRef.current.on('user-left', handleUserLeft);
    
    // Join channel
    await clientRef.current.join(appId, channel, token, uid);
    
    // If host, create and publish tracks
    if (isHost) {
      localTrackRef.current.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localTrackRef.current.videoTrack = await AgoraRTC.createCameraVideoTrack();
      
      // Play local video track
      localTrackRef.current.videoTrack.play(videoContainerRef.current);
      
      // Publish local tracks
      await clientRef.current.publish([
        localTrackRef.current.audioTrack,
        localTrackRef.current.videoTrack
      ]);
    }
  };
  
  const initializeRTM = async (appId, token, uid, username, channel) => {
    // Create RTM client
    rtmClientRef.current = AgoraRTM.createInstance(appId);
    
    // Login
    await rtmClientRef.current.login({ uid: uid.toString(), token });
    
    // Create and join channel
    rtmChannelRef.current = rtmClientRef.current.createChannel(channel);
    await rtmChannelRef.current.join();
    
    // Set up message handler
    rtmChannelRef.current.on('ChannelMessage', (message, memberId) => {
      try {
        const msgData = JSON.parse(message.text);
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: Date.now(), // Generate a temporary ID
            sender: { id: memberId, username: msgData.username },
            message: msgData.message,
            timestamp: new Date().toISOString()
          }
        ]);
      } catch (err) {
        console.error('Error processing RTM message:', err);
      }
    });
    
    // Member join/leave handlers
    rtmChannelRef.current.on('MemberJoined', handleMemberJoined);
    rtmChannelRef.current.on('MemberLeft', handleMemberLeft);
  };
  
  const handleUserPublished = async (user, mediaType) => {
    // Subscribe to the remote user
    await clientRef.current.subscribe(user, mediaType);
    
    // Store the remote user
    remoteUsersRef.current[user.uid] = user;
    
    // If it's a video track, play it
    if (mediaType === 'video') {
      // Create a div for this user's video
      const playerContainer = document.createElement('div');
      playerContainer.id = `player-${user.uid}`;
      playerContainer.style.width = '100%';
      playerContainer.style.height = '100%';
      videoContainerRef.current.appendChild(playerContainer);
      
      // Play the video
      user.videoTrack.play(`player-${user.uid}`);
    }
    
    // If it's audio, play it
    if (mediaType === 'audio') {
      user.audioTrack.play();
    }
    
    // Update UI
    setUserCount(prev => prev + 1);
  };
  
  const handleUserUnpublished = (user, mediaType) => {
    // If it's a video, handle cleanup
    if (mediaType === 'video') {
      const playerElement = document.getElementById(`player-${user.uid}`);
      if (playerElement) {
        playerElement.remove();
      }
    }
  };
  
  const handleUserJoined = (user) => {
    console.log('User joined:', user.uid);
    // Update count
    setUserCount(prev => prev + 1);
  };
  
  const handleUserLeft = (user) => {
    console.log('User left:', user.uid);
    // Remove user from remoteUsers
    if (remoteUsersRef.current[user.uid]) {
      delete remoteUsersRef.current[user.uid];
    }
    
    // Remove the video element
    const playerElement = document.getElementById(`player-${user.uid}`);
    if (playerElement) {
      playerElement.remove();
    }
    
    // Update count
    setUserCount(prev => prev - 1);
  };
  
  const handleMemberJoined = (memberId) => {
    console.log('Member joined RTM:', memberId);
  };
  
  const handleMemberLeft = (memberId) => {
    console.log('Member left RTM:', memberId);
  };
  
  const leaveChannel = async () => {
    try {
      // Leave RTM channel
      if (rtmChannelRef.current) {
        await rtmChannelRef.current.leave();
      }
      
      // Logout from RTM
      if (rtmClientRef.current) {
        await rtmClientRef.current.logout();
      }
      
      // Close local tracks
      if (localTrackRef.current.audioTrack) {
        localTrackRef.current.audioTrack.close();
      }
      if (localTrackRef.current.videoTrack) {
        localTrackRef.current.videoTrack.close();
      }
      
      // Leave RTC channel
      if (clientRef.current) {
        await clientRef.current.leave();
      }
      
      // If host, also end the stream
      if (isHost && streamInfo) {
        await api.post('/api/agora/end-stream/', {
          channel: streamInfo.channel_name
        });
      } else if (streamInfo) {
        // If audience, mark as left
        await api.post('/api/agora/leave-stream/', {
          channel: streamInfo.channel_name
        });
      }
    } catch (err) {
      console.error('Error leaving stream:', err);
    }
  };
  
  const handleEndStream = async () => {
    await leaveChannel();
    navigate('/streams');
  };
  
  const handleSendMessage = async (message) => {
    try {
      // Send to server
      const response = await api.post(`/api/agora/streams/${streamId}/chat/`, {
        message
      });
      
      // Send to RTM channel for real-time updates
      if (rtmChannelRef.current) {
        await rtmChannelRef.current.sendMessage({
          text: JSON.stringify({
            username: response.data.sender.username,
            message: message
          })
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading stream...</div>;
  }
  
  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>;
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 h-screen">
      {/* Video Stream Area - Takes 3/4 of the screen on large devices */}
      <div className="lg:col-span-3 bg-black relative">
        <div 
          ref={videoContainerRef} 
          className="w-full h-full"
        ></div>
        
        {/* Stream info overlay */}
        <div className="absolute top-0 left-0 p-4 text-white bg-black bg-opacity-50 w-full">
          <h1 className="text-xl font-bold">{streamInfo?.title}</h1>
          <p>Host: {streamInfo?.host.username}</p>
          <p>Viewers: {userCount}</p>
        </div>
        
        {/* Controls */}
        <div className="absolute bottom-0 left-0 p-4 w-full flex justify-center">
          {isHost && (
            <button 
              onClick={handleEndStream}
              className="bg-red-600 text-white px-4 py-2 rounded-full"
            >
              End Stream
            </button>
          )}
          {!isHost && (
            <button 
              onClick={handleEndStream}
              className="bg-gray-600 text-white px-4 py-2 rounded-full"
            >
              Leave Stream
            </button>
          )}
        </div>
      </div>
      
      {/* Chat Area - Takes 1/4 of the screen on large devices */}
      <div className="lg:col-span-1 border-l border-gray-300 flex flex-col h-full">
        <ChatBox 
          messages={messages} 
          onSendMessage={handleSendMessage} 
        />
      </div>
    </div>
  );
};

export default LiveStreamPage;
