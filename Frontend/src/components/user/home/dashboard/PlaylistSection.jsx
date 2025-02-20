import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import PlaylistSectionMenuModal from "./PlaylistSectionMenuModal";
import { 
  setMusicId,
  setIsPlaying,
  setQueue,
  setCurrentPlaylistId,
} from "../../../../slices/user/musicPlayerSlice";
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import api from "../../../../api";
import { handlePlaybackAction } from "../playlist/music-player-utils";



const PlaylistSection = ({ title }) => {
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [playlistData, setPlaylistData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const username = useSelector((state) => state.user.username);
  const { 
    musicId, 
    isPlaying, 
    queue, 
    currentPlaylistId 
  } = useSelector((state) => state.musicPlayer);

  // Fetch playlist data
  useEffect(() => {
    const fetchPlaylistData = async () => {
      try {
        const playlistResponse = await api.get("/api/home/playlist/");
        console.log(playlistResponse.data)
        setPlaylistData(playlistResponse.data);
      } catch (err) {
        setError("Failed to load playlists");
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylistData();
  }, []);

  const handlePlaylistClick = (playlistId) => {
    const playlist = playlistData.find((item) => item.id === playlistId);
    if (playlist && playlist.created_by === username) {
      navigate(`/playlist/${playlistId}`);
    } else {
      navigate(`/saved-playlist/${playlistId}`);
    }
  };

  const handlePlayClick = async (e, item) => {
    e.stopPropagation();
      
    await handlePlaybackAction({
      playlistId: item.id, // Only pass playlist ID here
      dispatch,
      currentState: { 
        musicId, 
        isPlaying, 
        queue, 
        currentPlaylistId 
      }
    });
  };
  
  const handlePlaylistAddSuccess = (playlistId) => {
    console.log("Playlist added to library successfully:", playlistId);
  };

  const handleScroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) return <div className="text-white">Loading playlists...</div>;
  if (error) return <div className="text-white">{error}</div>;
  if (!playlistData.length) return null;

  return (
    <section className="mb-8 relative">
      <div className="flex justify-between items-center mb-4 px-4">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>

      <div 
        className="relative"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {showControls && (
          <>
            <button
              onClick={() => handleScroll('left')}
              className="absolute left-0 top-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transform -translate-y-1/2 transition-transform hover:scale-110"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button
              onClick={() => handleScroll('right')}
              className="absolute right-0 top-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transform -translate-y-1/2 transition-transform hover:scale-110"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex gap-4 px-4">
            {playlistData.map((item) => (
              <div
                key={item.id}
                className="flex-none w-40"
                onClick={() => handlePlaylistClick(item.id)}
              >
                <div className="relative group">
                  <img
                    src={item.cover_photo}
                    alt={item.name}
                    className="w-25 h-25 object-cover rounded-md shadow-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-md">
                    <button
                      className="absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center hidden group-hover:flex shadow-xl hover:scale-105 transition-all"
                      onClick={(e) => handlePlayClick(e, item)}
                    >
                      {currentPlaylistId === item.id && isPlaying ? (
                        <Pause className="w-6 h-6 text-black" />
                      ) : (
                        <Play className="w-6 h-6 text-black" />
                      )}
                    </button>
                  </div>
                  <div className="absolute top-2 right-2">
                    <PlaylistSectionMenuModal
                      playlist={{
                        id: item.id,
                        name: item.name,
                      }}
                      onSuccess={() => handlePlaylistAddSuccess(item.id)}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="font-bold text-white truncate">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-400 truncate">{item.description}</p>
                  )}
                  {item.created_by && (
                    <p className="text-sm text-gray-400 truncate">By {item.created_by}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlaylistSection;