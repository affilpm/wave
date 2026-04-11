import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Search } from 'lucide-react';
import api from '../../api';
import { getGenreStyles } from '../../utils/genreUtils.jsx';

const DiscoverPage = () => {
  const [genres, setGenres] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await api.get('/api/v1/home/public-genres/');
        setGenres(response.data.results || response.data);
      } catch (err) {
        console.error('Failed to fetch genres:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenres();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-800 animate-pulse rounded-lg shadow-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex flex-col gap-1 md:gap-2 text-center md:text-left pt-4 md:pt-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">Browse All</h1>
        <p className="text-gray-400 max-w-2xl text-sm md:text-base">Explore music by your favorite genres and moods.</p>
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
        {genres.map((genre) => {
          const { color, icon } = getGenreStyles(genre.name);
          return (
            <div
              key={genre.id}
              onClick={() => navigate(`/genres/${genre.id}`)}
              className={`${color} 
                         relative aspect-square rounded-lg p-4 cursor-pointer overflow-hidden 
                         shadow-md hover:shadow-xl transition-all duration-300 group`}
            >
              <h3 className="text-white text-xl md:text-2xl font-bold break-words z-10 relative">
                {genre.name}
              </h3>
              {React.cloneElement(icon, { 
                size: 48, 
                className: "absolute -bottom-2 -right-2 rotate-12 opacity-50 group-hover:scale-110 transition-transform" 
              })}
            </div>
          );
        })}
      </div>

      {genres.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="p-4 bg-gray-900 rounded-full">
            <Search size={48} className="text-gray-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">No genres found</h2>
            <p className="text-gray-400">Try searching for specific tracks instead.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoverPage;
