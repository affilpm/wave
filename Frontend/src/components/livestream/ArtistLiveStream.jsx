import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { ArrowLeft, Video, Mic, MicOff, VideoOff, Users } from 'lucide-react';
import { apiInstance } from '../../api';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const ArtistLiveStream = () => {
  // State variables
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingStream, setIsStartingStream] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [networkQuality, setNetworkQuality] = useState(null);
  const [streamSettings, setStreamSettings] = useState({
    appId: "",
    channel: "",
    token: "",
    uid: 0
  });
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoInitialized, setVideoInitialized] = useState(false);
  const [videoRetryCount, setVideoRetryCount] = useState(0);
  const [isLeavingPage, setIsLeavingPage] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [heartbeatInterval, setHeartbeatInterval] = useState(null);
  
  // Get user data from Redux store
  const { username } = useSelector((state) => state.user);
  
  // Navigation
  const navigate = useNavigate();
  
  // Refs
  const clientRef = useRef(null);
  const localVideoRef = useRef(null);
  const videoInitTimeoutRef = useRef(null);
  const videoTrackRef = useRef(null);
  const isStreamingRef = useRef(false); // Track streaming state in a ref for cleanup functions
  const streamContainerRef = useRef(null);

// Add at the top of your component
const isAndroid = () => {
  return /Android/i.test(navigator.userAgent);
};
// Add this function to your component
const initializeAndroidCamera = async () => {
  try {
    setErrorMessage("");
    console.log("Initializing Android camera directly...");
    
    // Get direct stream from browser
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { max: 24 }
      },
      audio: true
    });
    
    // Display it directly in the video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      
      // Try explicit play
      try {
        await localVideoRef.current.play();
        setVideoInitialized(true);
        console.log("Direct Android camera initialized successfully");
        
        // Now create Agora tracks from this stream
        const videoTrack = AgoraRTC.createCustomVideoTrack({
          mediaStreamTrack: stream.getVideoTracks()[0]
        });
        
        const audioTrack = AgoraRTC.createCustomAudioTrack({
          mediaStreamTrack: stream.getAudioTracks()[0]
        });
        
        setLocalVideoTrack(videoTrack);
        setLocalAudioTrack(audioTrack);
        
        // Publish these tracks
        if (clientRef.current) {
          await clientRef.current.publish([videoTrack, audioTrack]);
          console.log("Published Android tracks successfully");
        }
        
        return true;
      } catch (playError) {
        console.error("Android play error:", playError);
        return false;
      }
    }
  } catch (error) {
    console.error("Android camera initialization error:", error);
    setErrorMessage(`Camera error: ${error.message || "Access denied"}`);
    return false;
  }
};




const fetchViewerCount = async () => {
  if (!streamSettings.channel) return;
  
  try {
    const response = await apiInstance.api.get('/api/livestream/viewer-count/', {
      params: {
        channel_name: streamSettings.channel
      }
    });
    
    if (response.data.active_participants !== undefined) {
      setViewerCount(response.data.active_participants);
    }
  } catch (error) {
    console.error("Error fetching viewer count:", error);
  }
};




