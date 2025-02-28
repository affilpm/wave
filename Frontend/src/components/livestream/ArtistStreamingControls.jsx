import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Mic, MicOff, Camera, CameraOff, Settings } from 'lucide-react';

const ArtistStreamingControls = ({ isInRoom, startStream, stopStream, isStreaming }) => {
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const { isArtist } = useSelector((state) => state.user);

  // Toggle microphone
  const toggleMic = () => {
    if (isStreaming) {
      // Access the stream and toggle audio tracks
      const localStream = window.localStreamRef?.current;
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = !isMicEnabled;
        });
      }
    }
    setIsMicEnabled(!isMicEnabled);
  };

  // Toggle camera
  const toggleCamera = () => {
    if (isStreaming) {
      // Access the stream and toggle video tracks
      const localStream = window.localStreamRef?.current;
      if (localStream) {
        localStream.getVideoTracks().forEach(track => {
          track.enabled = !isCameraEnabled;
        });
      }
    }
    setIsCameraEnabled(!isCameraEnabled);
  };

  // If the user is not an artist, don't render anything
  if (!isArtist) {
    return null;
  }

  return (
    <div className="bg-gray-800 p-4 rounded mb-4">
      <h3 className="text-white text-lg font-medium mb-4">Artist Streaming Controls</h3>
      
      {!isInRoom ? (
        <div>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Stream Title</label>
            <input
              type="text"
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              placeholder="Give your stream a title"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Stream Description</label>
            <textarea
              value={streamDescription}
              onChange={(e) => setStreamDescription(e.target.value)}
              placeholder="Tell your fans what you'll be streaming"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded h-20"
            />
          </div>
          
          <button 
            onClick={() => startStream(streamTitle, streamDescription)}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Start Artist Stream
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <div className="text-green-400 font-medium mb-2">
              Your stream is live!
            </div>
            <div className="text-gray-300">
              Stream Title: {streamTitle || 'Untitled Stream'}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 mb-4">
            <button 
              onClick={toggleMic}
              className={`flex items-center px-4 py-2 rounded ${
                isMicEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              } text-white`}
            >
              {isMicEnabled ? (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Mic On
                </>
              ) : (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  Mic Off
                </>
              )}
            </button>
            
            <button 
              onClick={toggleCamera}
              className={`flex items-center px-4 py-2 rounded ${
                isCameraEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              } text-white`}
            >
              {isCameraEnabled ? (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Camera On
                </>
              ) : (
                <>
                  <CameraOff className="w-4 h-4 mr-2" />
                  Camera Off
                </>
              )}
            </button>
            
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
          </div>
          
          {showSettings && (
            <div className="bg-gray-700 p-3 rounded mb-4">
              <div className="mb-3">
                <label className="block text-gray-300 mb-2">Update Stream Title</label>
                <input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-gray-300 mb-2">Update Description</label>
                <textarea
                  value={streamDescription}
                  onChange={(e) => setStreamDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded h-20"
                />
              </div>
              
              <button 
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update Stream Info
              </button>
            </div>
          )}
          
          <button 
            onClick={stopStream}
            className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            End Stream
          </button>
        </div>
      )}
    </div>
  );
};

export default ArtistStreamingControls;