import React from 'react';

const ArtistStreamControls = ({ 
  streamInfo, 
  setStreamInfo, 
  toggleMediaSettings, 
  streamSettings 
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 mt-4">
      <h3 className="text-xl font-semibold mb-4">Stream Settings</h3>
      
      {/* Stream Information */}
      <div className="mb-4">
        <label htmlFor="stream-title" className="block text-sm font-medium text-gray-300 mb-2">
          Stream Title
        </label>
        <input 
          id="stream-title"
          type="text"
          value={streamInfo.title}
          onChange={(e) => setStreamInfo(prev => ({
            ...prev, 
            title: e.target.value
          }))}
          placeholder="Enter stream title"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="stream-description" className="block text-sm font-medium text-gray-300 mb-2">
          Stream Description
        </label>
        <input 
          id="stream-description"
          type="text"
          value={streamInfo.description}
          onChange={(e) => setStreamInfo(prev => ({
            ...prev, 
            description: e.target.value
          }))}
          placeholder="Enter stream description"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
        />
      </div>

      {/* Media Settings */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input 
            type="checkbox"
            id="audio-toggle"
            checked={streamSettings.audio}
            onChange={() => toggleMediaSettings('audio')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="audio-toggle" className="text-gray-300">
            Audio
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input 
            type="checkbox"
            id="video-toggle"
            checked={streamSettings.video}
            onChange={() => toggleMediaSettings('video')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="video-toggle" className="text-gray-300">
            Video
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input 
            type="checkbox"
            id="screen-share"
            checked={streamSettings.screenShare}
            onChange={() => toggleMediaSettings('screenShare')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="screen-share" className="text-gray-300">
            Screen Share
          </label>
        </div>
      </div>
    </div>
  );
};

export default ArtistStreamControls;