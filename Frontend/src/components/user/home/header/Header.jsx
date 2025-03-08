import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useArtistStatus } from '../../../../hooks/useArtistStatus';
import api from '../../../../api';

const restrictedUrls = ['/studio'];

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const navigate = useNavigate();
  const isNavigatingWithButtons = useRef(false);
  const { username, photo, image } = useSelector((state) => state.user);
  const { isArtist } = useArtistStatus();
  const [currentPosition, setCurrentPosition] = useState(0);
  const location = useLocation();
  const [history, setHistory] = useState([]);

  const profileMenuRef = useRef(null); // Ref to track the profile menu
  const profileButtonRef = useRef(null); // New ref for the toggle button

  useEffect(() => {
    // Check if a click is outside the profile menu and the toggle button
    const handleClickOutside = (event) => {
      if (
        showProfileMenu && 
        profileMenuRef.current && 
        !profileMenuRef.current.contains(event.target) &&
        profileButtonRef.current && 
        !profileButtonRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false); // Close the menu if clicked outside
      }
    };

    // Add event listener for click outside
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  useEffect(() => {
    if (isNavigatingWithButtons.current) {
      isNavigatingWithButtons.current = false;
      return;
    }

    if (restrictedUrls.includes(location.pathname)) {
      return;
    }

    setHistory(prevHistory => {
      let newHistory;
      if (currentPosition < prevHistory.length - 1 && currentPosition >= 0) {
        newHistory = prevHistory.slice(0, currentPosition + 1);
      } else {
        newHistory = [...prevHistory];
      }

      const lastPath = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
      if (lastPath !== location.pathname) {
        newHistory = [...newHistory, location.pathname];
        setCurrentPosition(newHistory.length - 1);
        return newHistory;
      }

      return prevHistory;
    });
  }, [location.pathname, currentPosition, restrictedUrls]);

  const handleBack = () => {
    if (currentPosition > 0) {
      isNavigatingWithButtons.current = true;
      setCurrentPosition(currentPosition - 1);
      navigate(history[currentPosition - 1]);
    }
  };

  const handleForward = () => {
    if (currentPosition < history.length - 1) {
      isNavigatingWithButtons.current = true;
      setCurrentPosition(currentPosition + 1);
      navigate(history[currentPosition + 1]);
    }
  };

  useEffect(() => {
    const fetchPremiumStatus = async () => {
      try {
        const { data } = await api.get('/api/premium/subscription/status/');
        setIsPremium(data.status === 'success');
      } catch (error) {
        setIsPremium(false);
      }
    };
    fetchPremiumStatus();
  }, []);

  const handleNavigation = (path) => navigate(path);

  const toggleProfileMenu = (e) => {
    e.stopPropagation(); // Stop event propagation
    setShowProfileMenu((prev) => !prev);
  };

  return (
    <div className="h-16 bg-black flex items-center justify-between px-4 sticky top-0 z-50">
      {/* Left Section */}
      <div className="flex gap-3">
        {/* Previous Button */}
        <button
          onClick={handleBack}
          className={`w-10 h-10 flex items-center justify-center rounded-full 
            ${currentPosition <= 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
              : 'bg-gray-900 hover:bg-gray-800 text-white transition transform hover:scale-105 active:scale-95'} 
            border border-gray-800`}
          disabled={currentPosition <= 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Next Button */}
        <button
          onClick={handleForward}
          className={`w-10 h-10 flex items-center justify-center rounded-full 
            ${currentPosition >= history.length - 1
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
              : 'bg-gray-900 hover:bg-gray-800 text-white transition transform hover:scale-105 active:scale-95'} 
            border border-gray-800`}
          disabled={currentPosition >= history.length - 1}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
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
            ref={profileButtonRef}
            className="flex items-center gap-2 bg-gray-800 rounded-full p-1 pr-3 hover:bg-gray-700"
            onClick={toggleProfileMenu}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${image ? '' : 'bg-gray-500'}`}
              style={{
                backgroundImage: image ? `url(${image})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!image && username && (
                <span className="text-white text-lg font-bold">
                  {username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {username && <span className="text-white text-sm">{username}</span>}
          </button>
          {showProfileMenu && (
            <div 
              ref={profileMenuRef}
              className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1"
            >
              {['Profile', 'Settings', 'Monetization', isArtist && 'Studio', 'Log out'].map(
                (item, idx) =>
                  item && (
                    <button
                      key={idx}
                      onClick={() => {
                        setShowProfileMenu(false);
                        item === 'Log out'
                          ? handleNavigation('/logout')
                          : handleNavigation(`/${item.toLowerCase()}`);
                      }}
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