import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Sample data structure
const dummyGenreData = [
  {
    id: 1,
    name: "Hip-Hop Essentials",
    description: "Today's top hip-hop tracks",
    songs: [
      {
        id: 1,
        title: "Golden Flow",
        artist: "MC Rhythm",
        coverImage: "/api/placeholder/192/192"
      },
      {
        id: 2,
        title: "City Lights",
        artist: "Urban Poets",
        coverImage: "/api/placeholder/192/192"
      },
      {
        id: 3,
        title: "Midnight Drive",
        artist: "The Beat Makers",
        coverImage: "/api/placeholder/192/192"
      },
      {
        id: 4,
        title: "Street Stories",
        artist: "Flow Masters",
        coverImage: "/api/placeholder/192/192"
      },
      {
        id: 5,
        title: "Dreams & Reality",
        artist: "Lyric Kings",
        coverImage: "/api/placeholder/192/192"
      }
    ]
  },
  {
    id: 2,
    name: "Rock Classics",
    description: "Timeless rock anthems",
    songs: [
      {
        id: 6,
        title: "Electric Dreams",
        artist: "The Voltage",
        coverImage: "/api/placeholder/192/192"
      },
      {
        id: 7,
        title: "Neon Nights",
        artist: "Guitar Heroes",
        coverImage: "/api/placeholder/192/192"
      },
      {
        id: 8,
        title: "Thunder Road",
        artist: "Storm Riders",
        coverImage: "/api/placeholder/192/192"
      },
      {
        id: 9,
        title: "Eternal Flame",
        artist: "Phoenix Rising",
        coverImage: "/api/placeholder/192/192"
      }
    ]
  },
  {
    id: 3,
    name: "Chill Vibes",
    description: "Relaxing beats for your day",
    songs: [
      {
        id: 10,
        title: "Ocean Breeze",
        artist: "Wave Collective",
        coverImage: "/api/placeholder/192/192"
      },
      {
        id: 11,
        title: "Sunset Dreams",
        artist: "Ambient Minds",
        coverImage: "/api/placeholder/192/192"
      },
      {
        id: 12,
        title: "Mountain Air",
        artist: "Nature Sounds",
        coverImage: "/api/placeholder/192/192"
      },
      {
        id: 13,
        title: "Peaceful Morning",
        artist: "Zen Masters",
        coverImage: "/api/placeholder/192/192"
      }
    ]
  },
  {
    id: 4,
    name: "Electronic Beats",
    description: "Future-forward electronic music",
    songs: [
      {
        id: 14,
        title: "Digital Dreams",
        artist: "Cyber Punk",
        coverImage: "/api/placeholder/192/192"
      },
      {
        id: 15,
        title: "Future Shock",
        artist: "Binary Beats",
        coverImage: "/api/placeholder/192/192"
      },
      {
        id: 16,
        title: "Neural Network",
        artist: "Tech Wizards",
        coverImage: "/api/placeholder/192/192"
      },
      {
        id: 17,
        title: "Virtual Reality",
        artist: "Digital Nomads",
        coverImage: "/api/placeholder/192/192"
      }
    ]
  }
];

const DummyGenrePage = () => {
  const handleScroll = (direction, genreId) => {
    const container = document.getElementById(`genre-${genreId}`);
    const scrollAmount = 300;
    if (container) {
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Discover Music</h1>
      
      <div className="space-y-12">
        {dummyGenreData.map((genre) => (
          <div key={genre.id} className="relative">
            <h2 className="text-2xl font-bold mb-4 px-4">
              {genre.name}
              <span className="text-sm font-normal text-gray-400 ml-2">
                {genre.description}
              </span>
            </h2>

            <button
              onClick={() => handleScroll('left', genre.id)}
              className="absolute left-0 top-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-r transform -translate-y-1/2"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => handleScroll('right', genre.id)}
              className="absolute right-0 top-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-l transform -translate-y-1/2"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <div
              id={`genre-${genre.id}`}
              className="flex overflow-x-auto scrollbar-hide gap-4 px-4 pb-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {genre.songs.map((song) => (
                <div
                  key={song.id}
                  className="flex-none w-48 transition-transform hover:scale-105"
                >
                  <div className="relative group">
                    <img
                      src={song.coverImage}
                      alt={song.title}
                      className="w-48 h-48 object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity rounded-md flex items-center justify-center">
                      <button className="opacity-0 group-hover:opacity-100 bg-green-500 text-white p-3 rounded-full hover:bg-green-400 transition-all">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-white font-medium truncate">
                      {song.title}
                    </h3>
                    <p className="text-gray-400 text-sm truncate">
                      {song.artist}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DummyGenrePage;