useEffect(() => {
  if (isStreaming && streamSettings.channel) {
    // Fetch immediately when streaming begins
    fetchViewerCount();
    
    // Start interval to periodically fetch viewer count
    const interval = setInterval(fetchViewerCount, 30000); // Every 5 seconds
    setHeartbeatInterval(interval);
  } else {
    // Clear interval when streaming ends
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      setHeartbeatInterval(null);
    }
  }
  
  return () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
  };
}, [isStreaming, streamSettings.channel]);
  




  // Update streaming ref when state changes
  useEffect(() => {
    isStreamingRef.current = isStreaming;
    
    // When streaming starts, enter fullscreen mode
    if (isStreaming && !fullscreenMode) {
      setFullscreenMode(true);
    }
  }, [isStreaming]);




  // Block navigation when streaming is active
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isStreamingRef.current) {
        const message = "WARNING: You are currently live streaming. If you leave this page, your stream will end and all viewers will be disconnected.";
        event.preventDefault();
        event.returnValue = message;
        
        // Call the endStreamOnExit function to clean up and notify
        endStreamOnExit();
        
        return message;
      }
    };

    // Handle history changes (navigation within the app)
    const handlePopState = (event) => {
      if (isStreamingRef.current) {
        // Prevent the navigation
        event.preventDefault();
        // Show the exit warning
        setShowExitWarning(true);
        // Push the current state back to the history to prevent navigation
        window.history.pushState(null, null, window.location.pathname);
      }
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    
    // Block navigation by adding a history entry
    if (isStreaming) {
      window.history.pushState(null, null, window.location.pathname);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isStreaming]);




  // Enhanced cleanup on component unmount
  useEffect(() => {
    return () => {
      if (isStreamingRef.current) {
        // End the stream when component unmounts while streaming
        endStreamOnExit();
      }
    };
  }, []);




  // Helper function to end stream specifically during exit scenarios
  const endStreamOnExit = async () => {
    try {
      const client = clientRef.current;
      if (!client) return;
      
      // Close local tracks
      if (localAudioTrack) {
        localAudioTrack.close();
      }
      
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
      }
      
      // Use sendBeacon to notify backend that stream has ended
      if (streamSettings.channel) {
        const endStreamData = JSON.stringify({
          channel: streamSettings.channel,
          abruptExit: true
        });
        
        // Use the sendBeacon API which works during page unload
        navigator.sendBeacon(
          `${apiInstance.api.defaults.baseURL}/api/livestream/end-stream/`, 
          endStreamData
        );
        console.log("Sent stream end notification via beacon");
      }

      // Notify backend that stream has ended
      if (streamSettings.channel) {
        try {
          await apiInstance.api.post('/api/livestream/end-stream/', {
            channel: streamSettings.channel,
            abruptExit: true // Flag to indicate this was an abrupt exit
          });
          console.log("Successfully notified backend of stream end on exit");
        } catch (endError) {
          console.error("Error ending stream on server during exit:", endError);
        }
      }
      
      // Leave the channel
      try {
        client.leave();
      } catch (leaveError) {
        console.error("Error leaving channel on exit:", leaveError);
      }
    } catch (error) {
      console.error("Error in endStreamOnExit:", error);
    }
  };



  
  // Safe exit after ending stream
  const safeExit = () => {
    setFullscreenMode(false);
    navigate('/studio');
  };




  // Helper function to play video with retry logic
  const playVideoTrack = async (track, retryCount = 0) => {
    if (!track || !localVideoRef.current) return false;
    
    clearTimeout(videoInitTimeoutRef.current);
    
    try {
      console.log("Attempting to play video track...");
      
      // Stop previous playback if any
      try {
        track.stop();
      } catch (err) {
        console.log("No active playback to stop");
      }
      
      // Ensure track is enabled
      track.setEnabled(true);
      setVideoEnabled(true);
      
      // Important: Wait for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Play the track with specific element ID
      track.play(localVideoRef.current);
      
      console.log("Video track successfully played");
      setVideoInitialized(true);
      return true;
    } catch (error) {
      console.error(`Failed to play video track (attempt ${retryCount + 1}):`, error);
      
      // Auto-retry with exponential backoff
      if (retryCount < 3) {
        const delayTime = (retryCount + 1) * 500;
        console.log(`Retrying video playback in ${delayTime}ms...`);
        
        videoInitTimeoutRef.current = setTimeout(() => {
          playVideoTrack(track, retryCount + 1);
        }, delayTime);
        
        return false;
      } else {
        setErrorMessage("Failed to display video. Try toggling the video button.");
        return false;
      }
    }
  };



  // Use a ref to keep track of the video track
  useEffect(() => {
    if (localVideoTrack) {
      videoTrackRef.current = localVideoTrack;
    }
  }, [localVideoTrack]);




  // Play video track when both video and container are available
  useEffect(() => {
    let isMounted = true;
    
    const initializeVideo = async () => {
      // Check if video track is available, container is ready, and component is still mounted
      if (localVideoTrack && localVideoRef.current && isMounted) {
        console.log("Video track and container are both available, initializing playback");
        
        // Add a small delay to ensure DOM is fully ready
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (isMounted) {
          playVideoTrack(localVideoTrack);
        }
      }
    };
    
    initializeVideo();
    
    return () => {
      isMounted = false;
      clearTimeout(videoInitTimeoutRef.current);
      
      if (localVideoTrack) {
        try {
          localVideoTrack.stop();
        } catch (error) {
          console.log("Error stopping video track:", error);
        }
      }
    };
  }, [localVideoTrack, localVideoRef.current]);




  // Handle video enabled state changes
  useEffect(() => {
    if (localVideoTrack && videoInitialized) {
      try {
        localVideoTrack.setEnabled(videoEnabled);
        
        // If reenabling video, make sure it's displaying
        if (videoEnabled && localVideoRef.current) {
          // Add a small delay before replaying
          setTimeout(() => {
            try {
              localVideoTrack.stop();
              localVideoTrack.play(localVideoRef.current);
              setVideoRetryCount(0); // Reset retry count on successful toggle
            } catch (error) {
              console.error("Error replaying video after toggle:", error);
              // If toggle fails, try again with the main play function
              playVideoTrack(localVideoTrack);
            }
          }, 200);
        }
      } catch (error) {
        console.error("Error setting video enabled state:", error);
      }
    }
  }, [videoEnabled, videoInitialized]);



  // Initialize AgoraRTC client
  useEffect(() => {
    clientRef.current = AgoraRTC.createClient({
      mode: "live",
      codec: "vp8"
    });
    
    setupEventListeners();
    
    return () => {
      clearTimeout(videoInitTimeoutRef.current);
      cleanupResources();
    };
  }, []);




  // Setup event listeners for the Agora client
  const setupEventListeners = () => {
    const client = clientRef.current;
    if (!client) return;
    
    // When viewer joins
    client.on("user-joined", (user) => {
      console.log("User joined:", user.uid);
      setViewerCount(prev => prev + 1);
    });
    
    // When viewer leaves
    client.on("user-left", (user) => {
      console.log("User left:", user.uid);
      setViewerCount(prev => prev > 0 ? prev - 1 : 0);
      
      setRemoteUsers(prevUsers => {
        return prevUsers.filter(u => u.uid !== user.uid);
      });
    });
    
    // Network quality monitoring
    client.on("network-quality", (stats) => {
      setNetworkQuality({
        downlinkNetworkQuality: stats.downlinkNetworkQuality,
        uplinkNetworkQuality: stats.uplinkNetworkQuality
      });
    });
    
    // Error handling
    client.on("exception", (event) => {
      console.warn("Exception:", event);
      setErrorMessage(`Stream error: ${event.msg}`);
    });
  };




  // Clean up resources when component unmounts
  const cleanupResources = async () => {
    try {
      if (localAudioTrack) {
        localAudioTrack.close();
      }
      
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
      }
      
      if (clientRef.current && isStreamingRef.current) {
        await clientRef.current.leave();
      }
      
      setVideoInitialized(false);
    } catch (error) {
      console.error("Error cleaning up resources:", error);
    }
  };




  // Get streaming token from backend
