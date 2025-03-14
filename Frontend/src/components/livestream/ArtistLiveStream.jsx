import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { ArrowLeft, Video, Mic, MicOff, VideoOff, Users, X } from 'lucide-react';
import { apiInstance } from '../../api';
import { useSelector } from 'react-redux';
import { useBeforeUnload, useNavigate } from 'react-router-dom'; // Added for navigation handling

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

  // Get user data from Redux store
//   const Username = useSelector((state) => state.user);
//   const username = Username || "Artist";
    const { username, photo, image } = useSelector((state) => state.user);
  
  // Navigation
  const navigate = useNavigate();
  
  // Refs
  const clientRef = useRef(null);
  const localVideoRef = useRef(null);
  const videoInitTimeoutRef = useRef(null);
  const videoTrackRef = useRef(null);
  const isStreamingRef = useRef(false); // Track streaming state in a ref for cleanup functions

  // Update streaming ref when state changes
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

//   // Enhanced beforeunload handler with custom warning message based on streaming state
//   useEffect(() => {
//     const handleBeforeUnload = (event) => {
//       if (isStreamingRef.current) {
//         const message = "WARNING: You are currently live streaming. If you leave this page, your stream will end and all viewers will be disconnected.";
//         event.preventDefault();
//         event.returnValue = message;
//         return message;
//       } else {
//         // If not streaming, we can use a gentler message or no message
//         const message = "Your session will end if you leave this page.";
//         event.preventDefault();
//         event.returnValue = message;
//         return message;
//       }
//     };

//     window.addEventListener("beforeunload", handleBeforeUnload);

