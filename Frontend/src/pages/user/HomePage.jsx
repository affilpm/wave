import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/user/home/sidebar/Sidebar';
import Header from '../../components/user/home/header/Header';
import Player from '../../components/player/Player';
import { useNavigate, Outlet } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const PLAYER_HEIGHT = '64px';

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

  const actualPlayerHeight = PLAYER_HEIGHT;

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md">
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
        <main className="flex-1 overflow-y-auto scrollbar-hidden bg-gradient-to-b from-indigo-900/10 via-black to-black">
          <Outlet /> 
          {/* Extra bottom padding to ensure content doesn't get hidden */}
          <div className="h-12" />
        </main>
      </div>

      <Player />
    </div>
  );
};

export default HomePage;