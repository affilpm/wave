import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/user/Sidebar';
import Header from '../../components/user/Header';
import MusicPlayer from '../../components/user/MusicPlayer';
import Home from '../../components/user/home';

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
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Main Layout */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header className="flex-shrink-0 h-16" /> {/* Fixed height for header */}

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Independent scroll */}
          <div className={`flex-shrink-0 ${isSidebarExpanded ? 'w-64' : 'w-20'} bg-black transition-all`}>
            <Sidebar
              isSidebarExpanded={isSidebarExpanded}
              toggleSidebar={toggleSidebar}
            />
          </div>

          {/* Main Content - Independent scroll */}
          <main className="flex-1 relative">
            <div className="absolute inset-0 overflow-y-auto">
              <Home />
            </div>
          </main>
        </div>
      </div>

      {/* Music Player - Fixed at bottom */}
      <div className="flex-shrink-0">
        <MusicPlayer
          isPlaying={isPlaying}
          handlePlayPause={handlePlayPause}
          handleSkip={handleSkip}
          handlePrevious={handlePrevious}
        />
      </div>
    </div>
  );
};

export default HomePage;