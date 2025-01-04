import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';  // Import navigate hook
import Sidebar from '../../components/user/Sidebar';
import Header from '../../components/user/Header';
import MusicPlayer from '../../components/user/MusicPlayer';  // Import the MusicPlayer component

const HomePage = () => {
  const navigate = useNavigate();  // Initialize navigate
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [firstName, setFirstName] = useState('');

  // Sample data for artists and playlists
  const allArtists = [
    { name: "Artist 1", image: "/api/placeholder/40/40", type: "Artist" },
    { name: "Artist 2", image: "/api/placeholder/40/40", type: "Artist" },
    { name: "Artist 3", image: "/api/placeholder/40/40", type: "Artist" },
    { name: "Artist 3", image: "/api/placeholder/40/40", type: "Artist" },
  ];

  const allPlaylists = [
    { name: "My Playlist", image: "/api/placeholder/40/40", type: "Playlist", owner: "User1" },
    { name: "Workout Playlist", image: "/api/placeholder/40/40", type: "Playlist", owner: "User2" },
    { name: "Chill Playlist", image: "/api/placeholder/40/40", type: "Playlist", owner: "User3" },
    { name: "Chill Playlist", image: "/api/placeholder/40/40", type: "Playlist", owner: "User3" },
  ];

  // Filtered search results
  const [filteredResults, setFilteredResults] = useState({
    artists: allArtists,
    playlists: allPlaylists,
  });

  // Function to filter artists and playlists based on search query
  useEffect(() => {
    const filteredArtists = allArtists.filter(artist =>
      artist.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredPlaylists = allPlaylists.filter(playlist =>
      playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredResults({
      artists: filteredArtists,
      playlists: filteredPlaylists,
    });
  }, [searchQuery]);



  // Check if the user is authenticated
  useEffect(() => {
    const access_token = localStorage.getItem('access_token');  // Check if auth token exists
    if (!access_token) {
      navigate('/login');  // If not authenticated, navigate to the login page
    }
  }, [navigate]);

  const toggleSidebar = () => setSidebarExpanded(!isSidebarExpanded);

  // Music control functions
  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleSkip = () => console.log("Skip to next song");
  const handlePrevious = () => console.log("Go to previous song");

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Header
        // searchQuery={searchQuery}
        // setSearchQuery={setSearchQuery}
        // searchFocused={searchFocused}
        // setSearchFocused={setSearchFocused}
        // showProfileMenu={showProfileMenu}
        // setShowProfileMenu={setShowProfileMenu}
        // firstName={firstName}
      />
      <div className="flex flex-1">
        <Sidebar isSidebarExpanded={isSidebarExpanded} toggleSidebar={toggleSidebar} />
        <div className="flex-1 p-8 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-8">Welcome to your library</h2>

          {/* Featured Artists */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Featured Artists</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredResults.artists.length > 0 ? (
                filteredResults.artists.map((artist, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-full h-40 object-cover rounded-md mb-4"
                    />
                    <h4 className="text-lg font-semibold truncate">{artist.name}</h4>
                    <p className="text-sm text-gray-300">{artist.type}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">No artists found.</p>
              )}
            </div>
          </div>

          {/* Featured Playlists */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Featured Playlists</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredResults.playlists.length > 0 ? (
                filteredResults.playlists.map((playlist, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-green-500 to-teal-600 p-4 rounded-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    <img
                      src={playlist.image}
                      alt={playlist.name}
                      className="w-full h-40 object-cover rounded-md mb-4"
                    />
                    <h4 className="text-lg font-semibold truncate">{playlist.name}</h4>
                    <p className="text-sm text-gray-300">Owner: {playlist.owner}</p>
                    <p className="text-sm text-gray-300">{playlist.type}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">No playlists found.</p>
              )}
            </div>
          </div>
        </div>
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