import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Headphones, Radio, Mic, Guitar, Stars } from 'lucide-react';

const genres = [
  {
    id: 7,
    name: 'Pop',
    icon: <Music size={24} />,
    color: 'bg-pink-500',
    description: 'Chart-topping hits and catchy melodies',
    featured: 'Taylor Swift, Ed Sheeran, Ariana Grande'
  },
  {
    id: 6,
    name: 'Electronic',
    icon: <Headphones size={24} />,
    color: 'bg-purple-500',
    description: 'Dance, EDM, and electronic beats',
    featured: 'Calvin Harris, Daft Punk, Deadmau5'
  },
  {
    id: 1,
    name: 'Rock',
    icon: <Guitar size={24} />,
    color: 'bg-red-500',
    description: 'Classic and modern rock anthems',
    featured: 'Foo Fighters, Arctic Monkeys, The Strokes'
  },
  {
    id: 4,
    name: 'Hip Hop',
    icon: <Mic size={24} />,
    color: 'bg-blue-500',
    description: 'Rap, beats, and urban culture',
    featured: 'Kendrick Lamar, Drake, J. Cole'
  },
  {
    id: 2,
    name: 'Jazz',
    icon: <Radio size={24} />,
    color: 'bg-yellow-500',
    description: 'Smooth jazz and classic standards',
    featured: 'Miles Davis, John Coltrane, Ella Fitzgerald'
  },
  {
    id: 5,
    name: 'Indie',
    icon: <Stars size={24} />,
    color: 'bg-green-500',
    description: 'Alternative and independent artists',
    featured: 'The 1975, Tame Impala, Arctic Monkeys'
  }
];

const GenreCard = ({ genre }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      onClick={() => navigate(`/genres/${genre.id}`)}
      className="relative rounded-lg overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`${genre.color} p-6 h-48 flex flex-col justify-between`}>
        <div className="text-white">
          <div className="flex justify-between items-start">
            <span className="text-2xl font-bold">{genre.name}</span>
            <span className="text-white/80">{genre.icon}</span>
          </div>
          <p className="mt-2 text-sm text-white/80">{genre.description}</p>
        </div>
        
        <div className={`transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-xs text-white/90 font-medium">Featured Artists:</p>
          <p className="text-sm text-white">{genre.featured}</p>
        </div>
      </div>
    </div>
  );
};

const GenreDiscovery = () => {
  return (
    <div className="p-2 min-h-screen bg-gradient-to-b from-gray-900 via-black to-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-100">Discover Genres</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {genres.map((genre) => (
            <GenreCard key={genre.id} genre={genre} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GenreDiscovery;