import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { Camera, PlayCircle, X, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createSelector } from '@reduxjs/toolkit';
import api from '../../../../../api';
import { updateUserProfile } from '../../../../../slices/user/userSlice';
import {
  setCurrentMusic,
  setIsPlaying,
  setQueue,
  clearQueue,
} from '../../../../../slices/user/playerSlice';
import { convertToSeconds } from '../../../../../utils/formatters';
import { prepareTracksForPlayer } from '../../../../../utils/trackUtils';
import ProfileEditModal from './ProfileEditModal';
import { ARTISTS, USERS, PLAYLISTS, MUSIC } from '../../../../../constants/apiEndpoints';

// Memoized selector for player state 
const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentTrack: player.currentTrack,
    status: player.status,
    queue: player.queue,
    queueIndex: player.queueIndex,
    currentContext: player.currentContext,
  })
);

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [publicSongs, setPublicSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [artistFollowerCount, setArtistFollowerCount] = useState(0);
  const [userFollowingCount, setUserFollowingCount] = useState(0);
  const [artistId, setArtistId] = useState('');

  const { currentTrack, status, queue, queueIndex, currentContext } = useSelector(
    selectPlayerState,
    shallowEqual
  );

  const currentMusicId = currentTrack?.id;
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';

  // Memoize public songs for stable props
  const stableSongs = useMemo(() => publicSongs || [], [publicSongs]);

  const songsContext = useMemo(() => ({
    type: 'profile_songs',
    id: username
  }), [username]);

  // Memoize isCurrentTrackFromArtistSongs
  const isCurrentTrackFromArtistSongs = useMemo(() => {
    return stableSongs.some((song) => Number(song.id) === Number(currentMusicId));
  }, [stableSongs, currentMusicId]);


  const handleSongPlay = useCallback(
    (song, index) => {
      const formattedSongs = prepareTracksForPlayer(stableSongs, { username });
      const formattedSong = formattedSongs[index];

      const isSameSong = Number(currentMusicId) === Number(formattedSong.id);

      if (isSameSong) {
        dispatch(setIsPlaying(!isPlaying));
        return;
      }

      dispatch(clearQueue());
      dispatch(setQueue({
        tracks: formattedSongs,
        startIndex: index,
        context: songsContext
      }));
      dispatch(setIsPlaying(true));
    },
    [currentMusicId, currentContext, songsContext, isPlaying, stableSongs, dispatch, username]
  );

  const handlePlayClick = useCallback(
    async (e, playlist) => {
      e.stopPropagation();
      try {
        const context = { type: 'playlist', id: playlist.id };
        const isSameContext = currentContext?.type === context.type && String(currentContext?.id) === String(context.id);

        if (isSameContext) {
          dispatch(setIsPlaying(!isPlaying));
          return;
        }

        const response = await api.get(`/api/v1/playlist/playlists/${playlist.id}/`);
        const playlistData = response.data;
        const formattedTracks = prepareTracksForPlayer(playlistData.tracks);

        dispatch(clearQueue());
        dispatch(setQueue({
          tracks: formattedTracks,
          startIndex: 0,
          context: context
        }));
        dispatch(setIsPlaying(true));
      } catch (error) {
        console.error('Error handling playback:', error);
      }
    },
    [dispatch, isPlaying, currentContext]
  );

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const artistStatusResponse = await api.get(ARTISTS.CHECK_STATUS);
      setIsArtist(artistStatusResponse.data.is_artist);
      setArtistId(artistStatusResponse.data.artist_id);
      
      const response = await api.get(USERS.PROFILE);
      setUsername(response.data.username);
      setProfilePhoto(response.data.profile_photo);
      
      const playlistsResponse = await api.get(PLAYLISTS.PUBLIC_DATA);
      const pData = playlistsResponse.data;
      const playlistArr = Array.isArray(pData) ? pData : Array.isArray(pData?.results) ? pData.results : [];
      setPlaylists(playlistArr);
      
      if (artistStatusResponse.data.is_artist) {
        const songsResponse = await api.get(MUSIC.PUBLIC_SONGS);
        const sData = songsResponse.data;
        setPublicSongs(Array.isArray(sData) ? sData : sData.results || []);
      }
      
      const followingResponse = await api.get(ARTISTS.FOLLOWING_COUNT);
      setUserFollowingCount(followingResponse.data.following_count);

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setLoading(false);
    }
  };

  // Fetch artist follower count
  useEffect(() => {
    if (artistId) {
      const fetchArtistFollowerCount = async () => {
        try {
          const artistResponse = await api.get(ARTISTS.FOLLOWERS_COUNT(artistId));
          setArtistFollowerCount(artistResponse.data.followers_count);
        } catch (error) {
          console.error('Error fetching artist follower count:', error);
        }
      };
      fetchArtistFollowerCount();
    }
  }, [artistId]);

  // Initial fetch
  useEffect(() => {
    fetchUserData();
  }, []);

  // Debug player state changes
  useEffect(() => {
    console.log('Player state changed:', {
      currentMusicId,
      isPlaying,
      isCurrentTrackFromArtistSongs,
      queueLength: queue.length,
      queueIndex,
    });
  }, [currentMusicId, isPlaying, isCurrentTrackFromArtistSongs, queue, queueIndex]);

  // Handle profile save
  const handleSaveProfile = async (newUsername, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('username', newUsername);
      if (imageFile) {
        formData.append('profile_photo', imageFile);
      }
      const response = await api.patch('/api/v1/users/update/', formData, {
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

  const isTrackPlaying = useCallback((song) => {
    const isSameSong = Number(currentMusicId) === Number(song.id);
    return isSameSong && isPlaying;
  }, [currentMusicId, isPlaying]);

  const handlePlaylistNavigate = (playlistId) => {
    navigate(`/playlist/${playlistId}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-transparent">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full text-white p-4 md:p-6 bg-transparent">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-neutral-800 overflow-hidden shadow-xl relative group cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300 text-black font-bold rounded-full">
                <span className="text-4xl">
                  {username && username.length > 1
                    ? `${username[0]}${username[username.length - 1]}`
                    : username[0]}
                </span>
              </div>
            )}
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
              <span>{(Array.isArray(playlists) ? playlists : []).filter((p) => p.is_public).length} Public Playlists</span>•
              {isArtist && (
                <>
                  <span>{publicSongs.length} Public Songs</span>•
                  <span>{artistFollowerCount} Followers</span>•
                </>
              )}
              <span>{userFollowingCount} Following</span>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Artist Songs Section */}
          {isArtist && stableSongs.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Public Songs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {stableSongs.map((song, index) => (
                  <div
                    key={song.id}
                    className="group relative flex items-center gap-3 bg-neutral-800/50 p-3 rounded-lg hover:bg-neutral-700/50 transition-all duration-300"
                  >
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <img
                        src={song.cover_photo}
                        alt={song.name}
                        className="w-full h-full object-cover rounded-md"
                      />
                      <button
                        onClick={() => handleSongPlay(song, index)}
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

          {/* Playlists Section */}
          <section>
            <h2 className="text-xl font-bold mb-4">Public Playlists</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {(Array.isArray(playlists) ? playlists : [])
                .filter((p) => p.is_public)
                .map((playlist) => (
                  <div
                    key={playlist.id}
                    className="group relative bg-neutral-800/50 rounded-lg overflow-hidden hover:bg-neutral-700/50 transition-all duration-300 cursor-pointer"
                    onClick={() => handlePlaylistNavigate(playlist.id)}
                  >
                    <div className="aspect-square relative">
                      <img
                        src={playlist.cover_photo || '/api/v1/placeholder/120/120'}
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => handlePlayClick(e, playlist)}
                        className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105 hover:bg-green-400 transition-all duration-200 shadow-xl"
                      >
                        {currentContext?.type === 'playlist' && String(currentContext?.id) === String(playlist.id) && isPlaying ? (
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