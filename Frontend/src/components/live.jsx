import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { apiInstance } from '../api';
import { Play, Pause, ChevronLeft, ChevronRight, User, Users, Maximize, Minimize, X, RefreshCw } from "lucide-react";

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

  // Reference to Agora client
  const clientRef = useRef(null);
  // References to video containers
  const remoteVideoRefs = useRef({});
  // Reference for stream scroll container
  const scrollContainerRef = useRef(null);
  // Reference for fullscreen container
  const fullscreenContainerRef = useRef(null);

  // Initialize on page load
  useEffect(() => {
    fetchAvailableStreams();
    initializeAgora();
    
    // Cleanup function
    return () => {
      cleanupResources();
    };
  }, []);

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
  };

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Fetch available streams
  const fetchAvailableStreams = async () => {
    try {
      setIsLoading(true);
      const response = await apiInstance.api.get('/api/livestream/streams/');
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
    if (started && selectedStream?.id === stream.id) {
      // If already watching this stream, stop it
      leaveChannel();
      return;
    }
    
    // Update selected stream
    setSelectedStream(stream);
    
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
      
      setRemoteUsers([]);
      setStarted(false);
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

  // Handle scroll buttons for stream list
  const handleScroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Get artist full name with fallbacks
  const getArtistName = (stream) => {
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

  // Render the stream list in a modern gallery style
  const renderStreamList = () => {
    return (
      <div className="relative mb-12">
        <div 
          className="relative"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {showControls && availableStreams.length > 3 && (
            <>
              <button
                onClick={() => handleScroll('left')}
                className="absolute -left-3 top-1/2 z-10 p-2 bg-gray-900 hover:bg-gray-800 text-white rounded-full transform -translate-y-1/2 shadow-lg transition-all hover:scale-110"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => handleScroll('right')}
                className="absolute -right-3 top-1/2 z-10 p-2 bg-gray-900 hover:bg-gray-800 text-white rounded-full transform -translate-y-1/2 shadow-lg transition-all hover:scale-110"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto py-6 -mx-4 px-4 hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {availableStreams.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 rounded-xl bg-gray-800/50 text-gray-400 px-4">
                <div className="text-lg mb-3">No streams available right now</div>
                <button 
                  onClick={refreshStreams}
                  className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {availableStreams.map((stream) => (
                  <div
                    key={stream.id}
                    className="group"
                    onClick={() => startStream(stream)}
                  >
                    <div className="relative cursor-pointer overflow-hidden rounded-2xl bg-gray-800 aspect-video shadow-md transition-all group-hover:shadow-xl group-hover:shadow-indigo-900/20">
                      {stream.thumbnail ? (
                        <img
                          src={stream.thumbnail}
                          alt={`Stream by ${getArtistName(stream)}`}
                          className="w-full h-full object-cover transform transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex items-center justify-center ${getAvatarBackground(stream)} text-3xl font-bold text-white transform transition-transform group-hover:scale-105`}
                        >
                          {getArtistInitial(stream)}
                        </div>
                      )}
                      
                      {/* Overlay and controls */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 opacity-80 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                        <div className="flex justify-between">
                          <div className="bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold tracking-wide flex items-center space-x-1">
                            <span className="h-2 w-2 bg-white rounded-full animate-pulse"></span>
                            <span>LIVE</span>
                          </div>
                          
                          {stream.participant_count > 0 && (
                            <div className="bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{stream.participant_count}</span>
                            </div>
                          )}
                        </div>
                        
                        <div
                          className={`absolute bottom-4 right-4 w-12 h-12 ${
                            selectedStream?.id === stream.id && started
                              ? 'bg-red-600 group-hover:bg-red-700'
                              : 'bg-indigo-600 group-hover:bg-indigo-500'
                          } rounded-full flex items-center justify-center shadow-xl transition-transform group-hover:scale-110`}
                        >
                          {selectedStream?.id === stream.id && started ? (
                            <Pause className="w-6 h-6 text-white" />
                          ) : (
                            <Play className="w-6 h-6 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 px-1">
                      <h3 className="font-bold text-white text-lg leading-tight">
                        {stream.title || `${getArtistName(stream)}'s Stream`}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{getArtistName(stream)}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
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

  // Render video stream with modern UI
  const renderVideoStream = () => {
    if (!started) return null;
    
    return (
      <div 
        ref={fullscreenContainerRef} 
        className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'w-full aspect-video bg-black rounded-lg shadow-lg overflow-hidden'}`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {remoteUsers.length > 0 ? (
          remoteUsers.map(user => (
            <div key={user.uid} className="w-full h-full relative">
              <div 
                ref={el => remoteVideoRefs.current[user.uid] = el} 
                className="w-full h-full"
              ></div>
              
              {/* Overlay controls - only show on hover or when controls active */}
              <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : ''}`}>
                <div className="absolute top-4 left-4">
                  <div className="flex items-center bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
                    <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-white text-sm font-medium">LIVE</span>
                  </div>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center">
                  <div className="text-white font-medium text-lg max-w-md truncate bg-black/40 backdrop-blur-sm rounded-full px-4 py-2">
                    {selectedStream?.title || `${getArtistName(selectedStream)}'s Stream`}
                  </div>
                  <div className="flex items-center space-x-3">
                    {renderQualityIndicator()}
                    <button 
                      onClick={toggleFullscreen}
                      className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                      {isFullscreen ? (
                        <Minimize className="w-5 h-5" />
                      ) : (
                        <Maximize className="w-5 h-5" />
                      )}
                    </button>
                    <button 
                      onClick={leaveChannel}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span>Exit</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center px-6 py-8 rounded-xl bg-black/40 backdrop-blur-sm">
              <div className="animate-pulse mb-6">
                <div className="h-3 w-3 bg-indigo-500 rounded-full mx-auto"></div>
                <div className="h-3 w-3 bg-indigo-500 rounded-full mx-auto mt-1"></div>
                <div className="h-3 w-3 bg-indigo-500 rounded-full mx-auto mt-1"></div>
              </div>
              <div className="text-white text-xl font-medium mb-6">Waiting for stream to start...</div>
              <div className="text-gray-400 text-sm mb-8">The broadcast may take a moment to connect</div>
              <button 
                onClick={leaveChannel}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {started ? (
        // Render full screen video when stream is started
        <>
          <div className="mb-8">
            <button 
              onClick={leaveChannel}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back to all streams</span>
            </button>
          </div>
          
          {renderVideoStream()}
          
          <div className="mt-6">
            <h1 className="text-2xl font-bold text-white">
              {selectedStream?.title || `${getArtistName(selectedStream)}'s Stream`}
            </h1>
            <p className="text-gray-400 mt-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{getArtistName(selectedStream)}</span>
              
              {selectedStream?.participant_count > 0 && (
                <>
                  <span className="mx-2">•</span>
                  <Users className="h-4 w-4" />
                  <span>{selectedStream?.participant_count} watching</span>
                </>
              )}
            </p>
          </div>
        </>
      ) : (
        // Render stream list when not watching
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Livestreams</h1>
              <div className="flex items-center">
                <div className={`h-2 w-2 rounded-full mr-2 ${
                  connectionStatus === 'Not connected' ? 'bg-red-500' : 
                  connectionStatus === 'Initialized' || connectionStatus === 'Connecting' ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`}></div>
                <span className="text-sm text-gray-400">{connectionStatus}</span>
              </div>
            </div>
            
            <button 
              onClick={refreshStreams}
              className="mt-4 sm:mt-0 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Streams</span>
            </button>
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-lg mb-6">
              <p>{errorMessage}</p>
            </div>
          )}
          
          {renderStreamList()}
          
          {isLoading && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-gray-900 p-8 rounded-xl shadow-2xl text-center">
                <div className="flex justify-center">
                  <svg className="animate-spin h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="text-lg font-medium text-white mt-4">Connecting to stream...</div>
                <div className="text-gray-400 text-sm mt-2">This may take a moment</div>
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        /* Hide scrollbar */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default LivestreamViewerApp;