const getStreamToken = async (options = {}) => {
  try {
    setErrorMessage("");
    
    // Prepare query parameters with default and optional values
    const queryParams = {
      role: 'host',  // Default role
      title: `${username}'s Stream`,  // Optional title
      ...options  // Spread any additional options to allow overriding
    };
    
    const response = await apiInstance.api.get('/api/livestream/token/', {
      params: queryParams
    });
    
    // Destructure with fallback values for extra safety
    const { 
      token, 
      channel, 
      app_id: appId, 
      uid, 
      role 
    } = response.data;
    
    // Validate essential data
    if (!token || !channel || !appId) {
      throw new Error("Incomplete token response from server");
    }
    
    // Update stream settings with comprehensive information
    setStreamSettings({
      appId: appId,
      channel: channel,
      token: token,
      uid: uid,
      role: role || 'host'  // Ensure role is set
    });
    
    // Return comprehensive token information
    return { 
      token, 
      channel, 
      app_id: appId, 
      uid,
      role: role || 'host'
    };
  } catch (error) {
    // Enhanced error handling
    console.error("Error getting stream token:", error);
    
    // Extract most informative error message
    const errorMessage = 
      error.response?.data?.error || 
      error.response?.data?.message || 
      error.message || 
      "Unable to start stream";
    
    // Set a descriptive error message
    setErrorMessage(`Stream Initialization Failed: ${errorMessage}`);
    
    // Re-throw to allow caller to handle the error
    throw error;
  }
};



