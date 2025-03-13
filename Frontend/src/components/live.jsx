import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

// Configuration variables
const appId = "3f3b2cc3042746cfaacefa55dc8f0c7f"; // Replace with your actual App ID
const token = null // Use null for testing or replace with token
const channelName = "new";

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

  // Reference to Agora client
  const clientRef = useRef(null);
  // References to video containers
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});

  // Check device permissions on load
  useEffect(() => {
    checkDevicePermissions();
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
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => console.log("Camera & Mic access granted"))
  .catch(err => console.error("Permission error:", err));
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach(track => track.stop());
        setDevicePermissions(prev => ({ ...prev, video: true }));
      } catch (error) {
        console.error("Video permission error:", error);
        setDevicePermissions(prev => ({ ...prev, video: false }));
      }
      
      // Check audio permission
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach(track => track.stop());
        setDevicePermissions(prev => ({ ...prev, audio: true }));
      } catch (error) {
        console.error("Audio permission error:", error);
        setDevicePermissions(prev => ({ ...prev, audio: false }));
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
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
  
  // Test network connectivity to Agora servers
  const testNetworkConnectivity = async () => {
    setIsTestingNetwork(true);
    
    try {
      const client = clientRef.current;
      if (!client) {
        throw new Error("Client not initialized");
      }
      
      setConnectionStatus("Testing network...");
      
      // Create a temporary client to test joining
      const testClient = AgoraRTC.createClient({ 
        mode: "live", 
        codec: "vp8",
        ...(selectedRegion !== "GLOBAL" ? { region: selectedRegion } : {})
      });
      
      try {
        // Try to join with the test client
        await testClient.join(appId, `test-channel-${Date.now()}`, token);
        setConnectionStatus("Network test successful");
        await testClient.leave();
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
          
          // Play the remote video
          if (user.videoTrack) {
            // Wait until next render cycle when refs are updated
            setTimeout(() => {
              if (remoteVideoRefs.current[user.uid]) {
                user.videoTrack.play(remoteVideoRefs.current[user.uid]);
              }
            }, 0);
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
      
      // Set role as host
      await client.setClientRole("host");
      setIsHost(true);
      
      console.log("Joining channel as host...");
      setConnectionStatus("Joining channel...");
      
      // Join the channel with better error logging
      try {
        await client.join(appId, channelName, token);
        console.log("Successfully joined channel as host!");
        setConnectionStatus("Joined as host");
      } catch (error) {
        console.error("Error joining channel:", error.code, error.message);
        setErrorMessage(`Join error: ${error.message} (Code: ${error.code})`);
        throw error;
      }
      
      console.log("Creating local tracks...");
      
      // Create and publish local tracks
      try {
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        
        setTimeout(() => {
            if (localVideoRef.current) {
              videoTrack.play(localVideoRef.current);
            }
          }, 100);
        
          // After setting up the localVideoRef
console.log("Video container dimensions:", 
    localVideoRef.current ? {
      width: localVideoRef.current.offsetWidth,
      height: localVideoRef.current.offsetHeight,
      visible: window.getComputedStyle(localVideoRef.current).display !== 'none'
    } : "No container"
  );
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
  const startAsViewer = async () => {
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const client = clientRef.current;
      if (!client) {
        throw new Error("Client not initialized");
      }
      
      // Set role as audience
      await client.setClientRole("audience");
      setIsHost(false);
      
      console.log("Joining channel as audience...");
      setConnectionStatus("Joining channel...");
      
      // Join the channel with better error logging
      try {
        await client.join(appId, channelName, token);
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
      
      // Close local tracks if exists
      if (localAudioTrack) {
        localAudioTrack.close();
        setLocalAudioTrack(null);
      }
      
      if (localVideoTrack) {
        localVideoTrack.close();
        setLocalVideoTrack(null);
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
  
  // Network quality indicator
  const renderNetworkQuality = (quality) => {
    if (!quality) return "Unknown";
    
    // Convert quality level to descriptive text
    // 0: Unknown, 1: Excellent, 2: Good, 3: Fair, 4: Poor, 5: Bad, 6: Very Bad
    const qualityTexts = ["Unknown", "Excellent", "Good", "Fair", "Poor", "Bad", "Very Bad"];
    
    return (
      <div>
        <div>Downlink: {qualityTexts[quality.downlinkNetworkQuality] || "Unknown"}</div>
        <div>Uplink: {qualityTexts[quality.uplinkNetworkQuality] || "Unknown"}</div>
      </div>
    );
  };
  
  return (
    <div className="app-container">
      <h1>Agora Livestream Demo</h1>
      
      <div className="status-panel">
        <div className="status-item">
          <strong>Status:</strong> {connectionStatus}
        </div>
        
        {networkQuality && (
          <div className="status-item">
            <strong>Network Quality:</strong> 
            {renderNetworkQuality(networkQuality)}
          </div>
        )}
        
        <div className="status-item">
          <strong>Device Permissions:</strong>
          <div>Camera: {devicePermissions.video ? "✅" : "❌"}</div>
          <div>Microphone: {devicePermissions.audio ? "✅" : "❌"}</div>
        </div>
        
        {errorMessage && (
          <div className="error-message">
            <strong>Error:</strong> {errorMessage}
          </div>
        )}
      </div>
      
      <div className="config-panel">
        <div className="region-selector">
          <label htmlFor="region">Server Region:</label>
          <select 
            id="region" 
            value={selectedRegion} 
            onChange={(e) => setSelectedRegion(e.target.value)}
            disabled={started}
          >
            {regions.map(region => (
              <option key={region.value} value={region.value}>
                {region.label}
              </option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={testNetworkConnectivity} 
          className="btn-test"
          disabled={isTestingNetwork || started}
        >
          {isTestingNetwork ? "Testing..." : "Test Network Connection"}
        </button>
        
        <button 
          onClick={checkDevicePermissions} 
          className="btn-test"
          disabled={started}
        >
          Check Device Permissions
        </button>
      </div>
      
      {!started && (
        <div className="button-group">
          <button 
            onClick={startAsHost} 
            className="btn-host"
            disabled={isLoading || isTestingNetwork}
          >
            {isLoading ? "Starting..." : "Start as Host"}
          </button>
          <button 
            onClick={startAsViewer} 
            className="btn-viewer"
            disabled={isLoading || isTestingNetwork}
          >
            {isLoading ? "Starting..." : "Watch Livestream"}
          </button>
        </div>
      )}
      
      {started && (
        <div className="stream-container">
          <div className="stream-controls">
            <button 
              onClick={leaveChannel} 
              className="btn-leave"
              disabled={isLoading}
            >
              {isLoading ? "Ending..." : "End Stream"}
            </button>
          </div>
          
<div className="video-container">
  {/* Always render the video container but conditionally show/hide it */}
  <div className={`video-player host-video ${isHost ? '' : 'hidden'}`}>
    <div ref={localVideoRef} className="video-element"></div>
    <div className="video-label">You (Host)</div>
  </div>
  
  {/* Rest of your code remains the same */}
  {remoteUsers.length > 0 ? (
    remoteUsers.map(user => (
      <div key={user.uid} className="video-player remote-video">
        <div 
          ref={el => remoteVideoRefs.current[user.uid] = el} 
          className="video-element"
        ></div>
        <div className="video-label">Remote User ({user.uid})</div>
      </div>
    ))
  ) : (
    <div className="empty-state">
      {isHost ? "Waiting for viewers to join..." : "Waiting for host to start streaming..."}
    </div>
  )}
</div>
        </div>
      )}
      
      <div className="troubleshooting">
        <h3>Troubleshooting Tips</h3>
        <ul>
          <li>Make sure your App ID is correct</li>
          <li>Try different server regions</li>
          <li>Check your network connection</li>
          <li>Allow camera and microphone permissions</li>
          <li>Make sure no other application is using your camera</li>
          <li>Try using a different browser</li>
          <li>Disable VPN or proxy services</li>
        </ul>
      </div>
      
      <style jsx>{`
        .app-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }

        .status-panel {
          background-color: #f5f5f5;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
        }

        .status-item {
          margin-bottom: 10px;
        }

        .error-message {
          color: #f44336;
          grid-column: 1 / -1;
          padding: 10px;
          background-color: #ffebee;
          border-radius: 4px;
        }

        .config-panel {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
          align-items: center;
        }

        .region-selector {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        select {
          padding: 8px;
          border-radius: 4px;
          border: 1px solid #ccc;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .btn-host, .btn-viewer, .btn-leave, .btn-test {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-host {
          background-color: #f44336;
          color: white;
        }

        .btn-viewer {
          background-color: #2196F3;
          color: white;
        }

        .btn-leave {
          background-color: #555;
          color: white;
        }

        .btn-test {
          background-color: #4CAF50;
          color: white;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .stream-container {
          margin-top: 20px;
        }

        .stream-controls {
          margin-bottom: 20px;
        }

        .video-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          grid-gap: 20px;
        }

        .video-player {
          width: 100%;
          border-radius: 8px;
          overflow: hidden;
          background-color: #f0f0f0;
          position: relative;
        }

        .video-element {
          width: 100%;
          height: 300px;
        }

        .video-label {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background-color: rgba(0, 0, 0, 0.6);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 14px;
        }

        .empty-state {
          grid-column: 1 / -1;
          padding: 50px;
          text-align: center;
          background-color: #f0f0f0;
          border-radius: 8px;
          color: #555;
        }

        .troubleshooting {
          margin-top: 30px;
          background-color: #e3f2fd;
          border-radius: 8px;
          padding: 15px;
        }

        .troubleshooting h3 {
          margin-top: 0;
        }

        .troubleshooting ul {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};

export default LivestreamApp;