import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchComponent from './SearchComponent';

const SearchPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="bg-black min-h-screen text-white pt-4 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={handleGoBack}
            className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Search</h1>
        </div>

        {/* Search Component */}
        <SearchComponent />

        {/* Recent Searches - could implement in future */}
        <div className="mt-8">
          <h2 className="text-lg font-medium mb-4">Recent Searches</h2>
          {/* Would implement recent searches here */}
          <p className="text-gray-400">Your recent searches will appear here.</p>
        </div>

        {/* Browse Categories */}
        <div className="mt-8">
          <h2 className="text-lg font-medium mb-4">Browse All</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {['Rock', 'Pop', 'Hip-Hop', 'Electronic', 'R&B', 'Jazz', 'Classical', 'Country'].map((genre) => (
              <div
                key={genre}
                className="aspect-square bg-gradient-to-br from-purple-600 to-blue-800 rounded-md flex items-center justify-center cursor-pointer hover:opacity-90 transition"
                onClick={() => navigate(`/genre/${genre.toLowerCase()}`)}
              >
                <span className="text-white font-medium">{genre}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;