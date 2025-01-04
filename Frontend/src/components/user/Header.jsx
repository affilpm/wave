import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useArtistStatus } from '../../hooks/useArtistStatus';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  // Access Redux state
  const { first_name, photo } = useSelector((state) => state.user);
  
  // Check artist status
  const { isArtist } = useArtistStatus();

  const handleLogout = () => {
    navigate('/logout');
  };

  return (
    <div className="h-16 bg-black flex items-center px-8 sticky top-0 z-50">
      {/* Navigation Links */}
      <div className="flex items-center gap-8 w-1/4">
        <div
          className="flex items-center gap-3 text-lg font-semibold hover:text-gray-300 cursor-pointer"
          onClick={() => navigate('/')}
        >
          Home
        </div>
        <div
          className="flex items-center gap-3 text-lg font-semibold hover:text-gray-300 cursor-pointer"
          onClick={() => navigate('/discover')}
        >
          Discover
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 flex items-center justify-center gap-8">
        <div className="relative">
          <div className="flex items-center gap-3 p-2 bg-gray-800 rounded-full w-80">
            <Search className="h-5 w-5 text-gray-400 ml-2" />
            <input
              type="text"
              placeholder="Search for artists, songs, or playlists"
              className="bg-transparent text-white text-sm placeholder-gray-400 outline-none flex-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            />
          </div>
        </div>
      </div>

      {/* Profile Menu */}
      <div className="w-1/4 flex justify-end">
        <div className="relative">
          <button
            className="flex items-center gap-2 bg-gray-800 rounded-full p-1 pr-3 hover:bg-gray-700"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            {/* Profile Image or Placeholder */}
            <div
              className={`w-8 h-8 rounded-full ${photo ? '' : 'bg-gray-500'}`}
              style={{
                backgroundImage: photo ? `url(${photo})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            {/* Display First Name */}
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
              {/* Only show Studio if user is an artist */}
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