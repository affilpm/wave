import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/user/home/sidebar/Sidebar';
import Header from '../../components/user/home/header/Header';
import MusicPlayer from '../../components/user/home/dashboard/music-player/MusicPlayer';


import { useNavigate, Routes, Route, Outlet } from 'react-router-dom';


const HomePage = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const access_token = localStorage.getItem("access_token");
    if (!access_token) {
      navigate("/login");
    }
  }, [navigate]);

  const toggleSidebar = () => setSidebarExpanded(!isSidebarExpanded);
  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleSkip = () => console.log("Skip to next song");
  const handlePrevious = () => console.log("Go to previous song");

  return (
    <div className="h-screen flex flex-col overflow-y-auto bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header - Fixed at top with highest z-index */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-gray-900 to-black/40">
        <Header className="h-16" />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex relative overflow-hidden"> {/* Ensure overflow is handled properly */}
        {/* Sidebar */}
        <div className={`h-full ${isSidebarExpanded ? 'w-64' : 'w-20'} transition-all duration-300`}>
          <Sidebar
            isSidebarExpanded={isSidebarExpanded}
            toggleSidebar={toggleSidebar}
          />
        </div>

        {/* Main Content - Added padding at bottom for music player */}
        <main className="flex-1 overflow-y-auto scrollbar-hidden">
          <div className="h-full pb-24"> {/* Added padding-bottom for music player space */}
          <Outlet /> 
          </div>
        </main>
      </div>

      {/* Music Player - Fixed at bottom with backdrop blur */}
      <div className="sticky bottom-0 ">
        <div className="h-13"> {/* Fixed height for music player */}
          
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