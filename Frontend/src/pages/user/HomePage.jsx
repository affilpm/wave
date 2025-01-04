// HomePage.js
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

  // Check if the user is authenticated
  useEffect(() => {
    const access_token = localStorage.getItem('access_token');
    if (!access_token) {
      navigate('/login');
    }
  }, [navigate]);

  const toggleSidebar = () => setSidebarExpanded(!isSidebarExpanded);

  // Music control functions
  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleSkip = () => console.log("Skip to next song");
  const handlePrevious = () => console.log("Go to previous song");

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar isSidebarExpanded={isSidebarExpanded} toggleSidebar={toggleSidebar} />
        <Home /> 
      </div>

      {/* Music Player Footer */}
      <MusicPlayer
        isPlaying={isPlaying}
        handlePlayPause={handlePlayPause}
        handleSkip={handleSkip}
        handlePrevious={handlePrevious}
      />
    </div>
  );
};

export default HomePage;