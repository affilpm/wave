// Home.js
import React, { useState, useEffect, useCallback} from "react";
import MusicSection from "./Music-section/MusicSection";
import PlaylistSection from "./Playlist-section/PlaylistSection";
import api from "../../../../api";
import AlbumSection from "./Album-section/AlbumSection";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import GenreDiscovery from "./GenreDiscovery";
import { Shuffle, PauseCircle, PlayCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RecentlyPlayedSection from "./RecentlyPlayedSection";
import ArtistSection from "./ArtistSection";


const ShufflingDashboard = ({ children }) => {
  const [sections, setSections] = useState([]);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [sectionStats, setSectionStats] = useState({});
  
  // Initialize sections and load saved stats
  useEffect(() => {
    const validSections = React.Children.toArray(children).filter(child => 
      child.props.items && child.props.items.length > 0
    );
    setSections(validSections);

    // Load saved section statistics from localStorage
    const savedStats = localStorage.getItem('sectionStats');
    if (savedStats) {
      setSectionStats(JSON.parse(savedStats));
    } else {
      // Initialize stats for each section
      const initialStats = validSections.reduce((acc, section) => ({
        ...acc,
        [section.props.title]: {
          views: 0,
          lastInteraction: Date.now(),
          weight: 1
        }
      }), {});
      setSectionStats(initialStats);
    }
  }, [children]);

  // Save stats to localStorage when they change
  useEffect(() => {
    localStorage.setItem('sectionStats', JSON.stringify(sectionStats));
  }, [sectionStats]);

  // Track section interaction
  const trackSectionInteraction = useCallback((sectionTitle) => {
    setSectionStats(prevStats => {
      const currentStats = prevStats[sectionTitle] || { views: 0, weight: 1 };
      return {
        ...prevStats,
        [sectionTitle]: {
          views: currentStats.views + 1,
          lastInteraction: Date.now(),
          weight: Math.min(currentStats.weight + 0.2, 3)
        }
      };
    });
  }, []);

  // Weighted shuffle algorithm
  const shuffleSections = useCallback(() => {
    setSections(currentSections => {
      const weightedSections = currentSections.map(section => ({
        section,
        weight: sectionStats[section.props.title]?.weight || 1,
        random: Math.random()
      }));

      weightedSections.sort((a, b) => {
        const weightDiff = b.weight - a.weight;
        return weightDiff !== 0 ? weightDiff : b.random - a.random;
      });

      return weightedSections.map(({ section }) => section);
    });
    setShuffleCount(prev => prev + 1);
  }, [sectionStats]);

  // Auto-shuffle timer - runs every 30 seconds
  useEffect(() => {
    const timer = setInterval(shuffleSections, 300000);
    return () => clearInterval(timer);
  }, [shuffleSections]);

  // Wrap each section with interaction tracking
  const wrappedSections = sections.map(section => (
    <motion.div
      key={`${section.props.title}-${shuffleCount}`}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 50,
        mass: 1
      }}
      className="mb-8"
      onViewportEnter={() => trackSectionInteraction(section.props.title)}
    >
      {section}
    </motion.div>
  ));

  return (
    <div className="flex-1 p-2 ">
      <div className="mb-6">
      </div>

      <AnimatePresence mode="popLayout">
        {wrappedSections}
      </AnimatePresence>

      <GenreDiscovery />
    </div>
  );
};

// Dashboard component update
const Dashboard = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [filter, setFilter] = useState("all");
  const [musiclistData, setMusiclistData] = useState([]);
  const [playlistData, setPlaylistData] = useState([]);
  const [AlbumlistData, setAlbumlistData] = useState([]);
  const [recentlyPlayedData, setRecentlyPlayedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const username = useSelector((state) => state.user.username);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const page=1
        const limit = 10
        const [musiclistResponse, playlistResponse, albumlistResponse, recentlyPlayedResponse] = await Promise.all([
          api.get(`/api/home/musiclist/?top10=true`),
          api.get("/api/home/playlist/?top10=true"),
          api.get("/api/home/albumlist/?top10=true"),
          api.get("/api/listening_history/recently-played/")
        ]);

        setMusiclistData(musiclistResponse.data.results);
        setPlaylistData(playlistResponse.data.results);
        setAlbumlistData(albumlistResponse.data.results);
        setRecentlyPlayedData(recentlyPlayedResponse.data);

      } catch (err) {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePlaylistClick = (playlistId) => {
    const playlist = playlistData.find((item) => item.id === playlistId);
    if (playlist && playlist.created_by === username) {
      navigate(`/playlist/${playlistId}`);
    } else {
      navigate(`/saved-playlist/${playlistId}`);
    }
  };

  const handleAlbumClick = (albumId) => {
    navigate(`/album/${albumId}`);
  };

  const filteredItems = (items) =>
    filter === "all" ? items : items.filter((item) => item.type === filter);
  console.log(filteredItems(musiclistData));
  if (error) return <div className="text-white">{error}</div>;

  return (
    <ShufflingDashboard>
      {recentlyPlayedData.length > 0 && (
        <RecentlyPlayedSection
          title="Recently Played"
          items={recentlyPlayedData}
        />
      )}
      {filteredItems(musiclistData).length > 0 && (
  <ArtistSection
    title="Artists"
    items={filteredItems(musiclistData)}
  />
)}
      {filteredItems(musiclistData).length > 0 && (
        <MusicSection
          title="Music"
          items={filteredItems(musiclistData)}
        />
      )}
      {filteredItems(playlistData).length > 0 && (
        <PlaylistSection
          title="Playlists"
          items={playlistData}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          onPlaylistClick={handlePlaylistClick}
        />
      )}
      {filteredItems(AlbumlistData).length > 0 && (
        <AlbumSection
          title="Album"
          items={filteredItems(AlbumlistData)}
          onAlbumClick={handleAlbumClick}
        />
      )}
    </ShufflingDashboard>
  );
};

export default Dashboard;