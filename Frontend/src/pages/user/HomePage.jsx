import React, { useState, useEffect } from 'react';
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
    };
    
    // Run once on mount
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [navigate, showMobileSidebar]);

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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-gray-900 to-black text-white">
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-gray-900 to-black/40">
        <Header toggleMobileSidebar={toggleMobileSidebar} />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Mobile Sidebar - Full height including header and player areas */}
        <div 
          className={`
            fixed inset-0 z-50 w-64 
            transform ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'} 
            transition-transform duration-300 ease-in-out
            bg-black md:hidden
          `}
        >
          <Sidebar
            isSidebarExpanded={true} // Always expanded when shown on mobile
            toggleSidebar={toggleMobileSidebar}
            isMobile={true} // Pass prop to indicate mobile mode
          />
        </div>

        {/* Desktop Sidebar - Now has a max-height to prevent overlap with player */}
        <div 
          className={`
            hidden md:block
            ${isSidebarExpanded ? 'w-64' : 'w-20'} 
            transition-all duration-300
            bg-black
            overflow-y-auto
          `}
          style={{ height: 'calc(100% - 90px)' }} // Reserve space for player
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
          />
        )}

        {/* Main Content Area - Also adjusted to account for player height */}
        <main className="flex-1 overflow-y-auto scrollbar-hidden">
          <div className="h-full pb-24 px-2 md:px-4 pt-2">
            <Outlet /> 
          </div>
        </main>
      </div>

      {/* Music Player - Fixed at bottom with higher z-index */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black to-black/95 shadow-lg h-19">
        <div className="mx-auto max-w-screen-2xl">
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