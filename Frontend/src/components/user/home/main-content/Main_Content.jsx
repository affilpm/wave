import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api from "../../../../api";
import Section from "./Section";
import JumpBackInSection from "./JumpBackInSection";
import { Play, Pause } from "lucide-react";
import { fetchRecentlyPlayed, fetchJumpBackIn } from "../../../../slices/user/listeningHistorySlice";
import { setIsPlaying, setQueue } from "../../../../slices/user/playerSlice";
import { prepareTracksForPlayer } from "../../../../utils/trackUtils";
import AvatarFallback from "../../../common/AvatarFallback";

const getGreeting = () => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) return "Good morning";
  if (currentHour < 18) return "Good afternoon";
  return "Good evening";
};

// A quick and small card for the top "Recently Played" grid
const MiniCard = ({ item }) => {
  const dispatch = useDispatch();
  const { currentTrack, status } = useSelector((state) => state.player);
  
  // For listening history items, extract track info
  const track = item?.track || item;
  const name = track?.name || 'Unknown';
  const cover = track?.cover_photo || item?.album?.cover_photo || item?.cover_photo || item?.image;
  
  const isPlaying = status === 'playing' && String(currentTrack?.id) === String(track?.id);

  const handlePlay = (e) => {
    e.stopPropagation();
    
    // Toggle play/pause if this is already the current track
    const isSameTrack = String(currentTrack?.id) === String(track?.id);
    if (isSameTrack) {
      dispatch(setIsPlaying(!isPlaying));
      return;
    }
    
    // Normalize track for player
    const playlistTrack = {
      ...track,
      artist: track.artist?.username || track.artist_username || 'Unknown Artist',
    };
    
    const formattedTracks = prepareTracksForPlayer([playlistTrack]);
    dispatch(setQueue({
      tracks: formattedTracks,
      startIndex: 0,
      context: { type: 'mini-card', id: track.id }
    }));
    dispatch(setIsPlaying(true));
  };

  return (
    <div 
      className="flex items-center bg-white/5 hover:bg-white/10 transition-all rounded-md overflow-hidden cursor-pointer group relative"
      onClick={handlePlay}
    >
      <div className="relative w-16 h-16 shrink-0 shadow-[4px_0_10px_rgba(0,0,0,0.3)]">
        {cover && !cover.toString().includes('default-cover.png') ? (
          <img
            src={cover}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <AvatarFallback 
          name={name}
          className="w-full h-full"
          style={{ display: (cover && !cover.toString().includes('default-cover.png')) ? 'none' : 'flex' }}
        />
        <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
           {isPlaying ? <Pause className="h-6 w-6 text-white fill-white" /> : <Play className="h-6 w-6 text-white fill-white" />}
        </div>
      </div>
      <div className="flex-1 px-4 font-bold text-white truncate text-sm">
        {name}
      </div>
    </div>
  );
};

const Main_Content = () => {
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState(getGreeting());
  
  // Data pieces (local state for non-history data)
  const [trendingMusic, setTrendingMusic] = useState([]);
  const [topMixes, setTopMixes] = useState([]);
  const [popularAlbums, setPopularAlbums] = useState([]);
  const [discoveryArtists, setDiscoveryArtists] = useState([]);

  // Redux state for listening history
  const dispatch = useDispatch();
  const { recentlyPlayed, jumpBackIn } = useSelector((state) => state.listeningHistory);

  const navigate = useNavigate();

  useEffect(() => {
    setGreeting(getGreeting());

    // Fetch Home page data
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        // Fire Redux thunks for listening history
        dispatch(fetchRecentlyPlayed());
        dispatch(fetchJumpBackIn());

        const [musicRes, playlistRes, albumRes, artistRes] = await Promise.allSettled([
          api.get("/api/v1/home/musiclist/?top10=true"),
          api.get("/api/v1/home/playlist/?top10=true"),
          api.get("/api/v1/home/albumlist/?top10=true"),
          api.get("/api/v1/home/artistlist/"),
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
        if (artistRes.status === "fulfilled") {
          setDiscoveryArtists(artistRes.value.data.results || artistRes.value.data || []);
        }

      } catch (error) {
        console.error("Error fetching home data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [dispatch]);

  // Only show the big loader if we have absolutely no data yet
  const hasNoData = !trendingMusic.length && !recentlyPlayed.length;
  
  if (loading && hasNoData) {
    return (
      <div className="flex-1 p-8 text-white space-y-8 animate-pulse">
        <div className="h-10 bg-gray-800 w-1/4 rounded-md mb-8"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {[...Array(6)].map((_, i) => (
             <div key={i} className="h-16 bg-gray-800 rounded-md"></div>
          ))}
        </div>
        <div className="h-6 bg-gray-800 w-1/5 rounded-md mb-4"></div>
        <div className="flex gap-4 overflow-hidden">
           {[...Array(5)].map((_, i) => (
             <div key={i} className="w-44 h-60 bg-gray-800 rounded-lg shrink-0"></div>
           ))}
        </div>
      </div>
    );
  }

  // Pick top 6 for the mini-grid greeting section from recently played
  const miniGridItems = recentlyPlayed.slice(0, 6);
  // Fallback to trending music if recently played is empty
  const displayItems = miniGridItems.length > 0 ? miniGridItems : trendingMusic.slice(0, 6);

  // Normalize recently played tracks for the Section component
  // IMPORTANT: artist from API is a nested object — extract the name string
  const recentTracks = recentlyPlayed.map(entry => {
    const artistName = entry.artist?.first_name
      ? `${entry.artist.first_name} ${entry.artist.last_name || ''}`.trim()
      : entry.artist?.username || 'Unknown Artist';

    return {
      ...entry.track,
      id: entry.track?.id || entry.id,
      name: entry.track?.name || entry.name,
      cover_photo: entry.track?.cover_photo || entry.album?.cover_photo || entry.cover_photo,
      artist: artistName,
      artist_id: entry.artist?.id || null,
      duration: entry.track?.duration,
      audio_file: entry.track?.audio_file,
    };
  });

  return (
    <div className="flex-1 p-4 md:p-8 pt-10 sm:pt-10">
      
      {/* Greeting and Mini Grid */}
      <section className="mb-10">
        <h1 className="text-3xl font-extrabold text-white mb-6 antialiased tracking-tight">
          {greeting}
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {displayItems.map((item, idx) => (
            <MiniCard key={item.track?.id || item.id || idx} item={item} />
          ))}
        </div>
      </section>

      {/* Jump Back In */}
      <JumpBackInSection
        albums={jumpBackIn.albums}
        hasSingles={jumpBackIn.hasSingles}
      />

      {/* Main Sections */}
      {recentTracks.length > 0 && (
         <Section 
            title="Recently Played" 
            items={recentTracks} 
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

      {discoveryArtists.length > 0 && (
        <Section 
          title="Discovery Artists" 
          items={discoveryArtists} 
          type="artist"
          onShowAll={() => navigate("/artists-show-more")}
        />
      )}
      
    </div>
  );
};

export default Main_Content;