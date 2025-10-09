import React, {useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Headphones, Radio, Mic, Guitar, Stars } from 'lucide-react';
import api from '../../../../../api';
// const genres = [
//   {
//     id: 7,
//     name: 'Pop',
//     icon: <Music size={24} />,
//     color: 'bg-pink-500',
//     description: 'Chart-topping hits and catchy melodies',
//     featured: 'Taylor Swift, Ed Sheeran, Ariana Grande'
//   },
//   {
//     id: 6,
//     name: 'Electronic',
//     icon: <Headphones size={24} />,
//     color: 'bg-purple-500',
//     description: 'Dance, EDM, and electronic beats',
//     featured: 'Calvin Harris, Daft Punk, Deadmau5'
//   },
//   {
//     id: 1,
//     name: 'Rock',
//     icon: <Guitar size={24} />,
//     color: 'bg-red-500',
//     description: 'Classic and modern rock anthems',
//     featured: 'Foo Fighters, Arctic Monkeys, The Strokes'
//   },
//   {
//     id: 4,
//     name: 'Hip Hop',
//     icon: <Mic size={24} />,
//     color: 'bg-blue-500',
//     description: 'Rap, beats, and urban culture',
//     featured: 'Kendrick Lamar, Drake, J. Cole'
//   },
//   {
//     id: 2,
//     name: 'Jazz',
//     icon: <Radio size={24} />,
//     color: 'bg-yellow-500',
//     description: 'Smooth jazz and classic standards',
//     featured: 'Miles Davis, John Coltrane, Ella Fitzgerald'
//   },
//   {
//     id: 5,
//     name: 'Indie',
//     icon: <Stars size={24} />,
//     color: 'bg-green-500',
//     description: 'Alternative and independent artists',
//     featured: 'The 1975, Tame Impala, Arctic Monkeys'
//   }
// ];

// const GenreCard = ({ genre }) => {
//   const navigate = useNavigate();
//   const [isHovered, setIsHovered] = React.useState(false);

//   return (
//     <div
//       onClick={() => navigate(`/genres/${genre.id}`)}
//       className="relative rounded-lg overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105"
//       onMouseEnter={() => setIsHovered(true)}
//       onMouseLeave={() => setIsHovered(false)}
//     >
//       <div className={`${genre.color} p-6 h-48 flex flex-col justify-between`}>
//         <div className="text-white">
//           <div className="flex justify-between items-start">
//             <span className="text-2xl font-bold">{genre.name}</span>
//             <span className="text-white/80">{genre.icon}</span>
//           </div>
//           <p className="mt-2 text-sm text-white/80">{genre.description}</p>
//         </div>
        
//         <div className={`transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
//           <p className="text-xs text-white/90 font-medium">Featured Artists:</p>
//           <p className="text-sm text-white">{genre.featured}</p>
//         </div>
//       </div>
//     </div>
//   );
// };

const GenreDiscovery = () => {
  const navigate = useNavigate();
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(null);

  const colors = [
    'bg-pink-500',
    'bg-purple-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500'
  ];

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await api.get('/api/home/public-genres/');
        setGenres(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch genres');
        setLoading(false);
      }
    };

    fetchGenres();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 via-black to-black">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Music Genres</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {genres.map((genre, index) => (
            <div
              key={genre.id}
              onClick={() => navigate(`/genres/${genre.id}`)}
              onMouseEnter={() => setIsHovered(genre.id)}
              onMouseLeave={() => setIsHovered(null)}
              className={`${colors[index % colors.length]} rounded-lg p-6 cursor-pointer transition-transform duration-200 hover:scale-105`}
            >
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-white">{genre.name}</h2>
                <Music className="text-white/80" size={24} />
              </div>
              <p className="mt-4 text-white/80">{genre.description}</p>
              
              {/* Hover state information */}
              <div className={`mt-4 transition-opacity duration-200 ${isHovered === genre.id ? 'opacity-100' : 'opacity-0'}`}>
                <p className="text-xs text-white/90 font-medium">Click to explore more</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default GenreDiscovery;