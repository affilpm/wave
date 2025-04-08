import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/user/home/sidebar/Sidebar';
import Header from '../../components/user/home/header/Header';
import MusicPlayer from '../../components/user/home/main-content/music-player/MusicPlayer';
import { useNavigate, Outlet } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // On mobile devices, sidebar starts collapsed
      if (window.innerWidth < 768) {
        setSidebarExpanded(false);
        setSidebarVisible(false);
      } else {
        setSidebarVisible(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Authentication check
  useEffect(() => {
    const access_token = localStorage.getItem("access_token");
    if (!access_token) {
      navigate("/login");
    }
  }, [navigate]);

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarVisible(!sidebarVisible);
    } else {
      setSidebarExpanded(!isSidebarExpanded);
    }
  };

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleSkip = () => console.log("Skip to next song");
  const handlePrevious = () => console.log("Go to previous song");

  // Close sidebar when clicking outside on mobile
  const handleMainContentClick = () => {
    if (isMobile && sidebarVisible) {
      setSidebarVisible(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-gray-900 to-black/40">
        <Header className="h-12 md:h-16" onMenuClick={toggleSidebar} />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar - Mobile: absolute positioning, Desktop: static */}
        <div 
          className={`
            ${isMobile ? 'absolute z-40 h-full' : 'h-full'} 
            ${isMobile ? (sidebarVisible ? 'left-0' : '-left-full') : ''}
            ${!isMobile && isSidebarExpanded ? 'w-56 md:w-64' : 'w-16 md:w-20'}
            transition-all duration-300 bg-black bg-opacity-95
          `}
        >
          <Sidebar
            isSidebarExpanded={isMobile ? true : isSidebarExpanded}
            toggleSidebar={toggleSidebar}
          />
        </div>

        {/* Overlay for mobile when sidebar is open */}
        {isMobile && sidebarVisible && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={toggleSidebar}
          />
        )}

        {/* Main Content */}
        <main 
          className="flex-1 overflow-y-auto scrollbar-hidden"
          onClick={handleMainContentClick}
        >
          <div className="h-full pb-20 md:pb-24 px-2 md:px-4">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Music Player */}
      <div className="sticky bottom-0 z-50">
        <div className="h-16 md:h-20">
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