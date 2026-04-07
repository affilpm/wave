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

// A quick and small card for the top "Mixed Shortcuts" grid
const MiniCard = ({ item, type = 'music' }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentTrack, status, currentContext } = useSelector((state) => state.player);
  
  // Extract info based on type
  const track = type === 'music' ? (item?.track || item) : null;
  const name = type === 'music' ? (track?.name || 'Unknown') : (item?.name || item?.username || 'Unknown');
  const cover = type === 'music' 
    ? (track?.cover_photo || item?.album?.cover_photo || item?.cover_photo || item?.image)
    : (item?.cover_photo || item?.image || item?.profile_photo);
  
  const isPlaying = type === 'music' 
    ? status === 'playing' && String(currentTrack?.id) === String(track?.id) && !['playlist', 'album', 'artist'].includes(currentContext?.type)
    : status === 'playing' && currentContext?.type === type && String(currentContext?.id) === String(item?.id);

  const handleCardClick = () => {
    if (type === 'album') navigate(`/album/${item.id}`);
    else if (type === 'playlist') navigate(`/playlist/${item.id}`);
    else if (type === 'artist') navigate(`/artist/${item.id}`);
    else {
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
    }
  };

  const handlePlayButton = async (e) => {
    e.stopPropagation();
    
    if (type === 'music') {
       handleCardClick(); // fallback to card click for songs
    } else if (type === 'album' || type === 'playlist') {
       // Toggle play/pause if this is already the active context
       const isActiveCollection = currentContext?.type === type && String(currentContext?.id) === String(item.id);
       if (isActiveCollection) {
         dispatch(setIsPlaying(!isPlaying));
         return;
       }

       try {
         const endpoint = type === 'album' 
           ? `/api/v1/album/album-data/${item.id}/`
           : `/api/v1/playlist/playlists/${item.id}/`;
         
         const response = await api.get(endpoint);
         const data = response.data;
         
         const rawTracks = type === 'album' 
           ? data.tracks.map((t) => t.music_details) 
           : data.tracks;
           
         const formattedTracks = prepareTracksForPlayer(rawTracks);

         if (formattedTracks.length > 0) {
           dispatch(setQueue({
             tracks: formattedTracks,
             startIndex: 0,
             context: { type, id: item.id }
           }));
           dispatch(setIsPlaying(true));
         }
       } catch (error) {
         console.error(`Error playing ${type}:`, error);
       }
    } else if (type === 'artist') {
       navigate(`/artist/${item.id}`, { state: { autoPlay: true } });
    }
  };

  return (
    <div 
      className="flex items-center bg-white/5 hover:bg-white/10 transition-all rounded-md overflow-hidden cursor-pointer group relative"
      onClick={handleCardClick}
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
           <button 
              onClick={handlePlayButton} 
              className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 hover:bg-green-400 transition-all shadow-md"
           >
             {isPlaying ? <Pause className="h-5 w-5 text-black fill-black" /> : <Play className="h-5 w-5 text-black fill-black ml-0.5" />}
           </button>
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

  // Pick a mix of top albums, playlists, and recently played tracks to create a "Shortcut Dashboard"
  // This avoids duplicating the exact "Recently Played" chronological history directly below it.
  const mixedShortcuts = [
    ...(popularAlbums.slice(0, 2).map(i => ({ ...i, __type: 'album' }))),
    ...(topMixes.slice(0, 2).map(i => ({ ...i, __type: 'playlist' }))),
    ...(recentlyPlayed.slice(0, 2).map(i => ({ ...i, __type: 'music' })))
  ];

  // Fallback to trending music if the shortcuts empty
  const displayItems = mixedShortcuts.length > 0 
    ? mixedShortcuts 
    : trendingMusic.slice(0, 6).map(i => ({ ...i, __type: 'music' }));

  // Normalize recently played tracks for the Section component
  // IMPORTANT: artist from API is a nested object — extract the name string
  const recentTracks = recentlyPlayed.map(entry => {
    const artistName = entry.artist?.username || 'Unknown Artist';

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
            <MiniCard 
              key={`${item.__type || 'music'}-${item.track?.id || item.id || idx}`} 
              item={item} 
              type={item.__type || 'music'} 
            />
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
        title="Music" 
        items={trendingMusic} 
        type="music"
        onShowAll={() => navigate("/musiclist")}
      />
      
      {topMixes.length > 0 && (
        <Section 
          title="Playlists" 
          items={topMixes} 
          type="playlist"
          onShowAll={() => navigate("/playlist-show-more", { state: { title: "Playlists" } })}
        />
      )}
      
      {popularAlbums.length > 0 && (
        <Section 
          title="Albums" 
          items={popularAlbums} 
          type="album"
          onShowAll={() => navigate("/albums-show-more", { state: { title: "Albums" } })}
        />
      )}

      {discoveryArtists.length > 0 && (
        <Section 
          title="Artists" 
          items={discoveryArtists} 
          type="artist"
          onShowAll={() => navigate("/artists-show-more")}
        />
      )}
      
    </div>
  );
};

export default Main_Content;