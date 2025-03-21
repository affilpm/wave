import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { apiInstance } from '../../../api';
import { 
  Play, Pause, ChevronLeft, User, Users, X, RefreshCw, 
  Video, VideoOff, Mic, MicOff
} from "lucide-react";

const VideoStreamingPage = () => {
  // Get stream ID from URL params
  const { streamId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get selected stream from navigation state or fetch it
  const [selectedStream, setSelectedStream] = useState(
    location.state?.selectedStream || null
  );
  
  // Get user data from Redux instead of making an API request
  const user = useSelector(state => state.user);
  
  // Video state variables
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [started, setStarted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Not connected");
  const [errorMessage, setErrorMessage] = useState("");
  const [networkQuality, setNetworkQuality] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamSettings, setStreamSettings] = useState({
    appId: "",
    channel: "",
    token: "",
    uid: 0
  });
  const [showControls, setShowControls] = useState(false);
  const [autoHideControlsTimer, setAutoHideControlsTimer] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [username, setUsername] = useState(user.username || "Viewer"); // Use username from Redux

  // References
  const clientRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const streamContainerRef = useRef(null);

  // Initialize on page load
  useEffect(() => {
    initializeAgora();
    
    // If we don't have the stream info from navigation state, fetch it
    if (!selectedStream) {
      fetchStreamInfo();
    } else {
      // If we have the stream info, start streaming
      startStream(selectedStream);
    }
    
    // Set username from Redux directly
    setUsername(user.username || "Viewer");
    
    // Cleanup function
    return () => {
      cleanupResources();
    };
  }, [streamId, user.username]);

  // Auto-hide controls after inactivity
  useEffect(() => {
    if (showControls && started) {
      // Clear any existing timer
      if (autoHideControlsTimer) {
        clearTimeout(autoHideControlsTimer);
      }
      
      // Set new timer to hide controls after 3 seconds of inactivity
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      
      setAutoHideControlsTimer(timer);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [showControls, started]);

  // Handle network quality updates
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !started) return;
    
    const handleNetworkQuality = (stats) => {
      setNetworkQuality({
        downlinkNetworkQuality: stats.downlinkNetworkQuality,
        uplinkNetworkQuality: stats.uplinkNetworkQuality
      });
    };
    
    client.on("network-quality", handleNetworkQuality);
    
    return () => {
      client.off("network-quality", handleNetworkQuality);
    };
  }, [started]);

  // Fetch specific stream info if not passed via navigation state
  const fetchStreamInfo = async () => {
    try {
      setIsLoading(true);
      const response = await apiInstance.api.get(`/api/livestream/streams/${streamId}/`);
      setSelectedStream(response.data);
      startStream(response.data);
    } catch (error) {
      console.error("Error fetching stream info:", error);
      setErrorMessage("Could not fetch stream information");
      setIsLoading(false);
    }
  };

  // Clean up resources
  const cleanupResources = () => {
    if (clientRef.current) {
      clientRef.current.leave().catch(console.error);
    }
  };
  
  // Initialize the Agora engine
  const initializeAgora = async () => {
    try {
      // If there's an existing client, clean it up
      if (clientRef.current) {
        clientRef.current.removeAllListeners();
      }
      
      // Create a new Agora client
      const config = { 
        mode: "live", 
        codec: "vp8" 
      };
      
      clientRef.current = AgoraRTC.createClient(config);
      console.log("Agora client created with config:", config);
      
      // Setup event listeners
      setupEventListeners();
      
      setConnectionStatus("Initialized");
      setErrorMessage("");
    } catch (error) {
      console.error("Error initializing Agora:", error);
      setErrorMessage(`Initialization error: ${error.message}`);
    }
  };
  
  // Get token from backend
  const getAgoraToken = async (channelName) => {
    try {
      setConnectionStatus("Getting token...");
      
      const params = {
        role: 'audience',
        channel: channelName
      };
      
      const response = await apiInstance.api.get('/api/livestream/token/', {
        params: params
      });
      
      const { token, channel, app_id, uid } = response.data;
      
      setStreamSettings({
        appId: app_id,
        channel: channel,
        token: token,
        uid: uid
      });
      
      console.log("Token received:", token);
      setConnectionStatus("Token received");
      
      return { token, channel, app_id, uid };
    } catch (error) {
      console.error("Error getting token:", error);
      setErrorMessage(`Token error: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  };
  
  // Set up event listeners for the Agora client
  const setupEventListeners = () => {
    const client = clientRef.current;
    
    if (!client) return;
    
    // Connection state change
    client.on("connection-state-change", (curState, prevState) => {
      console.log("Connection state changed from", prevState, "to", curState);
      setConnectionStatus(curState);
    });
    
    // When a remote user publishes a stream
    client.on("user-published", async (user, mediaType) => {
      console.log("User published:", user.uid, mediaType);
      
      try {
        await client.subscribe(user, mediaType);
        console.log("Subscribed to:", user.uid, mediaType);
        
        if (mediaType === "video") {
          // Add user to state
          setRemoteUsers(prevUsers => {
            if (!prevUsers.find(u => u.uid === user.uid)) {
              return [...prevUsers, user];
            }
            return prevUsers;
          });
          
          // Play the remote video with retry logic
          if (user.videoTrack) {
            setTimeout(() => {
              const attemptPlay = async (attempts = 0) => {
                if (attempts > 3) {
                  console.error("Failed to play remote video after multiple attempts");
                  return;
                }
                
                try {
                  if (remoteVideoRefs.current[user.uid]) {
                    await user.videoTrack.play(remoteVideoRefs.current[user.uid]);
                    console.log("Remote video playing successfully");
                  } else {
                    console.log("Remote video ref not ready, retrying...");
                    setTimeout(() => attemptPlay(attempts + 1), 500);
                  }
                } catch (error) {
                  console.error("Error playing remote video:", error);
                  setTimeout(() => attemptPlay(attempts + 1), 500);
                }
              };
              
              attemptPlay();
            }, 500); // Added delay before first attempt
          }
        }
        
        if (mediaType === "audio" && user.audioTrack) {
          user.audioTrack.play();
        }
      } catch (error) {
        console.error("Error subscribing to user:", error);
      }
    });
    
    // When a remote user unpublishes a stream
    client.on("user-unpublished", (user, mediaType) => {
      console.log("User unpublished:", user.uid, mediaType);
      
      if (mediaType === "video") {
        if (user.videoTrack) {
          user.videoTrack.stop();
        }
      }
      if (mediaType === "audio") {
        if (user.audioTrack) {
          user.audioTrack.stop();
        }
      }
    });
    
    // When a remote user leaves the channel
    client.on("user-left", (user) => {
      console.log("User left:", user.uid);
      
      setRemoteUsers(prevUsers => {
        return prevUsers.filter(u => u.uid !== user.uid);
      });
    });
    
    // Exception handling
    client.on("exception", (event) => {
      console.warn("Exception:", event);
      setErrorMessage(`Exception: ${event.code} - ${event.msg}`);
    });
  };
  
  // Start watching a stream
  const startStream = async (stream) => {
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const client = clientRef.current;
      if (!client) {
        throw new Error("Client not initialized");
      }
      
      // Get token from backend
      const { token, channel, app_id, uid } = await getAgoraToken(stream.channel_name);
      
      // Set role as audience
      await client.setClientRole("audience");
      
      console.log("Joining channel as audience...");
      setConnectionStatus("Joining channel...");
      
      // Join the channel
      try {
        await client.join(app_id, channel, token, uid);
        console.log("Successfully joined channel as audience!");
        setConnectionStatus("Joined as audience");
      } catch (error) {
        console.error("Error joining channel:", error.code, error.message);
        setErrorMessage(`Join error: ${error.message} (Code: ${error.code})`);
        throw error;
      }
      
      setStarted(true);
      
      // Show controls briefly when stream starts
      setShowControls(true);
    } catch (error) {
      console.error("Error starting stream:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Leave the channel
  const leaveChannel = async () => {
    setIsLoading(true);
    
    try {
      const client = clientRef.current;
      if (!client) return;
      
      // Stop all video & audio tracks first
      remoteUsers.forEach(user => {
        if (user.videoTrack) {
          user.videoTrack.stop();
        }
        if (user.audioTrack) {
          user.audioTrack.stop();
        }
      });
      
      // Leave the channel
      await client.leave();
      console.log("Left channel successfully");
      
      setRemoteUsers([]);
      setStarted(false);
      setConnectionStatus("Not connected");
      setErrorMessage("");
      setNetworkQuality(null);
      
      // Navigate back to stream listing
      navigate('/');
      
    } catch (error) {
      console.error("Error leaving channel:", error);
      setErrorMessage(`Leave error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle mouse movement to show controls
  const handleMouseMove = () => {
    setShowControls(true);
  };

  // Get artist full name with fallbacks
  const getArtistName = (stream) => {
    if (!stream) return 'Unknown';
    
    if (stream.artist) {
      const firstName = stream.artist.first_name || '';
      const lastName = stream.artist.last_name || '';
      
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
      
      return stream.artist.username || 'Unknown Artist';
    }
    
    // Fallback to user if artist isn't available
    if (stream.user) {
      const firstName = stream.user.first_name || '';
      const lastName = stream.user.last_name || '';
      
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
      
      return stream.user.username || 'Unknown';
    }
    
    return 'Unknown Artist';
  };

  // Render quality indicator
  const renderQualityIndicator = () => {
    if (!networkQuality) return null;

    // Convert quality to descriptive text (lower is better in Agora's scale)
    const getQualityText = (quality) => {
      switch(quality) {
        case 0: return "Unknown";
        case 1: return "Excellent";
        case 2: return "Good";
        case 3: return "Fair";
        case 4: return "Poor";
        case 5: return "Bad";
        case 6: return "Very Bad";
        default: return "Unknown";
      }
    };
    
    const getQualityColor = (quality) => {
      switch(quality) {
        case 1: return "text-green-500";
        case 2: return "text-green-400";
        case 3: return "text-yellow-500";
        case 4: return "text-orange-500";
        case 5: return "text-red-500";
        case 6: return "text-red-600";
        default: return "text-gray-400";
      }
    };

    return (
      <div className="bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-sm flex items-center">
        <span className="mr-1">Quality:</span>
        <span className={getQualityColor(networkQuality.downlinkNetworkQuality)}>
          {getQualityText(networkQuality.downlinkNetworkQuality)}
        </span>
      </div>
    );
  };

  // Render video stream
  return (
    <div 
      ref={streamContainerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col h-screen"
    >
      {/* Header - fixed height */}
      <div className="bg-gray-900 px-6 py-3 flex items-center justify-between border-b border-gray-800 h-16 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/livestreams')} 
            className="text-gray-400 hover:text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-md flex items-center">
            <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span> 
            LIVE
          </span>
          <h3 className="text-lg font-semibold text-white">
            {selectedStream?.title || 'Untitled Stream'}
          </h3>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-gray-400">
            <Users size={16} />
            <span className="text-sm">{viewerCount || selectedStream?.viewer_count || 0}</span>
          </div>
          {renderQualityIndicator()}
        </div>
      </div>

      {/* Main content area - flexible height between header and bottom */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video container */}
        <div className="flex-1 bg-black flex items-center justify-center"
          onMouseMove={handleMouseMove}
          onClick={() => setShowControls(showControls => !showControls)}
        >
          {remoteUsers.length > 0 ? (
            remoteUsers.map(user => (
              <div key={user.uid} className="w-full h-full relative">
                <div 
                  ref={el => remoteVideoRefs.current[user.uid] = el} 
                  className="w-full h-full"
                />
                
                {/* Overlay controls - only show on hover or when controls active */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="absolute top-4 left-4">
                    <div className="flex items-center bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                      <span className="text-white text-sm font-medium">LIVE</span>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-4 left-0 right-0 px-4">
                    <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
                      <h3 className="font-medium text-white">
                        {selectedStream?.title || 'Untitled Stream'}
                      </h3>
                      <p className="text-sm text-gray-300">
                        {getArtistName(selectedStream)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white">
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <RefreshCw size={32} className="animate-spin mb-2" />
                  <p>{connectionStatus}...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center px-4">
                  <p className="mb-4">No streams available at the moment</p>
                  {errorMessage && (
                    <div className="bg-red-600/20 text-red-400 p-3 rounded-lg max-w-md text-sm">
                      {errorMessage}
                    </div>
                  )}
                  <button 
                    onClick={() => initializeAgora()} 
                    className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
                  >
                    Retry Connection
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation bar - mobile only */}
      <div className="bg-gray-900 border-t border-gray-800 py-3 px-4 flex justify-between items-center h-16 flex-shrink-0 lg:hidden">
        <button 
          onClick={leaveChannel} 
          className="flex items-center text-gray-400 hover:text-white"
        >
          <ChevronLeft size={20} className="mr-1" />
          <span>Exit</span>
        </button>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-gray-400">
            <Users size={16} />
            <span className="text-sm">{viewerCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Desktop controls */}
      <div className="hidden lg:block">
        <button 
          onClick={leaveChannel} 
          className="fixed top-20 left-4 z-30 bg-gray-900/80 text-white p-2 rounded-full shadow-lg hover:bg-gray-800 transition"
          title="Exit stream"
        >
          <X size={20} />
        </button>
      </div>

      {/* Connection status overlay */}
      {connectionStatus !== "CONNECTED" && started && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40">
          <div className="bg-gray-900 p-6 rounded-lg max-w-md text-center">
            <RefreshCw size={32} className="animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Connecting to stream</h3>
            <p className="text-gray-400 mb-4">Status: {connectionStatus}</p>
            {errorMessage && (
              <div className="bg-red-600/20 text-red-400 p-3 rounded-lg text-sm mb-4">
                {errorMessage}
              </div>
            )}
            <div className="flex justify-center space-x-3">
              <button 
                onClick={() => initializeAgora()} 
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
              >
                Retry
              </button>
              <button 
                onClick={leaveChannel} 
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug info - only visible in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-20 left-4 z-30 bg-black/80 text-white text-xs p-2 rounded">
          <div>Status: {connectionStatus}</div>
          <div>Remote users: {remoteUsers.length}</div>
          <div>Channel: {streamSettings.channel}</div>
          <div>Network: {networkQuality ? `${networkQuality.downlinkNetworkQuality}/6` : 'N/A'}</div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <RefreshCw size={32} className="animate-spin mx-auto mb-4" />
            <p className="text-xl">{connectionStatus}...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoStreamingPage;