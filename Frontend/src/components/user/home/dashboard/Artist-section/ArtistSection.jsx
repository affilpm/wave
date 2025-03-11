import React, { useRef, useState } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import {
    setMusicId,
    setIsPlaying,
    setQueue,
    clearQueue,
    setCurrentPlaylistId,
    setCurrentArtistId
  } from "../../../../../slices/user/musicPlayerSlice";
import api from "../../../../../api";


const ArtistSection = ({ title, items }) => {
  const scrollContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  console.log(items);
  const { 
    musicId, 
    isPlaying, 
    currentPlaylistId,
    currentArtistId
  } = useSelector((state) => state.musicPlayer);

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

  const handlePlayArtist = async (artist, e) => {
    e.stopPropagation();
    
    try {
      // Check if this artist is already playing
      if (isArtistPlaying(artist)) {
        // If already playing, just toggle play/pause
        dispatch(setIsPlaying(!isPlaying));
        return;
      }
      
      // Fetch the artist's songs from the API
      const songsResponse = await api.get(`/api/music/artist/${artist.id}/`);
      const songs = songsResponse.data.results || songsResponse.data;
      
      if (songs && songs.length > 0) {
        // Format the tracks properly before adding to queue
        const formattedTracks = songs.map(song => ({
          id: Number(song.id),
          name: song.title || song.name,
          artist: artist.username || "",
          artist_full: artist.full_name || artist.username || "",
          cover_photo: song.cover_photo,
          duration: song.duration,
          release_date: song.release_date
        }));
        
        // Set the queue with the formatted songs
        dispatch(setQueue({ 
          tracks: formattedTracks, 
          playlistId: `artist_${artist.id}`,
          artistId: artist.id
        }));
        
        // Set the first song to play
        dispatch(setMusicId(formattedTracks[0].id));
        
        // Start playing
        dispatch(setIsPlaying(true));
      } else {
        console.log('No songs found for this artist');
      }
    } catch (error) {
      console.error('Error fetching artist songs:', error);
    }
  };
  
  const isArtistPlaying = (artist) => {
    return (currentArtistId === artist.id || currentPlaylistId === `artist_${artist.id}`) && isPlaying;
  };
  
  const handleArtistClick = (artistId) => {
    navigate(`/artist/${artistId}`);
  };

  const handleShowMore = () => {
    navigate("/artists-show-more", { state: { title } });
  };
  
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  
  const getColor = (username) => {
    // Generate a consistent color index based on the username
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };
  
  return (
    <section className="mb-8 relative">
      <div className="flex justify-between items-center mb-4 px-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <button
          onClick={handleShowMore}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Show all
        </button>
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
            {items.map((artist, index) => (
              <div
                key={index}
                className="flex-none w-40"
                onClick={() => handleArtistClick(artist.id)}
              >
                <div className="relative group">
                  <div className="w-40 h-40 rounded-full overflow-hidden">
                  {artist.profile_photo ? (
                    <img
                        src={artist.profile_photo}
                        alt={artist.name}
                        className="w-full h-full object-cover transform transition-transform group-hover:scale-105"
                    />
                    ) : (
                        <div
                        className={`w-full h-full flex items-center justify-center ${getColor(artist.username)} text-xl font-bold text-white transform transition-transform group-hover:scale-105`}
                        >
                        {artist.username.charAt(0).toUpperCase()}{artist.username.charAt(artist.username.length - 1).toUpperCase()}
                        </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-full">
                    <button
                      className={`absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full items-center justify-center ${
                        isArtistPlaying(artist) ? 'flex' : 'hidden group-hover:flex'
                      } shadow-xl hover:scale-105 transition-all`}
                      onClick={(e) => handlePlayArtist(artist, e)}
                    >
                      {isArtistPlaying(artist) ? (
                        <Pause className="w-6 h-6 text-black" />
                      ) : (
                        <Play className="w-6 h-6 text-black" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <h3 className="font-bold text-white truncate">{artist.username}</h3>
                  <p className="text-sm text-gray-400 truncate">Artist</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtistSection;