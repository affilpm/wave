import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { apiInstance } from '../api';

// Available regions for testing
const regions = [
  { label: "Global (Default)", value: "GLOBAL" },
  { label: "North America", value: "NA" },
  { label: "Europe", value: "EU" },
  { label: "Asia", value: "AP" },
  { label: "China", value: "CN" },
  { label: "Japan", value: "JP" }
];

const LivestreamApp = () => {
  // State variables
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [started, setStarted] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("GLOBAL");
  const [connectionStatus, setConnectionStatus] = useState("Not connected");
  const [errorMessage, setErrorMessage] = useState("");
  const [networkQuality, setNetworkQuality] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingNetwork, setIsTestingNetwork] = useState(false);
  const [devicePermissions, setDevicePermissions] = useState({
    video: false,
    audio: false
  });
  const [streamTitle, setStreamTitle] = useState("");
  const [streamSettings, setStreamSettings] = useState({
    appId: "",
    channel: "",
    token: "",
    uid: 0
  });
  const [availableStreams, setAvailableStreams] = useState([]);
  const [selectedStream, setSelectedStream] = useState(null);
  const [videoInitialized, setVideoInitialized] = useState(false);

  // Reference to Agora client
  const clientRef = useRef(null);
  // References to video containers
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});

  // Check device permissions on load
  useEffect(() => {
    checkDevicePermissions();
    fetchAvailableStreams();
    
    // Cleanup function
    return () => {
      cleanupResources();
    };
  }, []);

  // Initialize the Agora client when region changes
  useEffect(() => {
    initializeAgora();
    
    return () => {
      if (clientRef.current) {
        clientRef.current.removeAllListeners();
      }
      
      if (started) {
        leaveChannel();
      }
    };
  }, [selectedRegion]);

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

  // Effect to handle video track setup
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current && !videoInitialized) {
      const initializeVideoTrack = async () => {
        try {
          // Make sure the track is not destroyed
          if (!localVideoTrack.isDestroyed) {
            // Try to stop first in case it's already playing elsewhere
            try {
              localVideoTrack.stop();
            } catch (stopError) {
              console.log("No need to stop track, it was not playing");
            }
            
            // Now play it in our container
            await localVideoTrack.play(localVideoRef.current);
            console.log("Video track successfully initialized");
            setVideoInitialized(true);
          } else {
            console.error("Video track is destroyed, cannot play");
            setErrorMessage("Camera track is not available. Please try rejoining.");
          }
        } catch (playError) {
          console.error("Failed to play video:", playError);
          setErrorMessage(`Failed to display camera: ${playError.message}`);
          
          // Try again after a delay
          setTimeout(() => {
            if (localVideoTrack && !localVideoTrack.isDestroyed) {
              try {
                localVideoTrack.play(localVideoRef.current);
                setVideoInitialized(true);
                console.log("Video track initialized on retry");
              } catch (retryError) {
                console.error("Retry failed:", retryError);
              }
            }
          }, 1000);
        }
      };
      
      initializeVideoTrack();
    }
  }, [localVideoTrack, localVideoRef.current, videoInitialized]);

  // Clean up resources
  const cleanupResources = () => {
    if (localAudioTrack) {
      localAudioTrack.close();
    }
    
    if (localVideoTrack) {
      localVideoTrack.close();
    }
    
    if (clientRef.current) {
      clientRef.current.leave().catch(console.error);
    }
  };

  // Fetch available streams
  const fetchAvailableStreams = async () => {
    try {
      const response = await apiInstance.api.get('/api/livestream/streams/');
      setAvailableStreams(response.data);
    } catch (error) {
      console.error("Error fetching streams:", error);
      setErrorMessage("Could not fetch available streams");
    }
  };

  // Check device permissions
  const checkDevicePermissions = async () => {
    try {
      // Check if user browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage("Your browser doesn't support camera and microphone access.");
        return;
      }
      
      // Check video permission
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          } 
        });
        videoStream.getTracks().forEach(track => track.stop());
        setDevicePermissions(prev => ({ ...prev, video: true }));
      } catch (error) {
        console.error("Video permission error:", error);
        setDevicePermissions(prev => ({ ...prev, video: false }));
        setErrorMessage(`Camera access denied: ${error.message}`);
      }
      
      // Check audio permission
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true 
          } 
        });
        audioStream.getTracks().forEach(track => track.stop());
        setDevicePermissions(prev => ({ ...prev, audio: true }));
      } catch (error) {
        console.error("Audio permission error:", error);
        setDevicePermissions(prev => ({ ...prev, audio: false }));
        setErrorMessage(`Microphone access denied: ${error.message}`);
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
      setErrorMessage(`Error checking device permissions: ${error.message}`);
    }
  };
  
  // Initialize the Agora engine
  const initializeAgora = async () => {
    try {
      // If there's an existing client, clean it up
      if (clientRef.current) {
        clientRef.current.removeAllListeners();
      }
      
      // Create a new Agora client with the selected region
      const config = { 
        mode: "live", 
        codec: "vp8" 
      };
      
      // Only add region if not using GLOBAL
      if (selectedRegion !== "GLOBAL") {
        config.region = selectedRegion;
      }
      
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
  const getAgoraToken = async (role, channelName = null) => {
    try {
      setConnectionStatus("Getting token...");
      
      const params = {
        role: role, // 'host' or 'audience'
        title: streamTitle || undefined
      };
      
      // If joining a specific channel as audience
      if (channelName && role === 'audience') {
        params.channel = channelName;
      }
      
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
  
  // Test network connectivity to Agora servers
  const testNetworkConnectivity = async () => {
    setIsTestingNetwork(true);
    
    try {
      const client = clientRef.current;
      if (!client) {
        throw new Error("Client not initialized");
      }
      
      setConnectionStatus("Testing network...");
      
      // Get a temporary token for testing
      const { token, channel, app_id } = await getAgoraToken('audience');
      
      try {
        // Try to join with the test client
        await client.join(app_id, channel, token, streamSettings.uid || null);
        setConnectionStatus("Network test successful");
        await client.leave();
      } catch (error) {
        console.error("Network test error:", error);
        setConnectionStatus("Network test failed");
        setErrorMessage(`Network error: ${error.message}. Code: ${error.code}`);
      }
    } catch (error) {
      console.error("Test error:", error);
      setErrorMessage(`Test error: ${error.message}`);
    } finally {
      setIsTestingNetwork(false);
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
  
  // Start livestream as host
  const startAsHost = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setVideoInitialized(false);
    
    try {
      const client = clientRef.current;
      if (!client) {
        throw new Error("Client not initialized");
      }
      
      // Check device permissions first
      if (!devicePermissions.video || !devicePermissions.audio) {
        await checkDevicePermissions();
        if (!devicePermissions.video || !devicePermissions.audio) {
          throw new Error("Camera and/or microphone permission denied");
        }
      }
      
      // Get token from backend
      const { token, channel, app_id, uid } = await getAgoraToken('host');
      
      // Set role as host
      await client.setClientRole("host");
      setIsHost(true);
      
      console.log("Joining channel as host...");
      setConnectionStatus("Joining channel...");
      
      // Join the channel with better error logging
      try {
        await client.join(app_id, channel, token, uid);
        console.log("Successfully joined channel as host!");
        setConnectionStatus("Joined as host");
      } catch (error) {
        console.error("Error joining channel:", error.code, error.message);
        setErrorMessage(`Join error: ${error.message} (Code: ${error.code})`);
        throw error;
      }
      
      console.log("Creating local tracks...");
      
      // Create and publish local tracks with optimized settings
      try {
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
          {
            echoCancellation: true,
            noiseSuppression: true,
          }, 
          {
            encoderConfig: {
              width: 640,
              height: 480,
              frameRate: 30,
              bitrateMin: 400,
              bitrateMax: 1000
            },
            facingMode: "user",
            cameraId: undefined // Will use default camera
          }
        );
        
        // Add event listeners to tracks
        videoTrack.on("track-ended", () => {
          console.log("Video track ended unexpectedly");
          setErrorMessage("Camera disconnected. Please rejoin to restart.");
        });
        
        // Set state
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        
        // Video play logic is now handled by useEffect
        
        console.log("Publishing local tracks...");
        await client.publish([audioTrack, videoTrack]);
        console.log("Local tracks published successfully!");
      } catch (error) {
        console.error("Error with local tracks:", error);
        setErrorMessage(`Media error: ${error.message}`);
        // Try to leave the channel if we failed with tracks
        await client.leave();
        throw error;
      }
      
      setStarted(true);
    } catch (error) {
      console.error("Error starting as host:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Start watching as audience
  const startAsViewer = async (channelToJoin = null) => {
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const client = clientRef.current;
      if (!client) {
        throw new Error("Client not initialized");
      }
      
      // Get token from backend
      const { token, channel, app_id, uid } = await getAgoraToken('audience', channelToJoin || (selectedStream?.channel_name));
      
      // Set role as audience
      await client.setClientRole("audience");
      setIsHost(false);
      
      console.log("Joining channel as audience...");
      setConnectionStatus("Joining channel...");
      
      // Join the channel with better error logging
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
      console.error("Error starting as viewer:", error);
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
      
      // Reset video initialized state
      setVideoInitialized(false);
      
      // Close local tracks if exists
      if (localAudioTrack) {
        localAudioTrack.close();
        setLocalAudioTrack(null);
      }
      
      if (localVideoTrack) {
        localVideoTrack.close();
        setLocalVideoTrack(null);
      }
      
      // If user is host, notify backend that stream has ended
      if (isHost) {
        try {
          await apiInstance.api.post('/api/livestream/end-stream/', {
            channel: streamSettings.channel
          });
        } catch (endError) {
          console.error("Error ending stream on server:", endError);
        }
      }
      
      // Leave the channel
      await client.leave();
      console.log("Left channel successfully");
      
      setRemoteUsers([]);
      setStarted(false);
      setIsHost(false);
      setConnectionStatus("Not connected");
      setErrorMessage("");
      setNetworkQuality(null);
      
    } catch (error) {
      console.error("Error leaving channel:", error);
      setErrorMessage(`Leave error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh the list of available streams
  const refreshStreams = () => {
    fetchAvailableStreams();
  };

  // Handle stream selection
  const handleStreamSelect = (stream) => {
    setSelectedStream(stream);
  };

  // Render the quality indicator
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

    return (
      <div className="network-quality">
        <div>
          <span>Download Quality: </span>
          <span className={`quality-${networkQuality.downlinkNetworkQuality}`}>
            {getQualityText(networkQuality.downlinkNetworkQuality)}
          </span>
        </div>
        <div>
          <span>Upload Quality: </span>
          <span className={`quality-${networkQuality.uplinkNetworkQuality}`}>
            {getQualityText(networkQuality.uplinkNetworkQuality)}
          </span>
        </div>
      </div>
    );
  };

  // Render the stream list
  const renderStreamList = () => {
    if (availableStreams.length === 0) {
      return <p>No active streams available. Be the first to start one!</p>;
    }

    return (
      <div className="stream-list">
        <h3>Available Streams</h3>
        <ul>
          {availableStreams.map((stream) => (
            <li 
              key={stream.id} 
              className={selectedStream?.id === stream.id ? 'selected' : ''}
              onClick={() => handleStreamSelect(stream)}
            >
              <strong>{stream.title}</strong>
              <div>Host: {stream.host_username}</div>
              <div>Viewers: {stream.viewer_count || 0}</div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Render video elements
  const renderVideoElements = () => {
    return (
      <div className="video-container">
        {isHost && (
          <div className="local-video">
            <h3>Your Stream (Host)</h3>
            <div ref={localVideoRef} className="video-element">
              {localVideoTrack && !videoInitialized && (
                <div className="video-loading">
                  <p>Initializing camera...</p>
                </div>
              )}
            </div>
            {localVideoTrack && (
              <div className="video-controls">
                <button onClick={() => {
                  if (localVideoTrack.isEnabled) {
                    localVideoTrack.setEnabled(false);
                  } else {
                    localVideoTrack.setEnabled(true);
                  }
                }}>
                  {localVideoTrack.isEnabled ? "Disable Camera" : "Enable Camera"}
                </button>
                <button onClick={() => {
                  if (localAudioTrack.isEnabled) {
                    localAudioTrack.setEnabled(false);
                  } else {
                    localAudioTrack.setEnabled(true);
                  }
                }}>
                  {localAudioTrack?.isEnabled ? "Mute Mic" : "Unmute Mic"}
                </button>
              </div>
            )}
          </div>
        )}
        
        {remoteUsers.length > 0 ? (
          <div className="remote-videos">
            <h3>Remote Streams</h3>
            {remoteUsers.map(user => (
              <div key={user.uid} className="remote-video">
                <div 
                  ref={el => remoteVideoRefs.current[user.uid] = el} 
                  className="video-element"
                ></div>
                <div className="user-info">User: {user.uid}</div>
              </div>
            ))}
          </div>
        ) : (
          !isHost && started && (
            <div className="no-remote-videos">
              <p>Waiting for host to start streaming...</p>
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <div className="livestream-app">
      <div className="app-header">
        <h1>Live Streaming App</h1>
        <div className="connection-status">
          Status: <span className={`status-${connectionStatus.toLowerCase().replace(/\s+/g, '-')}`}>{connectionStatus}</span>
        </div>
      </div>

      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      {!started ? (
        <div className="control-panel">
          <div className="setup-options">
            <div className="option-group">
              <h3>Stream Settings</h3>
              <div className="input-group">
                <label htmlFor="regionSelect">Region:</label>
                <select 
                  id="regionSelect" 
                  value={selectedRegion} 
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  disabled={isLoading}
                >
                  {regions.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="network-test">
                <button 
                  onClick={testNetworkConnectivity} 
                  disabled={isLoading || isTestingNetwork}
                >
                  {isTestingNetwork ? "Testing..." : "Test Network"}
                </button>
              </div>
              
              <div className="device-status">
                <h4>Device Status</h4>
                <div className={`device ${devicePermissions.video ? 'available' : 'unavailable'}`}>
                  Camera: {devicePermissions.video ? "Available" : "Not Available"}
                </div>
                <div className={`device ${devicePermissions.audio ? 'available' : 'unavailable'}`}>
                  Microphone: {devicePermissions.audio ? "Available" : "Not Available"}
                </div>
                <button 
                  onClick={checkDevicePermissions} 
                  disabled={isLoading}
                >
                  Check Permissions
                </button>
              </div>
            </div>
            
            <div className="option-group">
              <h3>Start Streaming</h3>
              <div className="input-group">
                <label htmlFor="streamTitle">Stream Title:</label>
                <input 
                  type="text" 
                  id="streamTitle" 
                  value={streamTitle} 
                  onChange={(e) => setStreamTitle(e.target.value)} 
                  placeholder="Enter stream title"
                  disabled={isLoading}
                />
              </div>
              
              <button 
                onClick={startAsHost} 
                disabled={isLoading || !devicePermissions.video || !devicePermissions.audio}
                className="primary-button"
              >
                {isLoading ? "Starting..." : "Start as Host"}
              </button>
            </div>
            
            <div className="option-group">
              <h3>Join a Stream</h3>
              <div className="join-stream">
                <div className="refresh-button">
                  <button onClick={refreshStreams} disabled={isLoading}>
                    Refresh Streams
                  </button>
                </div>
                
                {renderStreamList()}
                
                <button 
                  onClick={() => startAsViewer()} 
                  disabled={isLoading || !selectedStream}
                  className="primary-button"
                >
                  {isLoading ? "Joining..." : "Join as Viewer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="stream-view">
          <div className="stream-header">
            <h2>{isHost ? "Broadcasting" : "Watching"}: {streamSettings.channel}</h2>
            {renderQualityIndicator()}
          </div>
          
          {renderVideoElements()}
          
          <div className="stream-controls">
            <button 
              onClick={leaveChannel} 
              disabled={isLoading}
              className="danger-button"
            >
              {isLoading ? "Leaving..." : isHost ? "End Stream" : "Leave Stream"}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .livestream-app {
          font-family: Arial, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .connection-status {
          font-weight: bold;
        }
        
        .status-initialized, .status-connected {
          color: green;
        }
        
        .status-connecting {
          color: orange;
        }
        
        .status-disconnected, .status-not-connected {
          color: red;
        }
        
        .error-message {
          background-color: #ffeeee;
          border: 1px solid #ff0000;
          color: #ff0000;
          padding: 10px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        
        .control-panel {
          background-color: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
        }
        
        .setup-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }
        
        .option-group {
          background-color: white;
          border-radius: 4px;
          padding: 15px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .input-group {
          margin-bottom: 15px;
        }
        
        .input-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        .input-group input, .input-group select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .device-status {
          margin-top: 15px;
        }
        
        .device {
          margin-bottom: 5px;
          padding: 5px;
          border-radius: 4px;
        }
        
        .device.available {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .device.unavailable {
          background-color: #ffebee;
          color: #c62828;
        }
  
  button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background-color: #e0e0e0;
    cursor: pointer;
    font-weight: bold;
    margin-top: 10px;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .primary-button {
    background-color: #2196f3;
    color: white;
  }
  
  .danger-button {
    background-color: #f44336;
    color: white;
  }
  
  .stream-list {
    max-height: 300px;
    overflow-y: auto;
    margin-top: 15px;
  }
  
  .stream-list ul {
    list-style-type: none;
    padding: 0;
  }
  
  .stream-list li {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 10px;
    cursor: pointer;
  }
  
  .stream-list li:hover {
    background-color: #f0f0f0;
  }
  
  .stream-list li.selected {
    border-color: #2196f3;
    background-color: #e3f2fd;
  }
  
  .stream-view {
    background-color: #f5f5f5;
    border-radius: 8px;
    padding: 20px;
  }
  
  .stream-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .video-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
  }
  
  .video-element {
    width: 100%;
    height: 300px;
    background-color: #000;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .local-video, .remote-video {
    background-color: white;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .user-info {
    margin-top: 10px;
    font-weight: bold;
  }
  
  .network-quality {
    padding: 10px;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .quality-1 {
    color: #2e7d32;
  }
  
  .quality-2 {
    color: #689f38;
  }
  
  .quality-3 {
    color: #ffa000;
  }
  
  .quality-4 {
    color: #f57c00;
  }
  
  .quality-5, .quality-6 {
    color: #d32f2f;
  }
  
  .no-remote-videos {
    grid-column: span 2;
    text-align: center;
    padding: 40px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .refresh-button {
    margin-bottom: 10px;
  }
  
  .stream-controls {
    display: flex;
    justify-content: center;
  }
`}</style>
</div>
);
};

export default LivestreamApp;