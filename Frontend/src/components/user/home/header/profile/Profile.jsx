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
import ProfileEditModal from './ProfileEditModal';

// Memoized selector for player state 
const selectPlayerState = createSelector(
  [(state) => state.player],
  (player) => ({
    currentMusicId: player.currentMusicId,
    isPlaying: player.isPlaying,
    queue: player.queue,
    currentIndex: player.currentIndex,
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

  const { currentMusicId, isPlaying, queue, currentIndex } = useSelector(
    selectPlayerState,
    shallowEqual
  );

  // Memoize public songs for stable props
  const stableSongs = useMemo(() => publicSongs || [], [publicSongs]);

  // Check if queue is from artist's public songs
  const isQueueFromArtistSongs = useMemo(() => {
    if (!queue.length) return false;
    return queue.every(
      (track) => track.source === 'public_songs'
    );
  }, [queue]);

  // Memoize isCurrentTrackFromArtistSongs
  const isCurrentTrackFromArtistSongs = useMemo(() => {
    if (!stableSongs.length || !currentMusicId || !isQueueFromArtistSongs) {
      console.log('isCurrentTrackFromArtistSongs: Early return', {
        hasSongs: !!stableSongs.length,
        currentMusicId,
        isQueueFromArtistSongs,
        queueLength: queue.length,
        currentIndex,
      });
      return false;
    }
    const currentTrack = queue[currentIndex];
    const isTrackInSongs = stableSongs.some(
      (song) => Number(song.id) === Number(currentMusicId)
    );
    console.log('isCurrentTrackFromArtistSongs: Result', {
      currentTrackId: currentTrack?.id,
      currentMusicId,
      isTrackInSongs,
      isPlaying,
    });
    return (
      currentTrack &&
      Number(currentTrack.id) === Number(currentMusicId) &&
      isTrackInSongs
    );
  }, [stableSongs, currentMusicId, isQueueFromArtistSongs, queue, currentIndex]);

  // Memoize song preparation
  const prepareTrackForPlayer = useCallback(
    (song) => ({
      id: Number(song.id), 
      name: song.name,
      title: song.name,
      artist: song.artist_username || username,
      artist_full: song.artist_full_name || username,
      album: song.album_name || 'Single',
      cover_photo: song.cover_photo || '/api/placeholder/48/48',
      duration: convertToSeconds(song.duration || '00:00:00'),
      genre: song.genre || '',
      year: song.release_date
        ? new Date(song.release_date).getFullYear()
        : null,
      release_date: song.release_date,
      track_number: song.track_number || 0,
      source: 'public_songs',
    }),
    [username]
  );

  // Handle song playback
  const handleSongPlay = useCallback(
    (song, index) => {
      const formattedSongs = stableSongs.map(prepareTrackForPlayer);
      const formattedSong = formattedSongs[index];

      console.log('handleSongPlay:', {
        songId: song.id,
        currentMusicId,
        isQueueFromArtistSongs,
        isPlaying,
        action: Number(currentMusicId) === Number(formattedSong.id) && isQueueFromArtistSongs ? 'toggle' : 'play new',
      });

      // Check if the clicked song is already playing
      if (
        Number(currentMusicId) === Number(formattedSong.id) &&
        isQueueFromArtistSongs
      ) {
        dispatch(setIsPlaying(!isPlaying));
        return;
      }

      // If playing from a different context, clear queue and set new songs
      dispatch(clearQueue());
      dispatch(setQueue(formattedSongs));
      dispatch(setCurrentMusic(formattedSong));
      dispatch(setIsPlaying(true));
    },
    [currentMusicId, isQueueFromArtistSongs, isPlaying, stableSongs, dispatch, prepareTrackForPlayer]
  );

  // Handle playlist playback 
  const handlePlayClick = useCallback(
    async (e, playlist) => {
      e.stopPropagation();
      try {
        const response = await api.get(`/api/playlist/playlists/${playlist.id}/`);
        console.log(response.data)
        const playlistData = response.data;
        const formattedTracks = playlistData.tracks.map((track) => ({
          id: Number(track.music_details.id),
          name: track.music_details.name,
          title: track.music_details.name,
          artist: track.music_details.artist_username,
          artist_full: track.music_details.artist_full_name,
          album: track.music_details.album_name || playlistData.name || 'Unknown Album',
          cover_photo: track.music_details.cover_photo,
          duration: convertToSeconds(track.music_details.duration || '00:00:00'),
          genre: track.music_details.genre || '',
          year: track.music_details.release_date
            ? new Date(track.music_details.release_date).getFullYear()
            : null,
          release_date: track.music_details.release_date,
          track_number: track.track_number || 0,
          yourplaylist_id: Number(playlistData.id),
          yourplaylist_name: playlistData.name || 'Unknown Playlist',
        }));

        // Check if the current queue is from this playlist
        const isCurrentPlaylistPlaying =
          queue.length > 0 &&
          Number(queue[0]?.yourplaylist_id) === Number(playlist.id);

        console.log('handlePlayClick:', {
          playlistId: playlist.id,
          isCurrentPlaylistPlaying,
          isPlaying,
          queueLength: queue.length,
        });

        if (isCurrentPlaylistPlaying) {
          dispatch(setIsPlaying(!isPlaying));
          return;
        }

        dispatch(clearQueue());
        dispatch(setQueue(formattedTracks));
        if (formattedTracks.length > 0) {
          dispatch(setCurrentMusic(formattedTracks[0]));
          dispatch(setIsPlaying(true));
        }
      } catch (error) {
        console.error('Error handling playback:', error);
      }
    },
    [dispatch, isPlaying, queue]
  );

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const artistStatusResponse = await api.get('/api/artists/check-artist-status/');
      setIsArtist(artistStatusResponse.data.is_artist);
      setArtistId(artistStatusResponse.data.artist_id);

      const response = await api.get('/api/users/user');
      setUsername(response.data.username);
      setProfilePhoto(response.data.profile_photo);

      const playlistsResponse = await api.get('/api/playlist/public_playlist_data/');
      setPlaylists(playlistsResponse.data);

      if (artistStatusResponse.data.is_artist) {
        const songsResponse = await api.get('/api/music/public-songs/');
        setPublicSongs(songsResponse.data);
      }

      const followingResponse = await api.get('/api/artists/me/following-count/');
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
          const artistResponse = await api.get(`/api/artists/${artistId}/followers-count/`);
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
      isQueueFromArtistSongs,
      queueLength: queue.length,
      currentIndex,
    });
  }, [currentMusicId, isPlaying, isQueueFromArtistSongs, queue, currentIndex]);

  // Handle profile save
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

  // Check if track is playing
  const isTrackPlaying = (song) => {
    const isPlayingThisSong =
      Number(currentMusicId) === Number(song.id) &&
      isCurrentTrackFromArtistSongs &&
      isPlaying; // Ensure isPlaying is checked
    console.log('isTrackPlaying:', {
      songId: song.id,
      currentMusicId,
      isCurrentTrackFromArtistSongs,
      isPlaying,
      isPlayingThisSong,
    });
    return isPlayingThisSong;
  };

  const handlePlaylistNavigate = (playlistId) => {
    navigate(`/playlist/${playlistId}`);
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
              <span>{playlists.filter((p) => p.is_public).length} Public Playlists</span>•
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
                      <button
                        onClick={(e) => handlePlayClick(e, playlist)}
                        className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105 hover:bg-green-400 transition-all duration-200 shadow-xl"
                      >
                        {queue.length > 0 && Number(queue[0]?.yourplaylist_id) === Number(playlist.id) && isPlaying ? (
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