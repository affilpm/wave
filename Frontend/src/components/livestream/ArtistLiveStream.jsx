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
  const [existingStreamError, setExistingStreamError] = useState(null);
  
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
  const clientConnectedRef = useRef(false); // Track client connection state

  // More reliable Android detection 
  const isAndroid = () => {
    return /Android/i.test(navigator.userAgent) || 
          (navigator.platform && /Android|Linux armv/i.test(navigator.platform));
  };

  // Enhanced Android camera initialization
  const initializeAndroidCamera = async () => {
    try {
      setErrorMessage("");
      console.log("Initializing Android camera with enhanced settings...");
      
      // Request permissions explicitly first
      const permissions = await navigator.permissions.query({name: 'camera'});
      if (permissions.state === 'denied') {
        throw new Error("Camera permission denied");
      }
      
      // More specific constraints for Android
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { max: 30 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Ensure video element exists
      if (!localVideoRef.current) {
        throw new Error("Video element not found");
      }
      
      // Set direct source first
      localVideoRef.current.srcObject = stream;
      
      // Try explicit play with user interaction
      try {
        await localVideoRef.current.play();
        setVideoInitialized(true);
        console.log("Direct Android camera initialized successfully");
        
        // Create Agora tracks with lower bitrate settings for Android
        const videoTrack = AgoraRTC.createCustomVideoTrack({
          mediaStreamTrack: stream.getVideoTracks()[0],
          optimizationMode: "detail",
          encoderConfig: {
            width: 640,
            height: 480,
            frameRate: 24,
            bitrateMin: 400,
            bitrateMax: 800
          }
        });
        
        const audioTrack = AgoraRTC.createCustomAudioTrack({
          mediaStreamTrack: stream.getAudioTracks()[0]
        });
        
        // Update state
        setLocalVideoTrack(videoTrack);
        setLocalAudioTrack(audioTrack);
        videoTrackRef.current = videoTrack;
        
        // Ensure client is initialized
        if (!clientRef.current) {
          throw new Error("Client not initialized");
        }
        
        // Explicitly publish with logging
        console.log("Publishing Android tracks...");
        await clientRef.current.publish([videoTrack, audioTrack]);
        console.log("Published Android tracks successfully");
        
        return true;
      } catch (playError) {
        console.error("Android play error:", playError);
        throw playError;
      }
    } catch (error) {
      console.error("Android camera initialization error:", error);
      setErrorMessage(`Android camera error: ${error.message || "Access denied"}`);
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
      const interval = setInterval(fetchViewerCount, 30000); // Every 30 seconds
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


  const [isReloading, setIsReloading] = useState(false);

// Block navigation when streaming is active
// Block navigation when streaming is active, but don't show warnings
useEffect(() => {
  // For page reloads or browser closes
  const handleBeforeUnload = (event) => {
    if (isStreamingRef.current || existingStreamError?.existing_stream?.channel) {
      // Check if this is likely a reload
      const isLikelyReload = event.currentTarget.performance && 
                            event.currentTarget.performance.navigation &&
                            event.currentTarget.performance.navigation.type === 1;
      
      if (isLikelyReload) {
        setIsReloading(true);
        console.log("Page reload detected");
      }
      
      // Handle stream ending without warning
      handleStreamEndOnExit(isLikelyReload);
    }
  };
  
  // Handle stream end API calls
  const handleStreamEndOnExit = async (isReload = false) => {
    try {
      if (isReload) {
        await apiInstance.api.post('/api/livestream/end-stream/', {
          channel: streamSettings.channel || existingStreamError?.existing_stream?.channel,
          abruptExit: false,
          isReload: true
        });
      } else {
        // End existing stream if present
        if (existingStreamError?.existing_stream?.channel) {
          await apiInstance.api.post('/api/livestream/end-stream/', {
            channel: existingStreamError.existing_stream.channel,
            abruptExit: true
          });
        }
        
        // End current stream if present
        if (streamSettings.channel && 
            streamSettings.channel !== existingStreamError?.existing_stream?.channel) {
          await apiInstance.api.post('/api/livestream/end-stream/', {
            channel: streamSettings.channel,
            abruptExit: true
          });
        }
      }
    } catch (error) {
      console.error("Error ending stream:", error);
    }
  };

  // This fires when user actually leaves the page
  const handleUnload = () => {
    if (isStreamingRef.current || existingStreamError?.existing_stream?.channel) {
      // Close tracks immediately
      if (localAudioTrack) {
        try { localAudioTrack.close(); } catch (e) {}
      }
      
      if (localVideoTrack) {
        try { 
          localVideoTrack.stop();
          localVideoTrack.close(); 
        } catch (e) {}
      }
      
      console.log("Page is unloading, stream cleanup executed");
    }
  };

  // For visibilitychange - can detect tab close
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      console.log("Page hidden, ensuring cleanup");
      endStreamOnExit();
    }
  };

  // Register all event listeners
  window.addEventListener("beforeunload", handleBeforeUnload);
  window.addEventListener("unload", handleUnload);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  
  // Cleanup event listeners
  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.removeEventListener("unload", handleUnload);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [existingStreamError, isStreaming, streamSettings.channel, localAudioTrack, localVideoTrack]);

// Helper function to end stream during exit scenarios
const endStreamOnExit = async () => {
  try {
    if (!clientRef.current && !streamSettings.channel && !existingStreamError?.existing_stream?.channel) {
      return;
    }
    
    console.log("Running stream exit cleanup...");
    
    // If this is a reload, skip most of the cleanup
    if (isReloading) {
      console.log("Skipping aggressive cleanup due to page reload");
      return;
    }
    
    // Close local tracks immediately
    if (localAudioTrack) {
      try {
        localAudioTrack.close();
      } catch (e) {}
    }
    
    if (localVideoTrack) {
      try {
        localVideoTrack.stop();
        localVideoTrack.close();
      } catch (e) {}
    }
    
    // Use API calls with proper error handling
    try {
      if (existingStreamError?.existing_stream?.channel) {
        await apiInstance.api.post('/api/livestream/end-stream/', {
          channel: existingStreamError.existing_stream.channel,
          abruptExit: true
        }, { timeout: 1000 });
      }
      
      if (streamSettings.channel && 
          streamSettings.channel !== existingStreamError?.existing_stream?.channel) {
        await apiInstance.api.post('/api/livestream/end-stream/', {
          channel: streamSettings.channel,
          abruptExit: true
        }, { timeout: 1000 });
      }
    } catch (e) {
      console.error("Error calling end-stream API:", e);
    }
    
    // Leave the channel if connected
    try {
      if (clientConnectedRef.current && clientRef.current) {
        await clientRef.current.leave();
        clientConnectedRef.current = false;
      }
    } catch (e) {
      console.error("Error leaving client channel:", e);
    }
  } catch (error) {
    console.error("Error in endStreamOnExit:", error);
  }
};

// Safe exit after ending stream
const safeExit = async () => {
  await endStreamOnExit();
  setFullscreenMode(false);
  navigate('/studio');
};

// Component unmount cleanup
useEffect(() => {
  return () => {
    // Always end any existing stream when component unmounts
    endStreamOnExit();
  };
}, []);

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
    
    // Connection state change monitoring
    client.on("connection-state-change", (curState, prevState) => {
      console.log(`Connection state changed from ${prevState} to ${curState}`);
      clientConnectedRef.current = curState === "CONNECTED";
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
      
      if (clientRef.current && clientConnectedRef.current) {
        await clientRef.current.leave();
        clientConnectedRef.current = false;
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
      
      // Handle existing stream error with more details
      if (error.response?.data?.error === 'stream_already_exists') {
        setExistingStreamError({
          message: error.response.data.message || "You already have an active stream running.",
          existing_stream: error.response.data.existing_stream || {}
        });
      }
      
      // Set a descriptive error message
      setErrorMessage(`Stream Initialization Failed: ${errorMessage}`);
      
      // Re-throw to allow caller to handle the error
      throw error;
    }
  };

  // Function to ensure client is disconnected before reconnecting
  const ensureClientDisconnected = async () => {
    const client = clientRef.current;
    if (!client) return;
    
    try {
      // Check if connected and leave if needed
      if (clientConnectedRef.current) {
        console.log("Client is connected, leaving channel first...");
        await client.leave();
        clientConnectedRef.current = false;
        console.log("Successfully left channel");
        
        // Add a small delay after leaving
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error("Error ensuring client disconnection:", error);
      // Reset client connection state even on error
      clientConnectedRef.current = false;
    }
  };

  const startStream = async () => {
    // Prevent multiple start attempts
    if (isStartingStream || isLoading) return;
    
    setIsStartingStream(true);
    setIsLoading(true);
    setErrorMessage("");
    setVideoInitialized(false);
    
    try {
      const client = clientRef.current;
      if (!client) {
        throw new Error("Stream client not initialized");
      }
      
      // Make sure client is disconnected first
      await ensureClientDisconnected();
      
      try {
        const { token, channel, app_id, uid } = await getStreamToken({
          title: `${username}'s Stream`, 
        });
        
        // Set role as host
        await client.setClientRole("host");
        
        // Join the channel with more detailed error handling
        try {
          await client.join(app_id, channel, token, uid);
          clientConnectedRef.current = true;
          console.log("Successfully joined channel:", channel);
        } catch (joinError) {
          console.error("Channel join error:", joinError);
          setErrorMessage(`Couldn't join stream channel: ${joinError.message}`);
          throw joinError;
        }
        
        // Try Android-specific path first if detected
        if (isAndroid()) {
          console.log("Android device detected, trying Android-specific initialization");
          try {
            const androidSuccess = await initializeAndroidCamera();
            
            if (androidSuccess) {
              console.log("Android camera initialization successful");
              setTimeout(() => {
                setIsStreaming(true);
                setIsStartingStream(false);
                setFullscreenMode(true);
              }, 1000);
              return;
            } else {
              console.log("Android-specific method failed, falling back to standard method");
            }
          } catch (androidError) {
            console.error("Android initialization failed:", androidError);
            // Continue to regular path instead of throwing
          }
        }
        
        // Regular path as fallback
        console.log("Using standard camera initialization");
        try {
          // Check permissions first
          const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          
          // Stop temporary stream
          mediaStream.getTracks().forEach(track => track.stop());
          
          // Get actual tracks with optimized settings
          const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
            {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }, 
            {
              encoderConfig: isAndroid() ? 
                { width: 640, height: 480, frameRate: 24, bitrateMax: 800 } : 
                { width: 1280, height: 720, frameRate: 30, bitrateMax: 1500 },
              facingMode: "user",
              optimizationMode: isAndroid() ? "detail" : "motion"
            }
          );
          
          videoTrackRef.current = videoTrack;
          
          setLocalAudioTrack(audioTrack);
          setLocalVideoTrack(videoTrack);
          
          // Explicitly publish before showing
          console.log("Publishing tracks to Agora");
          await client.publish([audioTrack, videoTrack]);
          console.log("Tracks published successfully");
          
          // Play video with delay to ensure DOM is ready
          if (localVideoRef.current) {
            setTimeout(() => {
              console.log("Playing video track");
              try {
                videoTrack.play(localVideoRef.current);
                setVideoInitialized(true);
              } catch (playError) {
                console.error("Error playing video track:", playError);
                playVideoTrack(videoTrack);
              }
            }, 500);
          }
          
          setTimeout(() => {
            setIsStreaming(true);
            setIsStartingStream(false);
            setFullscreenMode(true);
          }, 1000);
          
        } catch (error) {
          console.error("Standard camera/mic error:", error);
          setErrorMessage(`Camera/microphone error: ${error.message}`);
          
          // Try to leave the channel on failure
          try {
            await client.leave();
            clientConnectedRef.current = false;
          } catch (leaveError) {
            console.error("Error leaving channel after failure:", leaveError);
          }
          
          throw error;
        }
      } catch (tokenError) {
        // Check if this is an existing stream error
        if (tokenError.response?.data?.error === 'stream_already_exists') {
          console.log("User already has an active stream:", tokenError.response.data);
          
          // End the existing stream automatically
          try {
            setErrorMessage("Ending your previous stream...");
            
            // Get the existing stream's channel
            const existingChannel = tokenError.response.data.existing_stream.channel;
            
            // Make sure we're disconnected first
            await ensureClientDisconnected();
            
            // End the stream on the backend
            await apiInstance.api.post('/api/livestream/end-stream/', {
              channel: existingChannel,
              abruptExit: false
            });
            
            console.log("Successfully ended previous stream");
            setErrorMessage("Previous stream ended. Starting new stream...");
            
            // Wait a moment for server to process the stream end
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Retry starting the stream
            setIsStartingStream(false);
            setIsLoading(false);
            startStream();
            return;
            
          } catch (endError) {
            console.error("Error ending previous stream:", endError);
            setErrorMessage("Failed to end previous stream. Please try again later.");
            throw endError;
          }
        }
        throw tokenError;
      }
    } catch (error) {
      console.error("Stream start error:", error);
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
        // End current stream if it exists
        if (streamSettings.channel) {
          await apiInstance.api.post('/api/livestream/end-stream/', {
            channel: streamSettings.channel,
            abruptExit: false
          });
          console.log("Successfully ended current stream");
        }
        
        // Also end any existing stream from error data if available
        if (existingStreamError?.existing_stream?.channel) {
          await apiInstance.api.post('/api/livestream/end-stream/', {
            channel: existingStreamError.existing_stream.channel,
            abruptExit: false
          });
          console.log("Successfully ended existing stream");
          setExistingStreamError(null);
        }
      } catch (endError) {
        console.error("Error ending stream on server:", endError);
      }
      
      // Leave the channel
      if (clientConnectedRef.current) {
        try {
          await client.leave();
          clientConnectedRef.current = false;
          console.log("Left channel successfully");
        } catch (leaveError) {
          console.error("Error leaving channel:", leaveError);
          // Force reset connection state
          clientConnectedRef.current = false;
        }
      }
      
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


  {isAndroid() && (
    <div className="absolute bottom-4 right-4 bg-black/70 text-white p-2 rounded text-xs" style={{ maxWidth: '200px' }}>
      <div>Android Debug:</div>
      <div>Video Init: {videoInitialized ? 'Yes' : 'No'}</div>
      <div>Has Video Track: {localVideoTrack ? 'Yes' : 'No'}</div>
      <div>Has Audio Track: {localAudioTrack ? 'Yes' : 'No'}</div>
      <div>Network: {networkQuality ? 
        `Up: ${networkQuality.uplinkNetworkQuality}, Down: ${networkQuality.downlinkNetworkQuality}` : 
        'Unknown'}</div>
      <div>
        <button 
          onClick={retryVideoPlayback}
          className="mt-2 bg-blue-600 text-white px-2 py-1 rounded text-xs"
        >
          Retry Video
        </button>
      </div>
    </div>
  )}
  
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
            disabled={isLoading || isStartingStream || existingStreamError !== null}
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