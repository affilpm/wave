import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/user/home/sidebar/Sidebar';
import Header from '../../components/user/home/header/Header';
import MusicPlayer from '../../components/user/home/main-content/music-player/MusicPlayer';
import { useNavigate, Outlet } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const playerRef = useRef(null);
  const [playerHeight, setPlayerHeight] = useState(0);

  // Define player height constants for consistency
  const PLAYER_HEIGHT_MOBILE = '5rem'; // 80px
  const PLAYER_HEIGHT_DESKTOP = '5.5rem'; // 88px

  useEffect(() => {
    const access_token = localStorage.getItem("access_token");
    if (!access_token) {
      navigate("/login");
    }

    // Set initial sidebar state based on screen size
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileView(isMobile);
      
      // On mobile: collapsed by default, on desktop: expanded by default
      if (isMobile) {
        setSidebarExpanded(false);
        // Only hide mobile sidebar on initial load or when we're sure it's mobile
        if (!showMobileSidebar) {
          setShowMobileSidebar(false);
        }
      } else {
        setSidebarExpanded(true);
        // Always close the mobile overlay when going to desktop
        setShowMobileSidebar(false);
      }

      // Get actual player height if element exists
      if (playerRef.current) {
        const height = playerRef.current.offsetHeight;
        setPlayerHeight(height);
      }
    };
    
    // Run once on mount
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [navigate, showMobileSidebar]);

  // Update player height when it's rendered
  useEffect(() => {
    if (playerRef.current) {
      const height = playerRef.current.offsetHeight;
      setPlayerHeight(height);
    }
  }, [playerRef.current]);

  // Toggle sidebar based on device type
  const toggleSidebar = () => {
    if (isMobileView) {
      // For mobile, toggle the mobile sidebar visibility
      setShowMobileSidebar(!showMobileSidebar);
    } else {
      // For desktop, toggle sidebar expansion
      setSidebarExpanded(!isSidebarExpanded);
    }
  };

  // Toggle mobile sidebar visibility (from Header component)
  const toggleMobileSidebar = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleSkip = () => console.log("Skip to next song");
  const handlePrevious = () => console.log("Go to previous song");

  // Calculate actual player height for spacing or use default values
  const actualPlayerHeight = playerHeight > 0 
    ? `${playerHeight}px`
    : isMobileView ? PLAYER_HEIGHT_MOBILE : PLAYER_HEIGHT_DESKTOP;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-900 to-black text-white">
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-gray-900 to-black/40">
        <Header toggleMobileSidebar={toggleMobileSidebar} />
      </div>

      {/* Content Area - Adjusted to make room for the player */}
      <div className="flex-1 flex relative overflow-hidden" style={{ marginBottom: actualPlayerHeight }}>
        {/* Mobile Sidebar - Adjust height to not overlap with player */}
        <div 
          className={`
            fixed inset-0 z-50 w-64 
            transform ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'} 
            transition-transform duration-300 ease-in-out
            bg-black md:hidden
          `}
          style={{ bottom: actualPlayerHeight }} // Prevent sidebar from overlapping player
        >
          <Sidebar
            isSidebarExpanded={true} // Always expanded when shown on mobile
            toggleSidebar={toggleMobileSidebar}
            isMobile={true} // Pass prop to indicate mobile mode
          />
        </div>

        {/* Desktop Sidebar - Doesn't overlap with player */}
        <div 
          className={`
            hidden md:block
            ${isSidebarExpanded ? 'w-64' : 'w-20'} 
            transition-all duration-300
            bg-black
            overflow-y-auto
          `}
        >
          <Sidebar
            isSidebarExpanded={isSidebarExpanded}
            toggleSidebar={toggleSidebar}
            isMobile={false}
          />
        </div>

        {/* Overlay for Mobile Sidebar - only render when sidebar is shown */}
        {showMobileSidebar && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-70 z-40 md:hidden"
            onClick={toggleMobileSidebar}
            aria-hidden="true"
            style={{ bottom: actualPlayerHeight }} // Prevent overlay from going behind player
          />
        )}

        {/* Main Content Area with space for player */}
        <main className="flex-1 overflow-y-auto scrollbar-hidden">
          <div className="px-2 md:px-4 pt-2 pb-8">
            <Outlet /> 
            {/* Extra bottom padding to ensure content doesn't get hidden */}
            <div className="h-12" />
          </div>
        </main>
      </div>

      {/* Music Player - Fixed at bottom with higher z-index */}
      <div 
        ref={playerRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black to-black/95 shadow-lg rounded-t-lg md:rounded-t-xl"
        style={{ 
          minHeight: isMobileView ? PLAYER_HEIGHT_MOBILE : PLAYER_HEIGHT_DESKTOP,
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        <div className="mx-auto max-w-screen-2xl h-full">
          <MusicPlayer
            isPlaying={isPlaying}
            handlePlayPause={handlePlayPause}
            handleSkip={handleSkip}
            handlePrevious={handlePrevious}
            currentSong={currentSong}
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;