import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useArtistStatus } from '../../../../hooks/useArtistStatus';
import api from '../../../../api';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const navigate = useNavigate();

  const { first_name, photo } = useSelector((state) => state.user);
  const { isArtist } = useArtistStatus();


  useEffect(() => {
    const fetchPremiumStatus = async () => {
      try {
        const { data } = await api.get('/api/premium/subscription/status/');
        setIsPremium(data.status === 'success');
      } catch (error) {
        console.error('Error fetching premium status:', error);
        setIsPremium(false);
      }
    };
    fetchPremiumStatus();
  }, []);

  const handleNavigation = (path) => navigate(path);

  return (
    <div className="h-16 bg-black flex items-center justify-between px-4 sticky top-0 z-50">
      {/* Left Section */}
      <div className="flex gap-3">
        {['-1', '1'].map((dir, idx) => (
          <button
            key={idx}
            onClick={() => navigate(Number(dir))}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-900 hover:bg-gray-800 transition transform hover:scale-105 active:scale-95 border border-gray-800"
          >
            {idx === 0 ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
          </button>
        ))}
      </div>

      {/* Center Section */}
      <div className="flex items-center justify-center gap-8 max-w-3xl flex-1">
        <button
          className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-800 transition-colors"
          onClick={() => handleNavigation('/home')}
        >
          <Home className="h-6 w-6" />
          <span className="text-base font-medium">Home</span>
        </button>
        <div className="flex-1 mx-4 max-w-md">
          <div className="flex items-center bg-gray-800 rounded-full px-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-white text-sm placeholder-gray-400 outline-none flex-1 p-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex gap-4 items-center">
        <button
          className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${
            isPremium ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-green-600 hover:bg-green-500'
          }`}
          onClick={() =>
            isPremium ? console.log('Already premium') : handleNavigation('/premium')
          }
        >
          {isPremium ? 'Premium' : 'Join Premium'}
        </button>
        <div className="relative">
          <button
            className="flex items-center gap-2 bg-gray-800 rounded-full p-1 pr-3 hover:bg-gray-700"
            onClick={() => setShowProfileMenu((prev) => !prev)}
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
              {['Profile', 'Settings', isArtist && 'Studio', 'Log out'].map(
                (item, idx) =>
                  item && (
                    <button
                      key={idx}
                      onClick={() =>
                        item === 'Log out'
                          ? handleNavigation('/logout')
                          : handleNavigation(`/${item.toLowerCase()}`)
                      }
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700"
                    >
                      {item}
                    </button>
                  )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;