const startStream = async () => {
  // Prevent multiple start attempts
  if (isStartingStream || isLoading) return;
  
  setIsStartingStream(true);
  setIsLoading(true);
  setErrorMessage("");
  setVideoInitialized(false);
  setVideoRetryCount(0);
  
  try {
    const client = clientRef.current;
    if (!client) {
      throw new Error("Stream client not initialized");
    }
    
    const { token, channel, app_id, uid } = await getStreamToken({
      title: `${username}'s Stream`, 
    });
    
    // Set role as host
    await client.setClientRole("host");
    
    // Join the channel
    try {
      await client.join(app_id, channel, token, uid);
    } catch (error) {
      setErrorMessage(`Couldn't start stream: ${error.message}`);
      throw error;
    }
    
    // Android-specific path
    if (isAndroid()) {
      const androidSuccess = await initializeAndroidCamera();
      
      if (androidSuccess) {
        // Successfully initialized through Android-specific method
        setTimeout(() => {
          setIsStreaming(true);
          setIsStartingStream(false);
          setFullscreenMode(true);
        }, 1000);
        return;
      }
      // If Android-specific method failed, continue with normal path
    }
    
    // Regular path for non-Android devices
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {
          echoCancellation: true,
          noiseSuppression: true,
        }, 
        {
          encoderConfig: isAndroid() ? 
            { width: 640, height: 480, frameRate: 24, bitrateMax: 800 } : 
            { width: 1280, height: 720, frameRate: 30, bitrateMax: 1500 },
          facingMode: "user"
        }
      );
      
      videoTrackRef.current = videoTrack;
      
      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);
      
      if (localVideoRef.current) {
        setTimeout(() => {
          playVideoTrack(videoTrack);
        }, 300);
      }
      
      await client.publish([audioTrack, videoTrack]); 
      
      setTimeout(() => {
        setIsStreaming(true);
        setIsStartingStream(false);
        setFullscreenMode(true);
        
        if (!videoInitialized && videoTrackRef.current && localVideoRef.current) {
          playVideoTrack(videoTrackRef.current);
        }
      }, 1000);
      
    } catch (error) {
      setErrorMessage(`Camera/microphone error: ${error.message}`);
      await client.leave();
      throw error;
    }
    
  } catch (error) {
    setIsStartingStream(false);
  } finally {
    setIsLoading(false);
  }
};




  // End the livestream
  const endStream = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const client = clientRef.current;
      if (!client) return;
      
      // Close local tracks
      if (localAudioTrack) {
        localAudioTrack.close();
        setLocalAudioTrack(null);
      }
      
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
        setLocalVideoTrack(null);
      }
      
      // Clear video track ref
      videoTrackRef.current = null;
      
      // Notify backend that stream has ended
      try {
        await apiInstance.api.post('/api/livestream/end-stream/', {
          channel: streamSettings.channel,
          abruptExit: false,

        });
        console.log("Successfully notified backend of stream end");
      } catch (endError) {
        console.error("Error ending stream on server:", endError);
      }
      
      // Leave the channel
      await client.leave();
      console.log("Left channel successfully");
      
      setIsStreaming(false);
      setRemoteUsers([]);
      setViewerCount(0);
      setNetworkQuality(null);
      setVideoInitialized(false);
      setFullscreenMode(false);
      
    } catch (error) {
      console.error("Error ending stream:", error);
      const errorMessage = error.response?.data?.error || error.message;
      setErrorMessage(`Error ending stream: ${errorMessage}`);
  
    } finally {
      setIsLoading(false);
    }
  };




  // Toggle video with retry capability
  const toggleVideo = async () => {
    if (!localVideoTrack) return;
    
    try {
      const newEnabledState = !videoEnabled;
      setVideoEnabled(newEnabledState);
      
      // If turning video on, try to force a replay
      if (newEnabledState) {
        // Stop first in case it's already playing somewhere
        try {
          localVideoTrack.stop();
        } catch (err) {
          // Ignore stop errors
        }
        
        await localVideoTrack.setEnabled(true);
        
        // Use a timeout to ensure UI updates before replay
        setTimeout(() => {
          if (localVideoRef.current) {
            try {
              localVideoTrack.play(localVideoRef.current);
              setVideoInitialized(true);
            } catch (playError) {
              console.error("Error replaying after toggle:", playError);
              // If direct play fails, use the retry function
              playVideoTrack(localVideoTrack);
            }
          }
        }, 200);
      } else {
        // Just disable if turning off
        await localVideoTrack.setEnabled(false);
      }
    } catch (error) {
      console.error("Error toggling video:", error);
      setErrorMessage("Failed to toggle video");
    }
  };




  // Toggle audio
  const toggleAudio = async () => {
    if (!localAudioTrack) return;
    
    try {
      const newEnabledState = !audioEnabled;
      setAudioEnabled(newEnabledState);
      await localAudioTrack.setEnabled(newEnabledState);
    } catch (error) {
      console.error("Error toggling audio:", error);
      setErrorMessage("Failed to toggle audio");
    }
  };




  
  // Manual retry function for video playback
  const retryVideoPlayback = () => {
    const trackToUse = localVideoTrack || videoTrackRef.current;
    
    if (!trackToUse || !localVideoRef.current) {
      setErrorMessage("No video track available to retry");
      return;
    }
    
    setVideoRetryCount(prev => prev + 1);
    
    // Try to reinitialize the video completely
    try {
      trackToUse.stop();
    } catch (err) {
      // Ignore stop errors
    }
    
    setTimeout(() => {
      trackToUse.setEnabled(true);
      playVideoTrack(trackToUse);
    }, 200);
  };




  // Render quality indicator
  const renderQualityIndicator = () => {
    if (!networkQuality) return null;

    // Convert quality to descriptive text (lower is better in Agora's scale)
    const getQualityText = (quality) => {
      switch(quality) {
        case 1: return "Excellent";
        case 2: return "Good";
        case 3: return "Fair";
        case 4: return "Poor";
        case 5: return "Bad";
        default: return "Unknown";
      }
    };

    const upQuality = networkQuality.uplinkNetworkQuality;
    let qualityColor = "bg-green-500";
    
    if (upQuality >= 4) {
      qualityColor = "bg-red-500";
    } else if (upQuality === 3) {
      qualityColor = "bg-yellow-500";
    }

    return (
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${qualityColor}`}></div>
        <span className="text-sm text-gray-300">
          {getQualityText(upQuality)}
        </span>
      </div>
    );
  };


{/* In your non-fullscreenMode view */}
{isAndroid() && (
  <div className="mt-2">
    <button
      onClick={() => {
        // Force Android workflow
        startStream().then(() => {
          // After starting, force Android camera initialization
          setTimeout(() => {
            initializeAndroidCamera();
          }, 2000);
        });
      }}
      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-60 flex items-center justify-center mx-auto mt-3"
    >
      <Video size={18} className="mr-2" />
      Android Start
    </button>
  </div>
)}
{isAndroid() && (
  <div className="absolute bottom-4 right-4 bg-black/70 text-white p-2 rounded text-xs" style={{ maxWidth: '200px' }}>
    <div>Android Debug:</div>
    <div>Video Init: {videoInitialized ? 'Yes' : 'No'}</div>
    <div>Has Video Track: {localVideoTrack ? 'Yes' : 'No'}</div>
    <div>Has Audio Track: {localAudioTrack ? 'Yes' : 'No'}</div>
    <div>Network: {networkQuality ? 
      `Up: ${networkQuality.uplinkNetworkQuality}, Down: ${networkQuality.downlinkNetworkQuality}` : 
      'Unknown'}</div>
  </div>
)}
  // Exit warning modal
  const renderExitWarningModal = () => {
    if (!showExitWarning) return null;
    
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">End Your Stream?</h3>
          <p className="text-gray-300 mb-6">
            You are currently live streaming. If you leave this page, your stream will end and all viewers will be disconnected.
          </p>
          <div className="flex space-x-4">
            <button
              onClick={() => setShowExitWarning(false)}
              className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Continue Streaming
            </button>
            <button
              onClick={() => {
                setShowExitWarning(false);
                endStream().then(() => {
                  setFullscreenMode(false);
                  navigate('/studio');
                });
              }}
              className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              End Stream & Exit
            </button>
          </div>
        </div>
      </div>
    );
  };


  {isAndroid() && !videoInitialized && (
    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
      <button 
        onClick={initializeAndroidCamera}
        className="bg-green-600 text-white px-4 py-3 rounded-lg font-medium shadow-lg"
      >
        Initialize Android Camera
      </button>
    </div>
  )}
  // Render the stream view
  if (fullscreenMode) {
    return (
      <div 
        ref={streamContainerRef}
        className="fixed inset-0 bg-black z-50 flex flex-col h-screen"
      >
        {/* Header - fixed height */}
        <div className="bg-gray-900 px-6 py-3 flex items-center justify-between border-b border-gray-800 h-14 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-md flex items-center">
              <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span> 
              LIVE
            </span>
            <h3 className="text-lg font-semibold text-white">{username}'s Stream</h3>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-gray-400">
              <Users size={16} />
              <span className="text-sm">{viewerCount}</span>
            </div>
            {renderQualityIndicator()}
          </div>
        </div>

        {/* Main content area - flexible height between header and controls */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video container - takes remaining space */}
          <div className="flex-1 bg-gray-900 flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center mx-auto">
              <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-lg relative bg-black">
                <video 
                  ref={localVideoRef} 
                  className="max-w-full max-h-full object-contain"
                  autoPlay 
                  playsInline 
                  muted 
                />
                
                {!videoInitialized && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white">Initializing video...</p>
                    </div>
                  </div>
                )}
                
                {/* Stream info overlay */}
                <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-2 rounded-md text-sm flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${videoEnabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {username} (You)
                </div>
                
                {/* Error message */}
                {errorMessage && (
                  <div className="absolute top-4 right-4 bg-red-900/80 border border-red-800 text-white px-4 py-2 rounded-md max-w-md">
                    {errorMessage}
                    {!videoInitialized && (
                      <button 
                        onClick={retryVideoPlayback}
                        className="ml-4 bg-red-700 px-2 py-1 rounded text-sm hover:bg-red-600"
                      >
                        Retry Video
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls - fixed height at bottom */}
        <div className="bg-gray-900 px-6 py-3 border-t border-gray-800 h-16 flex-shrink-0 z-10">
          <div className="flex items-center justify-between h-full">
            <div className="flex space-x-4">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${videoEnabled ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'}`}
                disabled={isLoading}
              >
                {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full ${audioEnabled ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'}`}
                disabled={isLoading}
              >
                {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
            </div>
            
            <button
              onClick={() => setShowExitWarning(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? "Ending..." : "End Stream & Exit"}
            </button>
          </div>
        </div>
        
        {/* Exit warning modal */}
        {renderExitWarningModal()}
      </div>
    );
  }


  // Non-fullscreen view (for starting stream)
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-white">Go Live</h3>
        </div>
      </div>
      
      <div className="p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video size={32} />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Start Streaming</h3>
          <p className="text-gray-400 mb-6">
            Your followers will be notified when you go live
          </p>
          <button
            onClick={startStream}
            disabled={isLoading || isStartingStream}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
          >
            {(isLoading || isStartingStream) ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Video size={18} className="mr-2" />
            )}
            {isStartingStream ? "Initializing Camera..." : 
             isLoading ? "Starting Stream..." : "Go Live Now"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtistLiveStream;