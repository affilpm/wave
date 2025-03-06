import React from 'react';

const LivestreamRooms = ({ 
  availableRooms, 
  isArtist, 
  joinRoom, 
  createArtistRoom, 
  isConnected 
}) => {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold mb-2">Available Livestreams</h2>
      
      {isArtist && (
        <div className="mb-4">
          <button 
            onClick={createArtistRoom}
            disabled={!isConnected}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mr-2"
          >
            Start Your Livestream
          </button>
        </div>
      )}

      {availableRooms.length === 0 ? (
        <p className="text-gray-400">No active livestreams</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availableRooms.map((room) => (
            <div 
              key={room.id} 
              className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition"
            >
              <h3 className="text-lg font-medium mb-2">{room.title || 'Livestream'}</h3>
              <p className="text-sm text-gray-400 mb-2">
                Artist: {room.artist || 'Unknown'}
              </p>
              <button 
                onClick={() => joinRoom(room.id)}
                disabled={!isConnected}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Join Livestream
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LivestreamRooms;