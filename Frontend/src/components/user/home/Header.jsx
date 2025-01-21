import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Home, Compass } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useArtistStatus } from '../../../hooks/useArtistStatus';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const { first_name, photo } = useSelector((state) => state.user);
  const { isArtist } = useArtistStatus();

  const handleLogout = () => {
    navigate('/logout');
  };

  return (
    <div className="h-16 bg-black flex items-center justify-between px-8 sticky top-0 z-50">
      {/* Left Section */}
      <div className="w-1/4 flex items-center gap-4">
        {/* Enhanced Navigation Buttons */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-900 hover:bg-gray-800 transition-all transform hover:scale-105 active:scale-95 border border-gray-800"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button 
            onClick={() => navigate(1)} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-900 hover:bg-gray-800 transition-all transform hover:scale-105 active:scale-95 border border-gray-800"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Center Section */}
      <div className="flex-1 flex items-center justify-center gap-8 max-w-3xl">
        {/* Home Button */}
        <button
          className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-800 transition-colors"
          onClick={() => navigate('/home')}
        >
          <Home className="h-6 w-6" />
          <span className="text-base font-medium">Home</span>
        </button>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-full">
            <Search className="h-5 w-5 text-gray-400 ml-2" />
            <input
              type="text"
              placeholder="Search songs, artists, or albums..."
              className="bg-transparent text-white text-base placeholder-gray-400 outline-none flex-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            />
            <button
              className="flex items-center gap-2 bg-blue-900 hover:bg-blue-700 text-white text-base font-medium px-4 py-2 rounded-full transition-colors"
              onClick={() => navigate('/explore')}
            >
              <Compass className="h-5 w-5" />
              <span>Explore</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Section - Profile */}
      <div className="w-1/4 flex justify-end">
        <div className="relative">
          <button
            className="flex items-center gap-2 bg-gray-800 rounded-full p-1 pr-3 hover:bg-gray-700"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div
              className={`w-8 h-8 rounded-full ${photo ? '' : 'bg-gray-500'}`}
              style={{
                backgroundImage: photo ? `url(${photo})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            {first_name && <span className="text-white text-sm">{first_name}</span>}
          </button>
          
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1">
              <a
                href="#"
                className="block px-4 py-2 text-sm hover:bg-gray-700"
                onClick={() => navigate('/profile')}
              >
                Profile
              </a>
              <button
                onClick={() => navigate('/settings')}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 focus:outline-none"
              >
                Settings
              </button>
              {isArtist && (
                <button
                  onClick={() => navigate('/studio')}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 focus:outline-none"
                >
                  Studio
                </button>
              )}
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 focus:outline-none"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;