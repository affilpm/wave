import React, { useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentTrack, setIsPlaying, setQueue } from "../../../../slices/user/playerSlice";
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation
import api from "../../../../api";

const MusicSection = ({ title }) => {
  const dispatch = useDispatch();
  const currentTrack = useSelector((state) => state.player.currentTrack);
  const isPlaying = useSelector((state) => state.player.isPlaying);

  const [musiclistData, setMusiclistData] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Initialize useNavigate

  // Fetch music data inside useEffect
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const musiclistResponse = await api.get("/api/home/musiclist/?top10=true");
        setMusiclistData(musiclistResponse.data); // Set the fetched music data
      } catch (error) {
        console.error("Error fetching music data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array ensures it runs only once when the component mounts

  const handlePlay = (item, index) => {
    if (currentTrack?.id === item.id) {
      // If clicking the currently playing track, toggle play/pause
      dispatch(setIsPlaying(!isPlaying));
    } else {
      // If clicking a new track, start playing it
      dispatch(setCurrentTrack(item));
      dispatch(setQueue(musiclistData));
      dispatch(setIsPlaying(true));
    }
  };

  const isItemPlaying = (item) => {
    return currentTrack?.id === item.id && isPlaying;
  };

  const handleShowMore = () => {
    // Navigate to the ShowMorePage with just the title
    navigate("/music-show-more", { state: { title } }); // Only pass title, fetch all data in ShowMorePage
  };

  if (loading) {
    return <div>Loading...</div>; // Show loading state while data is being fetched
  }

  return (
    
    <section className="mb-8 relative">
      <h2 className="text-2xl p-2 font-bold mb-4">{title}</h2>
      <div className="overflow-x-auto scrollbar-hidden">
        <div className="flex gap-6">
          {musiclistData.map((item, index) => (
            <div
              key={index}
              className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/60 transition-all cursor-pointer group flex-none w-40"
            >
              <div className="relative">
                <img
                  src={item.cover_photo}
                  alt={item.name}
                  className="w-full aspect-square object-cover rounded-md shadow-lg mb-4"
                />
                <button
                  className={`absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center ${
                    isItemPlaying(item) ? 'flex' : 'hidden group-hover:flex'
                  } shadow-xl hover:scale-105 transition-all`}
                  onClick={() => handlePlay(item, index)}
                >
                  {isItemPlaying(item) ? (
                    <Pause className="w-6 h-6 text-black" />
                  ) : (
                    <Play className="w-6 h-6 text-black" />
                  )}
                </button>
              </div>
              <h3 className="font-bold mb-1">{item.name}</h3>
              {item.owner && <p className="text-sm text-gray-400">{item.owner}</p>}
              {item.description && <p className="text-sm text-gray-400">{item.description}</p>}
              {item.artist && <p className="text-sm text-gray-400">{item.artist}</p>}
            </div>
          ))}
        </div>
      </div>
        <div className="absolute top-4 right-4">
          <button
            onClick={handleShowMore}
            className="px-4 py-2  text-white rounded-lg transition-all"
          >
            Show all
          </button>
        </div>
    </section>
  );
};

export default MusicSection;