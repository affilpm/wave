import React, { useState } from 'react';
import { Clock, Heart, Play } from 'lucide-react';

const Home = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const recentlyPlayed = [
    { name: "Liked Songs", image: "/api/placeholder/80/80", type: "Playlist", owner: "You" },
    { name: "Daily Mix 1", image: "/api/placeholder/80/80", type: "Mix", owner: "Spotify" },
    { name: "Discover Weekly", image: "/api/placeholder/80/80", type: "Playlist", owner: "Spotify" },
    { name: "Release Radar", image: "/api/placeholder/80/80", type: "Playlist", owner: "Spotify" },
    { name: "Your Top 2023", image: "/api/placeholder/80/80", type: "Playlist", owner: "Spotify" },
    { name: "Chill Vibes", image: "/api/placeholder/80/80", type: "Playlist", owner: "Spotify" }
  ];

  const featuredAlbums = [
    { name: "Album 1", artist: "Artist 1", image: "/api/placeholder/200/200", type: "Album" },
    { name: "Album 2", artist: "Artist 2", image: "/api/placeholder/200/200", type: "Album" },
    { name: "Album 3", artist: "Artist 3", image: "/api/placeholder/200/200", type: "Album" },
    { name: "Album 4", artist: "Artist 4", image: "/api/placeholder/200/200", type: "Album" },
    { name: "Album 5", artist: "Artist 5", image: "/api/placeholder/200/200", type: "Album" }
  ];

  const topMixes = [
    { name: "Mix 1", description: "Artist 1, Artist 2, Artist 3", image: "/api/placeholder/200/200" },
    { name: "Mix 2", description: "Artist 4, Artist 5, Artist 6", image: "/api/placeholder/200/200" },
    { name: "Mix 3", description: "Artist 7, Artist 8, Artist 9", image: "/api/placeholder/200/200" },
    { name: "Mix 4", description: "Artist 10, Artist 11, Artist 12", image: "/api/placeholder/200/200" }
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Recently Played Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        {recentlyPlayed.map((item, index) => (
          <div
            key={index}
            className="bg-gray-800/50 rounded-md p-4 hover:bg-gray-800 transition-all cursor-pointer group"
          >
            <div className="relative">
              <img
                src={item.image}
                alt={item.name}
                className="w-full aspect-square object-cover rounded-md shadow-lg mb-4"
              />
              <button
                className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full items-center justify-center hidden group-hover:flex shadow-xl hover:scale-105 transition-all"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                <Play className="w-5 h-5 text-black" />
              </button>
            </div>
            <h4 className="font-semibold truncate">{item.name}</h4>
            <p className="text-sm text-gray-400 truncate">{item.owner}</p>
          </div>
        ))}
      </div>

      {/* Made For You Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Made For You</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {topMixes.map((mix, index) => (
            <div
              key={index}
              className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/60 transition-all cursor-pointer group"
            >
              <div className="relative">
                <img
                  src={mix.image}
                  alt={mix.name}
                  className="w-full aspect-square object-cover rounded-md shadow-lg mb-4"
                />
                <button
                  className="absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center hidden group-hover:flex shadow-xl hover:scale-105 transition-all"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  <Play className="w-6 h-6 text-black" />
                </button>
              </div>
              <h3 className="font-bold mb-1">{mix.name}</h3>
              <p className="text-sm text-gray-400">{mix.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* New Releases Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">New Releases</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {featuredAlbums.map((album, index) => (
            <div
              key={index}
              className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/60 transition-all cursor-pointer group"
            >
              <div className="relative">
                <img
                  src={album.image}
                  alt={album.name}
                  className="w-full aspect-square object-cover rounded-md shadow-lg mb-4"
                />
                <button
                  className="absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center hidden group-hover:flex shadow-xl hover:scale-105 transition-all"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  <Play className="w-6 h-6 text-black" />
                </button>
              </div>
              <h3 className="font-bold mb-1">{album.name}</h3>
              <p className="text-sm text-gray-400">New release from {album.artist}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;