//     return () => {
//       window.removeEventListener("beforeunload", handleBeforeUnload);
//     };
//   }, []);

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
        await client.leave();
        console.log("Left channel successfully on exit");
      } catch (leaveError) {
        console.error("Error leaving channel on exit:", leaveError);
      }
    } catch (error) {
      console.error("Error in endStreamOnExit:", error);
    }
  };

  // Confirmation dialog for navigation within the app
  const handleNavigateAway = (destination) => {
    if (isStreaming) {
      // Show confirmation dialog
      const confirmLeave = window.confirm(
        "WARNING: You are currently live streaming. If you leave this page, your stream will end and all viewers will be disconnected. Are you sure you want to leave?"
      );
      
      if (confirmLeave) {
        setIsLeavingPage(true);
        // End stream first, then navigate
        endStreamOnExit().then(() => {
          navigate(destination);
        });
      }
      // If they cancel, stay on the page
      return false;
    } else {
      // If not streaming, just navigate
      navigate(destination);
      return true;
    }
  };

  // Helper function to play video with retry logic - IMPROVED
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

  // FIX: Use a ref to keep track of the video track
  useEffect(() => {
    if (localVideoTrack) {
      videoTrackRef.current = localVideoTrack;
    }
  }, [localVideoTrack]);

  // KEY FIX: Play video track when both video and container are available
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

  // Separate effect for handling video enabled state changes - IMPROVED
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
  const getStreamToken = async () => {
    try {
      setErrorMessage("");
      
      const response = await apiInstance.api.get('/api/livestream/token/', {
        params: {
          role: 'host'
        }
      });
      
      const { token, channel, app_id, uid } = response.data;
      
      setStreamSettings({
        appId: app_id,
        channel: channel,
        token: token,
        uid: uid
      });
      
      return { token, channel, app_id, uid };
    } catch (error) {
      console.error("Error getting token:", error);
      setErrorMessage(`Unable to start stream: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  };

  // Start the livestream - IMPROVED
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
      
      // Get token from backend
      const { token, channel, app_id, uid } = await getStreamToken();
      
      // Set role as host
      await client.setClientRole("host");
      
      console.log("Joining channel as host...");
      
      // Join the channel
      try {
        await client.join(app_id, channel, token, uid);
        console.log("Successfully joined channel!");
      } catch (error) {
        console.error("Error joining channel:", error);
        setErrorMessage(`Couldn't start stream: ${error.message}`);
        throw error;
      }
      
      // KEY FIX: Get permissions before creating tracks
      try {
        console.log("Requesting camera/mic permissions...");
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // FIX: Create tracks with better error handling
        console.log("Creating audio and video tracks...");
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
          {
            echoCancellation: true,
            noiseSuppression: true,
          }, 
          {
            encoderConfig: {
              width: 1280,
              height: 720,
              frameRate: 30,
              bitrateMax: 1500
            },
            facingMode: "user"
          }
        );
        
        console.log("Tracks created successfully");
        
        // FIX: Save tracks to refs immediately for use outside state updates
        videoTrackRef.current = videoTrack;
        
        // Set local tracks state
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        
        // FIX: Try to play the video track immediately (don't wait for state update)
        if (localVideoRef.current) {
          setTimeout(() => {
            playVideoTrack(videoTrack);
          }, 300);
        }
        
        // Publish tracks to remote users
        await client.publish([audioTrack, videoTrack]); 
        console.log("Local tracks published successfully!");
        
        // Set streaming state to true with a delay to allow initialization
        setTimeout(() => {
          setIsStreaming(true);
          setIsStartingStream(false);
          
          // Try again to play video after some time if not initialized yet
          if (!videoInitialized && videoTrackRef.current && localVideoRef.current) {
            playVideoTrack(videoTrackRef.current);
          }
        }, 1000);
        
      } catch (error) {
        console.error("Error with local tracks:", error);
        setErrorMessage(`Camera/microphone error: ${error.message}`);
        
        // Important: Leave the channel if we fail to publish tracks
        await client.leave();
        throw error;
      }
      
    } catch (error) {
      console.error("Error starting stream:", error);
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
          abruptExit: false // Normal end, not an abrupt exit
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
      
    } catch (error) {
      console.error("Error ending stream:", error);
      setErrorMessage(`Error ending stream: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle video with retry capability - IMPROVED
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
  
  // Manual retry function for video playback - IMPROVED
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

  // New warning banner for users who are streaming
  const renderStreamWarningBanner = () => {
    if (!isStreaming) return null;
    
    return (
      <div className="bg-yellow-900/40 border border-yellow-800 text-yellow-200 p-3 mx-6 mt-4 mb-4 rounded-lg text-sm">
        <strong>Important:</strong> Leaving this page will end your stream and disconnect all viewers. 
        
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-white">{isStreaming ? "Live" : "Go Live"}</h3>
          {isStreaming && (
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-md flex items-center">
              <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span> 
              LIVE
            </span>
          )}
        </div>
        {/* <button 
          onClick={() => {
            if (isStreaming) {
              // If streaming, ask for confirmation before closing
              if (window.confirm("Are you sure you want to end your stream?")) {
                endStream().then(() => onClose());
              }
            } else {
              onClose();
            }
          }}
          className="text-gray-400 hover:text-white"
          disabled={isStartingStream}
        >
          <X size={18} />
        </button> */}
      </div>
      
{/*       
      {errorMessage && (
        <div className="bg-red-900/40 border border-red-900 text-red-200 p-3 mx-6 mt-4 rounded-lg text-sm">
          {errorMessage}
          {isStreaming && !videoInitialized && (
            <div className="mt-2">
              <button 
                onClick={retryVideoPlayback}
                className="text-white text-xs bg-red-800 px-2 py-1 rounded"
              >
                Retry Video
              </button>
            </div>
          )}
        </div>
      )} */}

      {renderStreamWarningBanner()}

      <div className="p-6">
        {!isStreaming ? (
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
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h4 className="text-white font-medium">{username}'s Stream</h4>
                <div className="flex items-center space-x-1 text-gray-400">
                  <Users size={14} />
                  <span className="text-sm">{viewerCount}</span>
                </div>
              </div>
              {renderQualityIndicator()}
            </div>
            
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-6">
              {/* KEY FIX: Add unique ID to the video container */}
              <div ref={localVideoRef} id="local-video-container" className="w-full h-full bg-gray-800"></div>
              {!videoInitialized && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white">Initializing video...</p>
                  </div>
                </div>
              )}
              <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded-md text-sm flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${videoEnabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {username} (You)
              </div>
            </div>
            
            <div className="flex justify-center space-x-4 mb-6">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${videoEnabled ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'}`}
                disabled={isLoading}
              >
                {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full ${audioEnabled ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'}`}
                disabled={isLoading}
              >
                {audioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                onClick={endStream}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-60"
                disabled={isLoading}
              >
                {isLoading ? "Ending..." : "End Stream"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistLiveStream;