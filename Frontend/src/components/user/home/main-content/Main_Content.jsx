// Dashboard.js - Updated to properly handle the LiveStreamSection
import React, { useState, useEffect, useCallback, useMemo } from "react";
import MusicSection from "./Music-section/MusicSection";
import PlaylistSection from "./Playlist-section/PlaylistSection";
import api from "../../../../api";
import AlbumSection from "./Album-section/AlbumSection";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import GenreDiscovery from "./Genre-section/GenreDiscovery";
import { Shuffle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RecentlyPlayedSection from "./RecentlyPlayedSection";
import ArtistSection from "./Artist-section/ArtistSection";
import LiveStreamSection from "../../../livestream/LiveStreamViewerApp";
import LivestreamViewerApp from "../../../livestream/LiveStreamViewerApp";

const ShufflingDashboard = ({ children }) => {
  const [sections, setSections] = useState([]);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [sectionStats, setSectionStats] = useState({});
  
  // Initialize sections and load saved stats
  useEffect(() => {
    const validSections = React.Children.toArray(children).filter(child => 
      child && child.props && child.props.items && child.props.items.length > 0
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

  // Auto-shuffle timer - runs every 5 minutes
  useEffect(() => {
    const timer = setInterval(shuffleSections, 300000);
    return () => clearInterval(timer);
  }, [shuffleSections]);

  // Wrap each section with interaction tracking
  const wrappedSections = useMemo(() => {
    return sections.map(section => (
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
  }, [sections, shuffleCount, trackSectionInteraction]);

  return (
    <div className="flex-1 p-2">
      <AnimatePresence mode="popLayout">
        {wrappedSections}
      </AnimatePresence>

      <GenreDiscovery />
    </div>
  );
};

// Dashboard component update
const Main_Content = () => {
  const [musiclistData, setMusiclistData] = useState([]);
  const [playlistData, setPlaylistData] = useState([]);
  const [AlbumlistData, setAlbumlistData] = useState([]);
  const [recentlyPlayedData, setRecentlyPlayedData] = useState([]);
  const [artistlist, setArtistlist] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const username = useSelector((state) => state.user.username);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [
          musiclistResponse, 
          playlistResponse, 
          albumlistResponse, 
          recentlyPlayedResponse, 
          artistlistResponse,
        ] = await Promise.all([
          api.get(`/api/home/musiclist/?top10=true`),
          api.get("/api/home/playlist/?top10=true"),
          api.get("/api/home/albumlist/?top10=true"),
          api.get("/api/listening_history/recently-played/"),
          api.get("/api/home/artistlist/"),
        ]);
        
        
        setMusiclistData(musiclistResponse.data.results || []);
        setPlaylistData(playlistResponse.data.results || []);
        setAlbumlistData(albumlistResponse.data.results || []);
        setRecentlyPlayedData(recentlyPlayedResponse.data || []);
        setArtistlist(artistlistResponse.data || []);
      } catch (err) {
        setError("Failed to load data.");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    

  }, []);
  
  if (error) return <div className="text-white">{error}</div>;

  return (
    <ShufflingDashboard>

     
      {recentlyPlayedData.length > 0 && (
        <RecentlyPlayedSection
          title="Recently Played"
          items={recentlyPlayedData}
        />
      )}
      {artistlist.length > 0 && (
        <ArtistSection
          title="Artists"
          items={artistlist}
        />
      )}
      {musiclistData.length > 0 && (
        <MusicSection
          title="Music"
          items={musiclistData}
        />
      )}
      {playlistData.length > 0 && (
        <PlaylistSection
          title="Playlists"
          items={playlistData}
        />
      )}
      {AlbumlistData.length > 0 && (
        <AlbumSection
          title="Album"
          items={AlbumlistData}
        />
      )}


    </ShufflingDashboard>
  );
};

export default Main_Content;