// Updated HomePage.jsx with improved mobile sidebar
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/user/home/sidebar/Sidebar';
import Header from '../../components/user/home/header/Header';
import MusicPlayer from '../../components/user/home/main-content/music-player/MusicPlayer';
import { useNavigate, Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    const access_token = localStorage.getItem("access_token");
    if (!access_token) {
      navigate("/login");
    }

    // Set initial sidebar state based on screen size
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarExpanded(false);
      } else {
        setSidebarExpanded(true);
        setShowMobileSidebar(false);
      }
    };
    
    // Run once on mount
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [navigate]);

  // Regular sidebar toggle for desktop
  const toggleSidebar = () => {
    if (window.innerWidth >= 768) {
      setSidebarExpanded(!isSidebarExpanded);
    } else {
      // For mobile, toggle the mobile sidebar visibility
      setShowMobileSidebar(!showMobileSidebar);
    }
  };

  // Toggle mobile sidebar visibility
  const toggleMobileSidebar = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleSkip = () => console.log("Skip to next song");
  const handlePrevious = () => console.log("Go to previous song");

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-gray-900 to-black/40 flex items-center">
        {/* Mobile Menu Button - Now inside the header flex container */}
        <button 
          onClick={toggleMobileSidebar}
          className="md:hidden ml-4 p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700 z-50"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        
        {/* Header component takes remaining width */}
        <div className="flex-1">
          <Header className="h-16" />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Mobile Sidebar */}
        <div 
          className={`
            md:hidden fixed inset-y-0 left-0 z-50 w-64 
            transform ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'} 
            transition-transform duration-300 ease-in-out
            bg-black
          `}
        >
          {/* Sidebar with full height, position underneath header */}
          <div className="h-full pb-24">
            <Sidebar
              isSidebarExpanded={true} // Always expanded when shown on mobile
              toggleSidebar={toggleMobileSidebar}
              isMobile={true} // Pass prop to indicate mobile mode
            />
          </div>
        </div>

        {/* Desktop Sidebar */}
        <div 
          className={`
            hidden md:block h-full
            ${isSidebarExpanded ? 'w-64' : 'w-20'} 
            transition-all duration-300
            bg-black
          `}
        >
          <Sidebar
            isSidebarExpanded={isSidebarExpanded}
            toggleSidebar={toggleSidebar}
            isMobile={false}
          />
        </div>

        {/* Overlay for Mobile Sidebar */}
        {showMobileSidebar && (
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-70 z-40"
            onClick={toggleMobileSidebar}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto scrollbar-hidden">
          <div className="h-full pb-24 px-2 md:px-4">
            <Outlet /> 
          </div>
        </main>
      </div>

      {/* Music Player */}
      <div className="sticky bottom-0 z-30">
        <div className="h-13">
          <MusicPlayer
            isPlaying={isPlaying}
            handlePlayPause={handlePlayPause}
            handleSkip={handleSkip}
            handlePrevious={handlePrevious}
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;