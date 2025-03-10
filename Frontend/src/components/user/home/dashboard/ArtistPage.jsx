import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, Pause, Clock, ArrowLeft, Share2, Plus, PlayCircle } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import api from "../../../../api";
import {
  setMusicId,
  setIsPlaying,
  setQueue,
  clearQueue,
  setCurrentPlaylistId,
  setCurrentArtistId
} from "../../../../slices/user/musicPlayerSlice";
import {
  formatDuration,
  convertToSeconds,
  convertToHrMinFormat,
} from "../../../../utils/formatters";
import { handlePlaybackAction } from '../playlist/music-player-utils'; // Import the same utility used in Profile

const ArtistDetailPage = () => {
  const { artistId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [artist, setArtist] = useState(null);
  const [publicSongs, setPublicSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalDuration, setTotalDuration] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);

  const { musicId, isPlaying, currentPlaylistId, currentArtistId, queue } = useSelector((state) => state.musicPlayer);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // First fetch artist information
        const artistResponse = await api.get(`/api/home/artistlist/${artistId}/`);
        setArtist(artistResponse.data);
        
        // Then fetch the artist's public songs
        const songsResponse = await api.get(`/api/music/artist/${artistId}/`);
        setPublicSongs(songsResponse.data.results || songsResponse.data);
        
        // Fetch the artist's public playlists
        const playlistsResponse = await api.get(`/api/playlist/public_playlist_data/?artist_id=${artistId}`);
        setPlaylists(playlistsResponse.data.results || playlistsResponse.data);
        
        // Fetch followers for this artist
        const followersCountResponse = await api.get(`/api/artists/${artistId}/followers-count/`);
        setFollowersCount(followersCountResponse.data.followers_count);

        // Check if current user is following this artist
        try {
          const userFollowingResponse = await api.get(`/api/artists/me/following/`);
          const isFollowingArtist = userFollowingResponse.data.some(
            follow => follow.artist.id === Number(artistId)
          );
          setIsFollowing(isFollowingArtist);
        } catch (err) {
          console.error("Error checking follow status:", err);
          // If error occurs, we assume not following
          setIsFollowing(false);
        }
        
      } catch (err) {
        console.error("Error fetching artist data:", err);
        setError("Failed to load artist information.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [artistId]);
  
  // Calculate total duration when songs change
  useEffect(() => {
    if (publicSongs?.length) {
      const totalSeconds = publicSongs.reduce((acc, song) => {
        const duration = song.duration || "00:00:00";
        return acc + convertToSeconds(duration);
      }, 0);
      
      const formattedDuration = convertToHrMinFormat(totalSeconds);
      setTotalDuration(formattedDuration);
    }
  }, [publicSongs]);
  
  const prepareTrackForPlayer = (song) => ({
    id: Number(song.id),
    name: song.title || song.name, // Handle both title and name properties
    artist: artist?.username || "",
    artist_full: artist?.full_name || artist?.username || "",
    cover_photo: song.cover_photo,
    duration: song.duration,
    release_date: song.release_date
  });
  
  const isCurrentTrackFromArtist = () => {
    // Check if current artist ID matches
    return Number(currentArtistId) === Number(artistId);
  };
  
  const handlePlaySong = (song, e) => {
    if (e) e.stopPropagation();
    
    // Format all songs for player
    const formattedTracks = publicSongs.map(prepareTrackForPlayer);
    const currentTrackId = Number(song.id);
    
    // Check if this is the currently playing track
    const isCurrentTrack = Number(musicId) === currentTrackId && 
                           Number(currentArtistId) === Number(artistId);
    
    if (isCurrentTrack) {
      // Just toggle playback if it's the same track
      dispatch(setIsPlaying(!isPlaying));
      return;
    }
    
    // Set up the queue and start playing
    dispatch(clearQueue());
    dispatch(setCurrentPlaylistId(Number(artistId)));
    dispatch(setCurrentArtistId(Number(artistId)));
    dispatch(setQueue({ 
      tracks: formattedTracks, 
      playlistId: Number(artistId),
      artistId: Number(artistId)
    }));
    
    // Set the track ID and start playing
    dispatch(setMusicId(currentTrackId));
    dispatch(setIsPlaying(true));
  };
  
  const handlePlayAll = () => {
    if (publicSongs.length > 0) {
      // Check if we're already playing from this artist's songs
      if (isCurrentTrackFromArtist()) {
        // Just toggle play/pause state
        dispatch(setIsPlaying(!isPlaying));
        return;
      }
      
      const formattedTracks = publicSongs.map(prepareTrackForPlayer);
      
      // Clear existing queue and set new one with all artist songs
      dispatch(clearQueue());
      dispatch(setQueue({ 
        tracks: formattedTracks, 
        playlistId: Number(artistId),
        artistId: Number(artistId)
      }));
      
      // Start with the first track and play
      dispatch(setMusicId(formattedTracks[0].id));
      dispatch(setIsPlaying(true));
    }
  };

  const handlePlaylistNavigate = (playlistId) => {
    navigate(`/playlist/${playlistId}`);
  };

  // Updated to match the Profile page implementation
  const handlePlayClick = async (e, playlist) => {
    e.stopPropagation(); // Prevent navigation when clicking play button
    
    try {
      await handlePlaybackAction({
        playlistId: playlist.id,
        dispatch,
        currentState: {
          musicId,
          isPlaying,
          queue,
          currentPlaylistId,
          currentArtistId
        }
      });
    } catch (error) {
      console.error('Error handling playback:', error);
    }
  };
  
  const toggleFollow = async () => {
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow artist
        await api.delete(`/api/artists/${artistId}/follow/`);
        setIsFollowing(false);
        setFollowersCount(prevCount => prevCount - 1);
      } else {
        // Follow artist
        await api.post(`/api/artists/${artistId}/follow/`);
        setIsFollowing(true);
        setFollowersCount(prevCount => prevCount + 1);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      // Show error notification/toast here
    } finally {
      setFollowLoading(false);
    }
  };
  
  const getColor = (username) => {
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
    const index = username ? username.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };
  
  const goBack = () => {
    navigate(-1);
  };
  
  if (loading) return <div className="p-8 text-white">Loading artist details...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!artist) return <div className="p-8 text-white">Artist not found</div>;
  
  return (
    <div className="flex-1 bg-gradient-to-b from-gray-900 via-black to-black text-white">

      
      {/* Artist header section */}
      <div className="flex flex-col md:flex-row items-end gap-6 p-6">
        <div className="w-48 h-48 flex-shrink-0 rounded-full overflow-hidden">
          {artist.profile_photo ? (
            <img
              src={artist.profile_photo}
              alt={artist.username}
              className="w-full h-full object-cover rounded-lg shadow-2xl"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center ${getColor(artist.username)} rounded-lg shadow-2xl text-4xl font-bold text-white`}
            >
              {artist.username && artist.username.charAt(0).toUpperCase()}{artist.username && artist.username.charAt(artist.username.length - 1).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-4">
          <span className="text-sm text-green-400 font-medium tracking-wider">Verified Artist</span>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            {artist.username}
          </h1>
          {artist.bio && <p className="text-gray-300 max-w-2xl">{artist.bio}</p>}
          <div className="flex items-center gap-4 text-gray-300">
            <span className="text-sm">
              {publicSongs.length} songs • {playlists.length} public playlists • {followersCount} followers • {totalDuration}
            </span>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-4 p-6">
        <button
          className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors"
          onClick={handlePlayAll}
          disabled={publicSongs.length === 0}
        >
          {isPlaying && isCurrentTrackFromArtist() ? (
            <Pause className="h-6 w-6 text-black" />
          ) : (
            <Play className="h-6 w-6 text-black ml-1" />
          )}
        </button>
        
        <button
          className={`px-6 py-2 font-semibold rounded-full border ${
            isFollowing 
              ? "bg-white text-black border-white hover:bg-transparent hover:text-white" 
              : "text-white border-gray-400 hover:border-white"
          } transition-colors`}
          onClick={toggleFollow}
          disabled={followLoading}
        >
          {followLoading ? "Processing..." : isFollowing ? "Following" : "Follow"}
        </button>
        
        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <Share2 className="h-6 w-6" />
        </button>
      </div>
      
      {/* Songs section */}
      <div className="flex-1 p-6">
        <h2 className="text-2xl font-bold mb-4">Songs</h2>
        
        {publicSongs.length === 0 ? (
          <p className="text-gray-400">This artist has no public songs yet.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="font-normal py-3 w-12 pl-4">#</th>
                <th className="font-normal text-left py-3 pl-3">Title</th>
                <th className="font-normal text-left py-3 hidden md:table-cell pl-3">
                  Added
                </th>
                <th className="font-normal text-center py-3 w-20">
                  <Clock className="h-4 w-4 inline" />
                </th>
              </tr>
            </thead>
            <tbody>
              {publicSongs.map((song, index) => {
                const isThisTrackPlaying = Number(musicId) === Number(song.id) && 
                                          isCurrentTrackFromArtist() && isPlaying;
                
                return (
                  <tr
                    key={song.id}
                    className={`group hover:bg-white/10 transition-colors ${
                      isThisTrackPlaying ? "bg-white/20" : ""
                    }`}
                    onClick={() => handlePlaySong(song)}
                  >
                    <td className="py-3 pl-4">
                      <div className="flex items-center justify-center w-8 group">
                        <span className="group-hover:hidden">{index + 1}</span>
                        <button
                          className="hidden group-hover:flex p-1 hover:text-white text-gray-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySong(song, e);
                          }}
                        >
                          {isThisTrackPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 pl-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={song.cover_photo || "/api/placeholder/40/40"}
                          alt={song.title}
                          className="w-10 h-10 rounded-md"
                        />
                        <div>
                          <div className={isThisTrackPlaying ? "text-green-500" : "text-white"}>
                            {song.title}
                          </div>
                          <div className="text-sm text-gray-400">{artist.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pl-3 hidden md:table-cell text-gray-400">
                      {song.release_date}
                    </td>
                    <td className="py-3 text-center text-gray-400 w-20">
                      {formatDuration(song.duration)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Playlists section */}
      {playlists.length > 0 && (
        <div className="flex-1 p-6">
          <h2 className="text-2xl font-bold mb-4">Playlists</h2>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="group relative bg-neutral-800/50 rounded-lg overflow-hidden hover:bg-neutral-700/50 transition-all duration-300 cursor-pointer"
                onClick={() => handlePlaylistNavigate(playlist.id)}
              >
                <div className="aspect-square relative">
                  <img
                    src={playlist.cover_photo || '/api/placeholder/120/120'}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Play button overlay */}
                  <button
                    onClick={(e) => handlePlayClick(e, playlist)}
                    className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105 hover:bg-green-400 transition-all duration-200 shadow-xl"
                  >
                    {Number(currentPlaylistId) === Number(playlist.id) && isPlaying ? (
                      <Pause className="w-5 h-5 text-black" />
                    ) : (
                      <PlayCircle className="w-5 h-5 text-black" />
                    )}
                  </button>
                </div>
                <div className="p-2">
                  <h3 className="text-xs font-medium truncate">{playlist.name}</h3>
                  <p className="text-xs text-gray-400">
                    {playlist.tracks_count || playlist.tracks?.length || 0} songs
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      

    </div>
  );
};

export default ArtistDetailPage;