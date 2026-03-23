import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../api";
import Section from "./Section";

const getGreeting = () => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) return "Good morning";
  if (currentHour < 18) return "Good afternoon";
  return "Good evening";
};

// A quick and small card for the top "Recently Played" grid
const MiniCard = ({ item }) => {
  return (
    <div className="flex items-center bg-white/5 hover:bg-white/20 transition-all rounded-md overflow-hidden cursor-pointer group">
      <img
        src={item.cover_photo || item.image || item.cover || '/default-cover.png'}
        alt={item.name}
        className="w-16 h-16 object-cover shadow-[4px_0_10px_rgba(0,0,0,0.3)]"
      />
      <div className="flex-1 px-4 font-bold text-white truncate">
        {item.name}
      </div>
    </div>
  );
};

const Main_Content = () => {
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState(getGreeting());
  
  // Data pieces
  const [trendingMusic, setTrendingMusic] = useState([]);
  const [topMixes, setTopMixes] = useState([]);
  const [popularAlbums, setPopularAlbums] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    // Update greeting just in case
    setGreeting(getGreeting());

    // Fetch Home page data
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const [musicRes, playlistRes, albumRes, recentRes] = await Promise.allSettled([
          api.get("/api/v1/home/musiclist/?top10=true"),
          api.get("/api/v1/home/playlist/?top10=true"),
          api.get("/api/v1/home/albumlist/?top10=true"),
          api.get("/api/v1/listening_history/recently-played/")
        ]);

        if (musicRes.status === "fulfilled") {
           setTrendingMusic(musicRes.value.data.results || musicRes.value.data || []);
        }
        if (playlistRes.status === "fulfilled") {
           setTopMixes(playlistRes.value.data.results || playlistRes.value.data || []);
        }
        if (albumRes.status === "fulfilled") {
           setPopularAlbums(albumRes.value.data.results || albumRes.value.data || []);
        }
        if (recentRes.status === "fulfilled") {
          // Normalize recent tracks if they have 'music_id' instead of 'id'
          const rawRecent = Array.isArray(recentRes.value.data) 
            ? recentRes.value.data 
            : (recentRes.value.data?.results || []);
          const recent = rawRecent.map(track => ({
             ...track,
             id: track.music_id || track.id,
             name: track.title || track.name
          }));
          setRecentlyPlayed(recent);
        }

      } catch (error) {
        console.error("Error fetching home data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-8 text-white space-y-8 animate-pulse">
        <div className="h-10 bg-gray-800 w-1/4 rounded-md mb-8"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          {[...Array(6)].map((_, i) => (
             <div key={i} className="h-16 bg-gray-800 rounded-md"></div>
          ))}
        </div>
        <div className="h-6 bg-gray-800 w-1/5 rounded-md mb-4"></div>
        <div className="flex gap-4">
           {[...Array(5)].map((_, i) => (
             <div key={i} className="w-44 h-60 bg-gray-800 rounded-lg shrink-0"></div>
           ))}
        </div>
      </div>
    );
  }

  // Pick top 6 or top 8 for the mini-grid greeting section
  const miniGridItems = recentlyPlayed.slice(0, 6);
  // Fallback to trending music if recently played is empty
  const displayItems = miniGridItems.length > 0 ? miniGridItems : trendingMusic.slice(0, 6);

  return (
    <div className="flex-1 p-4 md:p-8 bg-gradient-to-b from-[#1e1e1e] to-black min-h-full pb-24">
      
      {/* Greeting and Mini Grid */}
      <section className="mb-10">
        <h1 className="text-3xl font-extrabold text-white mb-6 antialiased tracking-tight">
          {greeting}
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {displayItems.map((item, idx) => (
            <MiniCard key={item.id || idx} item={item} />
          ))}
        </div>
      </section>

      {/* Main Sections */}
      {recentlyPlayed.length > 0 && (
         <Section 
            title="Recently Played" 
            items={recentlyPlayed} 
            type="music"
         />
      )}
      
      <Section 
        title="Trending Now" 
        items={trendingMusic} 
        type="music"
        onShowAll={() => navigate("/musiclist")}
      />
      
      {topMixes.length > 0 && (
        <Section 
          title="Your Top Mixes" 
          items={topMixes} 
          type="playlist"
          onShowAll={() => navigate("/playlist-show-more", { state: { title: "Your Top Mixes" } })}
        />
      )}
      
      {popularAlbums.length > 0 && (
        <Section 
          title="Popular Albums" 
          items={popularAlbums} 
          type="album"
          onShowAll={() => navigate("/albums-show-more", { state: { title: "Popular Albums" } })}
        />
      )}
      
    </div>
  );
};

export default Main_Content;