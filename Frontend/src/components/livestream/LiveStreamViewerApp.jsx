import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { apiInstance } from '../../api';
import { Play, Pause, ChevronLeft, User, Users, Maximize, Minimize, X, RefreshCw, ArrowLeft, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { useNavigate } from 'react-router-dom';


const LivestreamViewerApp = () => {
  // State variables
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
  const [availableStreams, setAvailableStreams] = useState([]);
  const [selectedStream, setSelectedStream] = useState(null);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [videoInitialized, setVideoInitialized] = useState(false);
  // Add state for video aspect ratio
  const [videoAspectRatio, setVideoAspectRatio] = useState(16/9); // Default aspect ratio
  
  // Add state for polling interval ID to clean up
  const [pollingIntervalId, setPollingIntervalId] = useState(null);
  // Add state to track if stream has ended
  const [streamHasEnded, setStreamHasEnded] = useState(false);

  const navigate = useNavigate();
  // Reference to Agora client
  const clientRef = useRef(null);
  // References to video containers
  const remoteVideoRefs = useRef({});
  // Reference for fullscreen container
  const fullscreenContainerRef = useRef(null);
  // Reference for stream container
  const streamContainerRef = useRef(null);
  // Reference for video wrapper
  const videoWrapperRef = useRef(null);


  useEffect(() => {
    fetchAvailableStreams();
    initializeAgora();
    
    // Start interval for polling active streams - increase from 15 to 30 seconds
    const intervalId = setInterval(() => {
      if (!isLoading) {
        fetchAvailableStreams();
      }
    }, 30000); // Poll every 30 seconds
    
    setPollingIntervalId(intervalId);
    
    // Cleanup function
    return () => {
      cleanupResources();
      // Clear polling interval
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, []);


  useEffect(() => {
    if (started && selectedStream) {
      const isStreamStillActive = availableStreams.some(
        stream => stream.channel_name === selectedStream.channel_name
      );
      
      if (!isStreamStillActive && !streamHasEnded) {
        console.log("Stream has ended, leaving channel");
        setStreamHasEnded(true);
        setErrorMessage("The stream has ended");
        
        // Wait a moment to show the message before disconnecting
        setTimeout(() => {
          leaveChannel();
        }, 2000);
      }
    }
  }, [availableStreams, selectedStream, started]);


  useEffect(() => {
    if (!videoWrapperRef.current || !started) return;

    const updateVideoSize = () => {
      const container = videoWrapperRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const containerAspectRatio = containerWidth / containerHeight;

      const videoElements = container.querySelectorAll('.remote-video-element');
      videoElements.forEach(videoElement => {
        // If container is wider than video, fit to height
        if (containerAspectRatio > videoAspectRatio) {
          const newWidth = containerHeight * videoAspectRatio;
          videoElement.style.width = `${newWidth}px`;
          videoElement.style.height = '100%';
        } else {
          // If container is taller than video, fit to width
          const newHeight = containerWidth / videoAspectRatio;
          videoElement.style.width = '100%';
          videoElement.style.height = `${newHeight}px`;
        }
      });
    };

    // Initialize ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      updateVideoSize();
    });

    resizeObserver.observe(videoWrapperRef.current);
    
    // Call once to set initial size
    updateVideoSize();

    return () => {
      if (videoWrapperRef.current) {
        resizeObserver.unobserve(videoWrapperRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [started, videoAspectRatio, videoWrapperRef.current, videoInitialized]); // Added videoInitialized here

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

  // Clean up resources
  const cleanupResources = () => {
    if (clientRef.current) {
      clientRef.current.leave().catch(console.error);
    }
    
    // Clear polling interval
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
    }
  };

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      
      // When entering fullscreen, modify body to prevent scrolling
      if (document.fullscreenElement) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.body.style.overflow = ''; // Reset on unmount
    };
  }, []);

// Send heartbeat to update participant activity status
const sendHeartbeat = async () => {
  if (!started || !selectedStream) return;
  
  try {
    // Add a random jitter (0-2 seconds) to prevent all clients from hitting the server simultaneously
    const jitter = Math.floor(Math.random() * 2000);
    await new Promise(resolve => setTimeout(resolve, jitter));
    
    const response = await apiInstance.api.post('/api/livestream/participant/heartbeat/', {
      channel_name: selectedStream.channel_name
    });
    
    // Check if we need to update our local participant count
    if (response.data && response.data.active_participants) {
      setSelectedStream(prev => ({
        ...prev,
        participant_count: response.data.active_participants
      }));
    }
  } catch (error) {
    console.error("Error sending heartbeat:", error);
    // Don't show error message to user for heartbeat failures
  }
};


useEffect(() => {
  let heartbeatInterval;
  
  if (started && selectedStream) {
    // Send initial heartbeat
    sendHeartbeat();
    
    // Increase interval to 30 seconds instead of 20
    heartbeatInterval = setInterval(sendHeartbeat, 30000);
  }
  
  return () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
  };
}, [started, selectedStream]);

  // Fetch available streams
  const fetchAvailableStreams = async () => {
    try {
      setIsLoading(true);
      const response = await apiInstance.api.get('/api/livestream/streams/');
      
      // Update the participant count of the selected stream if it exists
      if (selectedStream) {
        const updatedStream = response.data.find(
          stream => stream.channel_name === selectedStream.channel_name
        );
        
        if (updatedStream) {
          // Create a new object to ensure React detects the state change
          setSelectedStream({...updatedStream});
        }
      }
      
      setAvailableStreams(response.data);
      console.log('Available streams:', response.data);
    } catch (error) {
      console.error("Error fetching streams:", error);
      setErrorMessage("Could not fetch available streams");
    } finally {
      setIsLoading(false);
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
  

  const setupEventListeners = () => {
    const client = clientRef.current;
    
    if (!client) return;
    
    // Connection state change
    client.on("connection-state-change", (curState, prevState) => {
      console.log("Connection state changed from", prevState, "to", curState);
      setConnectionStatus(curState);
      
      // If connection is interrupted or disconnected, check if stream still exists
      if (curState === "DISCONNECTED" && selectedStream) {
        fetchAvailableStreams();
      }
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
            // Get stream information to set proper aspect ratio
            user.videoTrack.getMediaStreamTrack().addEventListener('loadedmetadata', (e) => {
              if (e.target.videoWidth && e.target.videoHeight) {
                setVideoAspectRatio(e.target.videoWidth / e.target.videoHeight);
                console.log(`Video dimensions: ${e.target.videoWidth}x${e.target.videoHeight}`);
              }
            });
            
            setTimeout(() => {
              const attemptPlay = async (attempts = 0) => {
                if (attempts > 3) {
                  console.error("Failed to play remote video after multiple attempts");
                  return;
                }
                
                try {
                  if (remoteVideoRefs.current[user.uid]) {
                    await user.videoTrack.play(remoteVideoRefs.current[user.uid], {
                      fit: "contain" // Use contain mode to show full video
                    });
                    console.log("Remote video playing successfully");
                    setVideoInitialized(true);
                    
                    // Add this explicit call to update video size after successful play
                    if (videoWrapperRef.current) {
                      // Force resize calculation after video is initialized
                      const updateVideoSize = () => {
                        const container = videoWrapperRef.current;
                        if (!container) return;
                        
                        const containerWidth = container.clientWidth;
                        const containerHeight = container.clientHeight;
                        const containerAspectRatio = containerWidth / containerHeight;
                        
                        const videoElement = remoteVideoRefs.current[user.uid];
                        if (videoElement) {
                          if (containerAspectRatio > videoAspectRatio) {
                            const newWidth = containerHeight * videoAspectRatio;
                            videoElement.style.width = `${newWidth}px`;
                            videoElement.style.height = '100%';
                          } else {
                            const newHeight = containerWidth / videoAspectRatio;
                            videoElement.style.width = '100%';
                            videoElement.style.height = `${newHeight}px`;
                          }
                        }
                      };
                      
                      // Call immediately and also with a small delay to ensure DOM updates
                      updateVideoSize();
                      setTimeout(updateVideoSize, 100);
                    }
                  }
                } catch (error) {
                  console.error(`Error playing video (attempt ${attempts + 1}):`, error);
                  
                  // Wait and retry
                  setTimeout(() => {
                    attemptPlay(attempts + 1);
                  }, 1000);
                }
              };
              
              attemptPlay();
            }, 500);
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
      
      // Check if this was the host leaving
      if (selectedStream && selectedStream.host_id === user.uid) {
        console.log("Host has left, checking if stream is ended");
        fetchAvailableStreams();
      }
    });
    
    // Exception handling
    client.on("exception", (event) => {
      console.warn("Exception:", event);
      setErrorMessage(`Exception: ${event.code} - ${event.msg}`);
      
      // For channel closed errors, refresh stream list
      if (event.code === 'CHANNEL_CLOSED') {
        fetchAvailableStreams();
      }
    });
  };
  
  // Start watching a stream
  const startStream = async (stream) => {
    if (started && selectedStream?.id === stream.id) {
      // If already watching this stream, stop it
      leaveChannel();
      return;
    }
    
    // Update selected stream
    setSelectedStream(stream);
    
    // Reset stream ended flag
    setStreamHasEnded(false);
    
    // If already watching a different stream, leave that channel first
    if (started) {
      await leaveChannel();
    }
    
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
      
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
      
      // Leave the channel
      await client.leave();
      console.log("Left channel successfully");
      
      // Update participant status in the backend
      if (selectedStream) {
        try {
          await apiInstance.api.post('/api/livestream/participant/leave/', {
            channel_name: selectedStream.channel_name
          });
        } catch (err) {
          console.error("Error updating participant status:", err);
        }
      }
      
      setRemoteUsers([]);
      setStarted(false);
      setConnectionStatus("Not connected");
      setErrorMessage("");
      setNetworkQuality(null);
      setVideoInitialized(false);
      
      // Refresh stream list to get updated viewer counts
      fetchAvailableStreams();
      
    } catch (error) {
      console.error("Error leaving channel:", error);
      setErrorMessage(`Leave error: ${error.message}`);
    } finally {
      setIsLoading(false);
      setShowExitWarning(false);
    }
  };
  
  // Retry video playback
  const retryVideoPlayback = () => {
    if (remoteUsers.length === 0) return;
    
    remoteUsers.forEach(user => {
      if (user.videoTrack && remoteVideoRefs.current[user.uid]) {
        user.videoTrack.play(remoteVideoRefs.current[user.uid], {
          fit: "contain" // Use contain mode to show full video
        })
          .then(() => {
            setVideoInitialized(true);
            setErrorMessage("");
          })
          .catch(error => {
            console.error("Error retrying video playback:", error);
            setErrorMessage(`Unable to play video: ${error.message}`);
          });
      }
    });
  };

  // Refresh the list of available streams
  const refreshStreams = () => {
    fetchAvailableStreams();
  };

  // Get artist full name with fallbacks
  const getArtistName = (stream) => {
    if (!stream) return 'Unknown';
    
    if (stream.artist) {

      
      return stream.artist.username || 'Unknown Artist';
    }
    
    // Fallback to user if artist isn't available
    if (stream.user) {

      return stream.user.username || 'Unknown';
    }
    
    return 'Unknown Artist';
  };

  // Generate consistent colors for avatars
  const getAvatarBackground = (stream) => {
    const colors = [
      'bg-gradient-to-br from-purple-600 to-blue-500',
      'bg-gradient-to-br from-pink-500 to-rose-500',
      'bg-gradient-to-br from-blue-500 to-teal-400',
      'bg-gradient-to-br from-amber-500 to-orange-600',
      'bg-gradient-to-br from-emerald-500 to-green-600',
      'bg-gradient-to-br from-fuchsia-500 to-purple-600',
    ];
    
    const name = getArtistName(stream);
    if (!name) return colors[0];
    
    // Generate a consistent color index based on the name
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };
  
  // Get artist initial for avatar
  const getArtistInitial = (stream) => {
    const name = getArtistName(stream);
    return name.charAt(0).toUpperCase();
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
      <div className="flex items-center space-x-1 text-gray-400">
        <span className={getQualityColor(networkQuality.downlinkNetworkQuality)}>
          {getQualityText(networkQuality.downlinkNetworkQuality)}
        </span>
      </div>
    );
  };
  
  // Render exit warning modal
  const renderExitWarningModal = () => {
    if (!showExitWarning) return null;
    
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-900 p-4 sm:p-6 rounded-xl shadow-2xl max-w-xs sm:max-w-sm w-full mx-4">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-4">Exit Stream?</h3>
          <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6">Are you sure you want to exit this stream? You'll need to reconnect to watch again.</p>
          <div className="flex justify-end space-x-3">
            <button 
              onClick={() => setShowExitWarning(false)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm sm:text-base"
            >
              Cancel
            </button>
            <button 
              onClick={leaveChannel}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm sm:text-base"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!fullscreenContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      fullscreenContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Render the stream list in a compact grid gallery
  const renderStreamList = () => {
    return (
      <div className="h-full w-full">
        <div className="relative h-full">
          {availableStreams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full rounded-xl bg-gray-800/50 text-gray-400 px-4">
              <div className="text-base sm:text-lg mb-3">No streams available right now</div>
              <button 
                onClick={refreshStreams}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 p-2 sm:p-4 h-full overflow-y-auto">
              {availableStreams.map((stream) => (
                <div
                  key={stream.id}
                  className="group"
                  onClick={() => startStream(stream)}
                >
                  <div className="relative cursor-pointer overflow-hidden rounded-lg sm:rounded-xl bg-gray-800 aspect-video shadow-md transition-all group-hover:shadow-xl group-hover:shadow-indigo-900/20">
                    {stream.thumbnail ? (
                      <img
                        src={stream.artist.profile_photo}
                        alt={`Stream by ${getArtistName(stream)}`}
                        className="w-full h-full object-cover transform transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex items-center justify-center ${getAvatarBackground(stream)} text-xl sm:text-3xl font-bold text-white transform transition-transform group-hover:scale-105`}
                      >
                        {getArtistInitial(stream)}
                      </div>
                    )}
                    
                    {/* Overlay and controls */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 opacity-80 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 sm:p-3">
                      <div className="flex justify-between">
                        <div className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold tracking-wide flex items-center space-x-1">
                          <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse"></span>
                          <span>LIVE</span>
                        </div>
                        
                        {stream.participant_count > 0 && (
                          <div className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{stream.participant_count}</span>
                          </div>
                        )}
                      </div>
                      
                      <div
                        className={`absolute bottom-2 sm:bottom-3 right-2 sm:right-3 w-8 h-8 sm:w-10 sm:h-10 ${
                          selectedStream?.id === stream.id && started
                            ? 'bg-red-600 group-hover:bg-red-700'
                            : 'bg-indigo-600 group-hover:bg-indigo-500'
                        } rounded-full flex items-center justify-center shadow-xl transition-transform group-hover:scale-110`}
                      >
                        {selectedStream?.id === stream.id && started ? (
                          <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        ) : (
                          <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-1 sm:mt-2 px-0.5">
                    <h3 className="font-bold text-white text-sm sm:text-base leading-tight truncate">
                      {stream.title || `${getArtistName(stream)}'s Stream`}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="truncate">{getArtistName(stream)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };



  // Render the active stream view (Google Meet-like container)
  const renderActiveStreamView = () => {
    if (!started) return null;
    
    const streamTitle = selectedStream?.title || `${getArtistName(selectedStream)}'s Stream`;
    const streamerName = getArtistName(selectedStream);
    const viewerCount = selectedStream?.participant_count || 0;
    
    return (
      <div 
        ref={fullscreenContainerRef}
        className="fixed inset-0 bg-black z-40 flex flex-col h-screen w-screen"
      >
        {/* Minimal Header - fixed height */}
        <div className="bg-black/80 backdrop-blur-sm px-2 sm:px-4 py-1 sm:py-2 flex items-center justify-between border-b border-gray-800 h-10 sm:h-12 flex-shrink-0">
          <div className="flex items-center space-x-2">
            {/* <button
              onClick={() => leaveChannel()}
              className="p-1 rounded-full bg-gray-800/80 text-white"
              aria-label="Back to streams"
            >
              <ChevronLeft size={16} />
            </button> */}
            <div className="flex items-center">
              <span className="bg-red-600 text-white text-xs px-1 sm:px-2 py-0.5 rounded flex items-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></span> 
                LIVE
              </span>
              <h3 className="text-sm font-medium text-white truncate max-w-xs ml-2">{streamerName}</h3>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-gray-400 text-xs">
              <Users size={12} />
              <span>{viewerCount}</span>
            </div>
            <div className="text-xs hidden sm:block">{renderQualityIndicator()}</div>
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded-full bg-gray-800/80 text-white"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>

        {/* Google Meet-like video container - takes all available space */}
        <div 
          className="flex-1 relative bg-black overflow-hidden"
          onTouchStart={() => setShowControls(true)}
          onTouchEnd={() => setTimeout(() => setShowControls(false), 3000)}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {/* Video container with center alignment */}
          <div 
            ref={videoWrapperRef}
            className="w-full h-full flex items-center justify-center bg-black"
          >
            {remoteUsers.length > 0 ? (
              remoteUsers.map(user => (
                <div key={user.uid} className="w-full h-full flex items-center justify-center">
                  <div 
                    ref={el => remoteVideoRefs.current[user.uid] = el} 
                    className="remote-video-element flex items-center justify-center"
                    style={{
                      // Start with max dimensions to let the ResizeObserver handle the rest
                      maxWidth: '100%',
                      maxHeight: '100%',
                      overflow: 'hidden', // Prevent any overflow
                      backgroundColor: 'black' // Black background for letterboxing
                    }}
                  ></div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-white text-sm">Connecting to stream...</p>
                </div>
              </div>
            )}
          </div>
          
{/* Loading overlay */}
{!videoInitialized && remoteUsers.length > 0 && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
    <div className="text-center">
      <button 
        onClick={retryVideoPlayback}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
      >
        <Play className="w-5 h-5" />
        <span>Start Video</span>
      </button>
    </div>
  </div>
)}
          
          {/* Controls overlay - shows on hover/touch */}
          <div 
            className={`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent transition-opacity duration-300 pointer-events-none
                       ${showControls ? 'opacity-100' : 'opacity-0'}`}
          >
            {/* Stream title at bottom */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
              <div className="text-white font-medium text-sm sm:text-base max-w-full truncate bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
                {streamTitle}
              </div>
              <button 
                onClick={() => setShowExitWarning(true)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2 sm:px-3 sm:py-2 transition-colors flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Exit</span>
              </button>
            </div>
          </div>
          
          {/* Error message */}
          {errorMessage && (
            <div className="absolute top-14 right-2 left-2 sm:left-auto sm:right-4 bg-red-900/80 border border-red-800 text-white px-3 py-2 rounded-md text-xs sm:text-sm">
              {errorMessage}
              {!videoInitialized && (
                <button 
                  onClick={retryVideoPlayback}
                  className="ml-2 bg-red-700 px-2 py-0.5 rounded text-xs hover:bg-red-600"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render the streams browser view
  const renderStreamsBrowserView = () => {
    if (started) return null;
    
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Minimal header */}
        <div className="bg-gray-900 border-b border-gray-800 px-3 py-3 flex justify-between items-center">
        <button
              onClick={() => navigate('/home')}
              className="p-1 rounded-full bg-gray-800/80 text-white"
              aria-label="Back to streams"
            >
              <ChevronLeft size={16} />
            </button>
          <h1 className="text-lg font-bold text-white">Live Streams</h1>

          <button
            onClick={refreshStreams}
            className="flex items-center justify-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Main content area - fills remaining height */}
        <div className="flex-1 overflow-hidden">
          {renderStreamList()}
        </div>
      </div>
    );
  };

  // Render the main application UI
  return (
    <>
      {/* Browser view when no stream is active */}
      {renderStreamsBrowserView()}
      
      {/* Active stream view */}
      {renderActiveStreamView()}
      
      {/* Exit warning modal */}
      {renderExitWarningModal()}
    </>
  );
};

export default LivestreamViewerApp;