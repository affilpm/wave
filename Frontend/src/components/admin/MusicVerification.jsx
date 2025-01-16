import React, { useState, useEffect, useRef } from 'react';
import { Music, CheckCircle, XCircle, Play, Pause } from 'lucide-react';
import { musicVerificationService } from '../../services/admin/musicVerificationService';

// Utility to create object URLs safely
const createSecureMediaUrl = (url) => {
  // Convert external URLs to blob URLs for better security
  return new Promise((resolve, reject) => {
    fetch(url, {
      credentials: 'include' // Include cookies for authentication
    })
      .then(response => response.blob())
      .then(blob => {
        const secureUrl = URL.createObjectURL(blob);
        resolve(secureUrl);
      })
      .catch(error => {
        console.error('Error creating secure URL:', error);
        reject(error);
      });
  });
};

const LoadingSkeleton = () => (
  <div className="space-y-4" aria-label="Loading content">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const MusicVerificationCard = ({ music, onApprove, onReject, isPlaying, onPlayToggle, disabled }) => {
  const [secureAudioUrl, setSecureAudioUrl] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  useEffect(() => {
    if (music.audio_url && !secureAudioUrl) {
      setLoadingAudio(true);
      createSecureMediaUrl(music.audio_url)
        .then(url => {
          setSecureAudioUrl(url);
          setLoadingAudio(false);
        })
        .catch(() => setLoadingAudio(false));
    }
    
    // Cleanup blob URLs on unmount
    return () => {
      if (secureAudioUrl) {
        URL.revokeObjectURL(secureAudioUrl);
      }
    };
  }, [music.audio_url]);

  const statusColors = {
    pending: "bg-yellow-500/20 text-yellow-500",
    approved: "bg-green-500/20 text-green-500",
    rejected: "bg-red-500/20 text-red-500"
  };

  const handlePlayClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (secureAudioUrl) {
      onPlayToggle(music.id, secureAudioUrl);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            {music.cover_photo ? (
              <img 
                src={music.cover_photo} 
                alt={music.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
                crossOrigin="anonymous"
              />
            ) : (
              <Music className="h-6 w-6 text-gray-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {music.name || 'Untitled'}
              </h3>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[music.status?.toLowerCase() || 'pending']}`}>
                {music.status || 'Pending'}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {music.artist?.user?.email || 'Unknown Artist'} • 
              {music.duration_formatted ? ` ${music.duration_formatted} • ` : ' '}
              {music.genres?.length > 0 ? music.genres.map(g => g.name).join(', ') : 'No Genre'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {secureAudioUrl && (
              <button
                type="button"
                onClick={handlePlayClick}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={disabled || loadingAudio}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Play className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                )}
              </button>
            )}

            <div className="flex gap-2 ml-4">
              {music.status !== 'approved' && (
                <button
                  type="button"
                  onClick={() => onApprove(music.id)}
                  className="p-2 rounded-full hover:bg-green-50 dark:hover:bg-green-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={disabled}
                  aria-label="Approve"
                >
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </button>
              )}
              
              {music.status !== 'rejected' && (
                <button
                  type="button"
                  onClick={() => onReject(music.id)}
                  className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={disabled}
                  aria-label="Reject"
                >
                  <XCircle className="h-5 w-5 text-red-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MusicVerification = () => {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    loadVerifications();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const loadVerifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await musicVerificationService.getPendingVerifications();
      setVerifications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayToggle = async (musicId, secureAudioUrl) => {
    try {
      if (!secureAudioUrl) {
        setError('No audio URL available');
        return;
      }

      if (playingId === musicId && audioRef.current) {
        if (audioRef.current.paused) {
          await audioRef.current.play();
        } else {
          audioRef.current.pause();
          setPlayingId(null);
        }
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.addEventListener('ended', () => {
          setPlayingId(null);
        });
        audioRef.current.addEventListener('error', (e) => {
          setError('Failed to load audio file');
          setPlayingId(null);
        });
      }

      audioRef.current.src = secureAudioUrl;
      await audioRef.current.play();
      setPlayingId(musicId);
    } catch (err) {
      setError('Failed to play audio: ' + err.message);
      setPlayingId(null);
    }
  };

  const handleApprove = async (musicId) => {
    try {
      setActionInProgress(true);
      const updatedMusic = await musicVerificationService.approveMusic(musicId);
      setVerifications(prev =>
        prev.map(music =>
          music.id === musicId ? updatedMusic : music
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async (musicId) => {
    try {
      setActionInProgress(true);
      const updatedMusic = await musicVerificationService.rejectMusic(musicId);
      setVerifications(prev =>
        prev.map(music =>
          music.id === musicId ? updatedMusic : music
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Music Verification Requests
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex justify-between items-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setError(null)}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-500"
            >
              Dismiss
            </button>
            <button
              onClick={loadVerifications}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-500"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-12rem)] overflow-auto">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-4">
            {verifications.length > 0 ? (
              verifications.map((music) => (
                <MusicVerificationCard
                  key={music.id}
                  music={music}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isPlaying={playingId === music.id}
                  onPlayToggle={handlePlayToggle}
                  disabled={actionInProgress}
                />
              ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                  No pending music verifications
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicVerification;