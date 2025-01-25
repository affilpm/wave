import React from 'react';
import { FaMusic, FaPlay, FaHeadphones, FaListAlt } from 'react-icons/fa'; // Import icons from react-icons
import { useNavigate } from 'react-router-dom';


const LandingPage = () => {
  const navigate = useNavigate()  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
            <img src="/public/shape.png" alt="Music Logo" className="w-10 h-10" /> {/* Replace with your image */}
            <span className="text-xl font-bold text-white">Wave</span>
        </div>
        <div className="space-x-4">
          {/* Custom Button */}
          <button onClick={()=> navigate('/register')} className="text-white hover:text-purple-400 border border-white px-6 py-2 rounded-md">
            Sign Up
          </button>
          <button onClick={()=> navigate('/login')} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md">
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-12 md:mb-0">
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
              Your Music, <br />
              <span className="text-purple-500">Your Way</span>
            </h1>
            <p className="text-lg text-gray-300 mb-8">
              Stream millions of songs, create custom playlists, and discover new artists. 
              Join our community of music lovers today.
            </p>
            <div className="space-x-4">
              {/* Custom Button */}
              <button onClick={()=> navigate('/register')} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg rounded-md">
                Get Started Free
              </button>
              <button  className="text-white border-white hover:bg-white/10 px-8 py-6 text-lg rounded-md">
                Learn More
              </button>
            </div>
          </div>
          
          {/* Features Grid */}
          <div className="md:w-1/2 grid grid-cols-2 gap-6">
            <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
              <FaPlay className="w-10 h-10 text-purple-500 mb-4" /> {/* Use FaPlay for play icon */}
              <h3 className="text-xl font-semibold text-white mb-2">Instant Streaming</h3>
              <p className="text-gray-300">Play your favorite tracks instantly with high-quality audio</p>
            </div>
            <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
              <FaListAlt className="w-10 h-10 text-purple-500 mb-4" /> {/* Use FaListAlt for library icon */}
              <h3 className="text-xl font-semibold text-white mb-2">Huge Library</h3>
              <p className="text-gray-300">Access millions of songs from artists worldwide</p>
            </div>
            <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
              <FaHeadphones className="w-10 h-10 text-purple-500 mb-4" /> {/* Use FaHeadphones for headphones icon */}
              <h3 className="text-xl font-semibold text-white mb-2">Personal Playlists</h3>
              <p className="text-gray-300">Create and share your perfect playlists</p>
            </div>
            <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
              <FaMusic className="w-10 h-10 text-purple-500 mb-4" /> {/* Use FaMusic for music icon */}
              <h3 className="text-xl font-semibold text-white mb-2">Smart Recommendations</h3>
              <p className="text-gray-300">Discover new music based on your taste</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;