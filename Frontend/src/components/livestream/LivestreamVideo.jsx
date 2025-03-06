import React from 'react';

const LivestreamVideo = ({ 
  localStream, 
  remoteStreams, 
  localVideoRef, 
  streamSettings 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Local Video */}
      {localStream && streamSettings.video && (
        <div className="bg-gray-800 rounded-lg p-2">
          <h3 className="text-lg font-medium mb-2">Your Stream</h3>
          <video 
            ref={localVideoRef} 
            autoPlay 
            muted 
            className="w-full rounded-lg"
          />
        </div>
      )}

      {/* Remote Streams */}
      {Array.from(remoteStreams).map(([peerId, stream]) => (
        <div key={peerId} className="bg-gray-800 rounded-lg p-2">
          <h3 className="text-lg font-medium mb-2">Remote Stream</h3>
          <video 
            srcObject={stream} 
            autoPlay 
            className="w-full rounded-lg"
          />
        </div>
      ))}
    </div>
  );
};

export default LivestreamVideo;