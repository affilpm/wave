// Home.js
import React, { useState, useEffect } from "react";
import MusicSection from "./MusicSection";
import PlaylistSection from "./PlaylistSection";
import api from "../../../../api";
import AlbumSection from "./AlbumSection";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";



const Dashboard = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [filter, setFilter] = useState("all");
  const [musiclistData, setMusiclistData] = useState([]);
  const [playlistData, setPlaylistData] = useState([]);
  const [AlbumlistData, setAlbumlistData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const userEmail = useSelector((state) => state.user.email);

  useEffect(() => {
    // Fetch music data and playlists from the backend
    const fetchData = async () => {
      try {
        setLoading(true);
        const musiclistResponse = await api.get("/api/home/musiclist/");
        setMusiclistData(musiclistResponse.data);

        const playlistResponse = await api.get("/api/home/playlist/");
        setPlaylistData(playlistResponse.data);
        

        const AlbumlistResponse = await api.get("/api/home/albumlist/");
        setAlbumlistData(AlbumlistResponse.data);

        console.log('e',playlistResponse.data);
        console.log('fddf',AlbumlistResponse.data);

      } catch (err) {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
//  const playlistId = playlistData

  const handlePlaylistClick = (playlistId) => {
    const playlist = playlistData.find((item) => item.id === playlistId);
    if (playlist && playlist.created_by === userEmail) {
      navigate(`/playlist/${playlistId}`);
    } else {
      alert("You don't have access to this playlist.");
    }
  };
  
  const handleFilterChange = (type) => {
    setFilter(type);
  };

  const filteredItems = (items) =>
    filter === "all" ? items : items.filter((item) => item.type === filter);

  return (
    <div className="flex-1 p-2 overflow-y-auto bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Filter Section
      <div className="mb-6 flex gap-4">
        {["all", "musicData", "album", "mix", "playlist"].map((type) => (
          <button
            key={type}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              filter === type ? "bg-green-500 text-black" : "bg-gray-800 text-white"
            } hover:bg-green-400 hover:text-black transition-all`}
            onClick={() => handleFilterChange(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div> */}

      {/* Sections */}
      {filteredItems(musiclistData).length > 0 && (
        <MusicSection
          title="Music"
          items={filteredItems(musiclistData)}

        />
      )}
      {filteredItems(playlistData).length > 0 && (
        <PlaylistSection
          title="Playlists"
          items={filteredItems(playlistData)}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          onPlaylistClick={handlePlaylistClick}
        />
      )}
      {filteredItems(AlbumlistData).length > 0 && (
        <AlbumSection
          title="Album"
          items={filteredItems(AlbumlistData)}

        />
      )}
    </div>
  );
};

export default Dashboard;