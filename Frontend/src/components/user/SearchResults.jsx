import React from 'react';

const SearchResults = ({ searchResults }) => {
  const { artists, playlists } = searchResults;

  return (
    <div className="mt-4">
      <div>
        <h3 className="text-xl font-semibold">Artists</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-2">
          {artists.map((artist, index) => (
            <div key={index} className="bg-gray-800 p-4 rounded-lg">
              <img src={artist.image} alt={artist.name} className="w-full h-40 object-cover rounded-md" />
              <h4 className="mt-2 text-lg">{artist.name}</h4>
              <p className="text-sm text-gray-400">{artist.type}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold">Playlists</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-2">
          {playlists.map((playlist, index) => (
            <div key={index} className="bg-gray-800 p-4 rounded-lg">
              <img src={playlist.image} alt={playlist.name} className="w-full h-40 object-cover rounded-md" />
              <h4 className="mt-2 text-lg">{playlist.name}</h4>
              <p className="text-sm text-gray-400">Owner: {playlist.owner}</p>
              <p className="text-sm text-gray-400">{playlist.type}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;