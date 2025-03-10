import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Camera, PlayCircle, X, Play, Pause } from 'lucide-react';
import api from '../../../../api';
import { updateUserProfile } from '../../../../slices/user/userSlice';
import { handlePlaybackAction } from '../playlist/music-player-utils';
import { useNavigate } from 'react-router-dom';
import { handleSongPlayback } from './music-player-utils';
import ProfileEditModal from './ProfileEditModal';





// Main Profile Component remains the same
const Profile = () => {
  const [username, setUsername] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [publicSongs, setPublicSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [artistFollowerCount, setArtistFollowerCount] = useState(0);
  const [userFollowingCount, setUserFollowingCount] = useState(0);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { musicId, isPlaying, queue, currentPlaylistId } = useSelector((state) => state.musicPlayer);
  const isTrackPlaying = (track) => {
    return musicId === track.id && isPlaying;
  };

  const handleSongPlay = (e, song) => {
    e.stopPropagation();
    handleSongPlayback({
      song,
      sectionId: 'artist-public-songs',
      dispatch,
      currentState: { musicId, isPlaying }
    });
  };

  useEffect(() => {
    fetchUserData();
  }, []);
  const [artistId, setArtistId] = useState('')

  const fetchUserData = async () => {
    try {
      const artistStatusResponse = await api.get('/api/artists/check-artist-status/');
      setIsArtist(artistStatusResponse.data.is_artist);
      setArtistId(artistStatusResponse.data.artist_id)

      const response = await api.get('/api/users/user');
      setUsername(response.data.username);
      console.log('user',response.data)
      setProfilePhoto(response.data.profile_photo);

      const playlistsResponse = await api.get('/api/playlist/public_playlist_data/');
      setPlaylists(playlistsResponse.data);

      if (artistStatusResponse.data.is_artist) {
        const songsResponse = await api.get('/api/music/public-songs/');
        setPublicSongs(songsResponse.data);
        console.log(songsResponse.data)
      }
      // const artistResponse = await api.get(`/api/artists/${artistId}/followers-count/`);
      // setArtistFollowerCount(artistResponse.data.followers_count);

      const followingResponse = await api.get('/api/artists/me/following-count/');
      setUserFollowingCount(followingResponse.data.following_count);

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setLoading(false);
    }
  };


  useEffect(() => {
    if (artistId) {  // Only fetch artist follower count if artistId is set
      const fetchArtistFollowerCount = async () => {
        try {
          const artistResponse = await api.get(`/api/artists/${artistId}/followers-count/`);
          setArtistFollowerCount(artistResponse.data.followers_count);
          console.log(artistResponse.data)
        } catch (error) {
          console.error('Error fetching artist follower count:', error);
        }
      };
  
      fetchArtistFollowerCount();
    }
  }, [artistId]);  
  
  useEffect(() => {
    fetchUserData();
  }, []); 

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
          currentPlaylistId
        }
      });
    } catch (error) {
      console.error('Error handling playback:', error);
    }
  };

  const handlePlaylistNavigate = (playlistId) => {
    navigate(`/playlist/${playlistId}`);
  };

  const handleSaveProfile = async (newUsername, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('username', newUsername);

      if (imageFile) {
        formData.append('profile_photo', imageFile);
      }

      const response = await api.patch('/api/users/update/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUsername(response.data.username);
      if (response.data.profile_photo) {
        setProfilePhoto(response.data.profile_photo);
      }
      dispatch(updateUserProfile(response.data));
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header - Made smaller */}
        <div className="flex items-center gap-4 mb-8">
          <div 
            className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-neutral-800 overflow-hidden shadow-xl relative group cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            <img
              src={profilePhoto || '/api/placeholder/144/144'}
              alt="Profile"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
              <Camera className="w-8 h-8 text-white opacity-90" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {isArtist && (
              <span className="text-xs text-green-400">Verified Artist</span>
            )}
            <h1 
              className="text-3xl md:text-4xl font-bold hover:text-green-400 transition-colors cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            >
              {username}
            </h1>
            <div className="mt-2 flex gap-3 text-xs text-gray-100">
              <span>{playlists.filter(p => p.is_public).length} Public Playlists</span>•
              {isArtist && <span>{publicSongs.length} Public Songs</span> }
              •<span>{userFollowingCount} Followers</span>•<span>{artistFollowerCount} Following</span>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Artist Songs Section - Slimmer design */}
          {isArtist && publicSongs.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Public Songs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {publicSongs.map((song) => (
                <div
                  key={song.id}
                  className="group relative flex items-center gap-3 bg-neutral-800/50 p-3 rounded-lg hover:bg-neutral-700/50 transition-all duration-300"
                >
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <img
                      src={song.cover_photo || '/api/placeholder/48/48'}
                      alt={song.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                    <button
                      onClick={(e) => handleSongPlay(e, song)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      {isTrackPlaying(song) ? (
                        <Pause className="w-6 h-6 text-white" />
                      ) : (
                        <Play className="w-6 h-6 text-white" />
                      )}
                    </button>
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="text-sm font-medium truncate">{song.name}</h3>
                    <p className="text-xs text-neutral-400">
                      {new Date(song.release_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

          {/* Playlists Section - Compact grid */}
          <section>
            <h2 className="text-xl font-bold mb-4">Public Playlists</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {playlists
                .filter((p) => p.is_public)
                .map((playlist) => (
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
                        {currentPlaylistId === playlist.id && isPlaying ? (
                          <Pause className="w-5 h-5 text-black" />
                        ) : (
                          <PlayCircle className="w-5 h-5 text-black" />
                        )}
                      </button>
                    </div>
                    <div className="p-2">
                      <h3 className="text-xs font-medium truncate">{playlist.name}</h3>
                      <p className="text-xs text-neutral-400">
                        {playlist.tracks?.length || 0} songs
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>

        <ProfileEditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProfile}
          initialUsername={username}
          initialPhoto={profilePhoto}
        />
      </div>
    </div>
  );
};

export default Profile;