import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Search, ChevronLeft, ChevronRight, Home, Video, X, 
  Menu, Bell, Headphones, Settings, UserCircle
} from 'lucide-react';
import { useArtistStatus } from '../../../../hooks/useArtistStatus';
import api from '../../../../api';
import PremiumDetailsModal from './PremiumDetailsModal';
import SearchComponent from './SearchComponent';

const restrictedUrls = ['/studio'];

const Header = ({ toggleMobileSidebar }) => {
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [history, setHistory] = useState([]);
  
  const navigate = useNavigate();
  const location = useLocation();
  const isNavigatingWithButtons = useRef(false);
  const { username, photo, image } = useSelector((state) => state.user);
  const { isArtist } = useArtistStatus();
  
  const mobileMenuRef = useRef(null);
  const profileButtonRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileActions(false);
      }
      
      if (
        showProfileMenu && 
        profileMenuRef.current && 
        !profileMenuRef.current.contains(event.target) &&
        profileButtonRef.current && 
        !profileButtonRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu, showMobileActions]);

  // Handle resize to reset mobile search state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setShowMobileSearch(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track navigation history
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
  }, [location.pathname, currentPosition]);

  // Check premium status
  useEffect(() => {
    const fetchPremiumStatus = async () => {
      try {
        const { data } = await api.get('/api/premium/check-subscription-status/');
        setIsPremium(data.status === 'success');
      } catch (error) {
        setIsPremium(false);
      }
    };
    fetchPremiumStatus();
  }, []);

  // Navigation functions
  const handleNavigation = (path) => {
    navigate(path);
  };

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

  // Toggle functions
  const toggleMobileSearch = () => setShowMobileSearch(!showMobileSearch);
  const toggleMobileActions = () => setShowMobileActions(!showMobileActions);
  const toggleProfileMenu = (e) => {
    e.stopPropagation();
    setShowProfileMenu(!showProfileMenu);
  };

  const handlePremiumClick = () => {
    if (isPremium) {
      setShowPremiumModal(true);
    } else {
      handleNavigation('/premium');
    }
  };

  return (
    <>
      <div className="h-16 bg-black flex items-center justify-between px-2 sm:px-4 sticky top-0 z-50">
        {/* Left Section */}
        <div className="flex items-center gap-2">
          {/* Menu button */}
          <button 
            onClick={toggleMobileSidebar}
            className="md:hidden p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700 z-50"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          {/* Navigation Buttons - visible on all screens */}
          <div className="flex gap-1 xs:gap-2">
            <button
              onClick={handleBack}
              className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full 
                ${currentPosition <= 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-900 hover:bg-gray-800 text-white transition transform hover:scale-105 active:scale-95'} 
                border border-gray-800`}
              disabled={currentPosition <= 0}
            >
              <ChevronLeft className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
            </button>

            <button
              onClick={handleForward}
              className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full 
                ${currentPosition >= history.length - 1
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-900 hover:bg-gray-800 text-white transition transform hover:scale-105 active:scale-95'} 
                border border-gray-800`}
              disabled={currentPosition >= history.length - 1}
            >
              <ChevronRight className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Center Section - Home & Livestream - Hidden on mobile */}
        <div className="hidden md:flex items-center justify-center gap-4 lg:gap-8 max-w-3xl flex-1">
          <button 
            className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-800 transition-colors"
            onClick={() => handleNavigation('/home')}
          >
            <Home className="h-5 w-5 lg:h-6 lg:w-6" />
            <span className="text-sm lg:text-base font-medium">Home</span>
          </button>
          
          <button 
            className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-800 transition-colors"
            onClick={() => handleNavigation('/livestreams')}
          >
            <Video className="h-5 w-5 lg:h-6 lg:w-6" />
            <span className="text-sm lg:text-base font-medium">Livestream</span>
          </button>
          
          {/* Desktop Search Component */}
          <div className="flex-1 mx-2 lg:mx-4 max-w-md">
            <SearchComponent isHeaderSearch={true} />
          </div>
        </div>

        {/* Right Section - Mobile Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile action buttons */}
          <div className="md:hidden flex items-center gap-1">
            {/* Home and Livestream buttons for mobile */}
            <button 
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 hover:bg-gray-800"
              onClick={() => handleNavigation('/home')}
            >
              <Home className="h-4 w-4" />
            </button>

            <button 
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 hover:bg-gray-800"
              onClick={() => handleNavigation('/livestreams')}
            >
              <Video className="h-4 w-4" />
            </button>
            
            {/* Search toggle on mobile */}
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 hover:bg-gray-800"
              onClick={toggleMobileSearch}
            >
              {showMobileSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            
            {/* More actions button on mobile */}
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 hover:bg-gray-800 relative"
              onClick={toggleMobileActions}
            >
              <Bell className="h-4 w-4" />
              {/* Notification dot */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>

          {/* Premium Button */}
          <button
            className={`text-xs sm:text-sm font-medium px-2 py-1 sm:px-3 sm:py-2 rounded-full transition-colors ${
              isPremium ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-green-600 hover:bg-green-500'
            }`}
            onClick={handlePremiumClick}
          >
            {isPremium ? 'Premium' : <span className="hidden xs:inline">Join</span>}
          </button>
          
          {/* Profile Button */}
          <div className="relative">
            <button
              ref={profileButtonRef}
              className="flex items-center gap-1 sm:gap-2 bg-gray-800 rounded-full p-1 sm:pr-2 md:pr-3 hover:bg-gray-700"
              onClick={toggleProfileMenu}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${image ? '' : 'bg-gray-500'}`}
                style={{
                  backgroundImage: image ? `url(${image})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!image && username && (
                  <span className="text-white text-sm sm:text-lg font-bold">
                    {username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-white text-xs sm:text-sm md:inline hidden">{username}</span>
            </button>
            
            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div 
                ref={profileMenuRef}
                className="absolute right-0 mt-2 w-40 sm:w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50"
              >
                {['Profile', 'Settings', isArtist && 'Studio', 'Log out'].map(
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

      {/* Mobile Search Bar - Expanded when toggle is clicked */}
      {showMobileSearch && (
        <div className="md:hidden px-2 py-2 bg-black">
          <SearchComponent onClose={() => setShowMobileSearch(false)} />
        </div>
      )}

      {/* Mobile Actions Menu */}
      {showMobileActions && (
        <div 
          ref={mobileMenuRef}
          className="absolute right-2 top-16 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50"
        >
          <div className="px-4 py-2 border-b border-gray-700">
            <div className="text-sm font-medium">Quick Actions</div>
          </div>
          {[
            { name: 'Home', icon: <Home className="h-4 w-4" />, path: '/home' },
            { name: 'Livestream', icon: <Video className="h-4 w-4" />, path: '/livestreams' },
            { name: 'Now Playing', icon: <Headphones className="h-4 w-4" />, path: '/player' },
            { name: 'Profile', icon: <UserCircle className="h-4 w-4" />, path: '/profile' },
            { name: 'Settings', icon: <Settings className="h-4 w-4" />, path: '/settings' }
          ].map((item, idx) => (
            <button
              key={idx}
              className="flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-700"
              onClick={() => {
                setShowMobileActions(false);
                handleNavigation(item.path);
              }}
            >
              {item.icon}
              <span className="ml-3">{item.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Premium Details Modal */}
      <PremiumDetailsModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)} 
      />
    </>
  );
};

export default Header;