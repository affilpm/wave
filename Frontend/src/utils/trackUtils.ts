import { Track } from '../types/player';

/**
 * Standardizes track objects from various API response formats into a common Track type.
 */
export const prepareTrackForPlayer = (track: any, artist?: any, userId?: string | number): Track => {
  // Handle nested music_details if present (common in playlist responses)
  const baseTrack = track.music_details || track;
  
  // Extract artist name
  const artistName = baseTrack.artist_username || 
                    baseTrack.artist?.user?.username || 
                    baseTrack.artist?.username || 
                    baseTrack.artist || 
                    artist?.username || 
                    'Unknown Artist';

  const artistFullName = baseTrack.artist_full_name || 
                        baseTrack.artist?.full_name || 
                        baseTrack.artist_full || 
                        artist?.full_name || 
                        artist?.username || 
                        artistName;

  const artistId = baseTrack.artist?.id || 
                  baseTrack.artist_id || 
                  artist?.id || 
                  null;

  // Handle duration - could be string 'HH:MM:SS' or number (seconds)
  let durationSeconds = 0;
  if (typeof baseTrack.duration === 'string') {
    const parts = baseTrack.duration.split(':').reverse();
    durationSeconds = parts.reduce((acc: number, part: string, i: number) => acc + parseInt(part) * Math.pow(60, i), 0);
  } else {
    durationSeconds = Number(baseTrack.duration) || 0;
  }

  return {
    id: Number(baseTrack.id),
    name: baseTrack.name || baseTrack.title || 'Unknown Track',
    title: baseTrack.name || baseTrack.title || 'Unknown Track',
    artist: artistName,
    artist_full: artistFullName,
    artist_id: artistId ? Number(artistId) : null,
    album: baseTrack.album_name || baseTrack.album || 'Single',
    album_id: baseTrack.album_id ? Number(baseTrack.album_id) : null,
    cover_photo: baseTrack.cover_photo || baseTrack.artworkUrl || '/api/v1/placeholder/48/48',
    artworkUrl: baseTrack.artworkUrl || baseTrack.cover_photo || '/api/v1/placeholder/48/48',
    audio_file: baseTrack.audio_file,
    duration: durationSeconds,
    genre: baseTrack.genre || '',
    year: baseTrack.release_date ? new Date(baseTrack.release_date).getFullYear() : null,
    release_date: baseTrack.release_date || null,
    track_number: baseTrack.track_number || 0,
    added_by_user: userId || baseTrack.added_by_user || null,
    added_at: baseTrack.added_at || new Date().toISOString(),
  };
};

/**
 * Normalizes a list of tracks.
 */
export const prepareTracksForPlayer = (tracks: any[], artist?: any, userId?: string | number): Track[] => {
  return tracks.map(track => prepareTrackForPlayer(track, artist, userId));
};
