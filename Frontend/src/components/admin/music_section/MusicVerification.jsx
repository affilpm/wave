import React, { useState, useEffect, useRef } from 'react';
import { Music, CheckCircle, XCircle, Play, Pause, Search, Filter, X } from 'lucide-react';
import { musicVerificationService } from '../../../services/admin/musicVerificationService';
import SearchSection from './SearchSection';


// Existing utility function
const createSecureMediaUrl = (url) => {
  return new Promise((resolve, reject) => {
    fetch(url, {
      credentials: 'include'
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

// Existing LoadingSkeleton component
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

// Existing MusicVerificationCard component
const MusicVerificationCard = ({ music, onApprove, onReject, isPlaying, onPlayToggle, disabled }) => {
  const [secureAudioUrl, setSecureAudioUrl] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [expanded, setExpanded] = useState(false);


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
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Cover Image */}
          <div className="relative w-full sm:w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
            {music.cover_photo ? (
              <img 
                src={music.cover_photo} 
                alt={music.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="h-6 w-6 text-gray-500" />
              </div>
            )}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {music.name || 'Untitled'}
              </h3>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[music.status?.toLowerCase() || 'pending']} w-fit`}>
                {music.status || 'Pending'}
              </span>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {music.artist?.user?.email || 'Unknown Artist'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {music.duration_formatted && `${music.duration_formatted} • `}
                {music.genres?.length > 0 ? music.genres.map(g => g.name).join(', ') : 'No Genre'}
              </p>
            </div>

            {/* Mobile Controls */}
            <div className="flex items-center justify-between sm:hidden pt-2">
              <div className="flex items-center gap-2">
                {secureAudioUrl && (
                  <button
                    type="button"
                    onClick={handlePlayClick}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
              </div>
              <div className="flex gap-2">
                {music.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => onApprove(music.id)}
                    className="p-2 rounded-full hover:bg-green-50 dark:hover:bg-green-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
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
                    className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    disabled={disabled}
                    aria-label="Reject"
                  >
                    <XCircle className="h-5 w-5 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Controls */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {secureAudioUrl && (
              <button
                type="button"
                onClick={handlePlayClick}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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

            <div className="flex gap-2">
              {music.status !== 'approved' && (
                <button
                  type="button"
                  onClick={() => onApprove(music.id)}
                  className="p-2 rounded-full hover:bg-green-50 dark:hover:bg-green-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
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
                  className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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
  const [containerWidth, setContainerWidth] = useState("max-w-5xl"); // New state for width control
  const [layout, setLayout] = useState('normal'); // 'normal', 'compact', or 'comfortable'
  const [searchQuery, setSearchQuery] = useState('');

  const [searchFilters, setSearchFilters] = useState({
    query: '',
    status: 'All',
    duration: '',
    dateRange: ''
  });



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


  const getLayoutClasses = () => {
    switch (layout) {
      case 'compact':
        return 'max-w-3xl space-y-2';
      case 'comfortable':
        return 'max-w-7xl space-y-6';
      default:
        return 'max-w-5xl space-y-4';
    }
  };


  const resetFilters = () => {
    setSearchFilters({
      query: '',
      status: 'All',
      duration: '',
      dateRange: ''
    });
  };

  const filterVerifications = (music) => {
    const queryLower = searchFilters.query.toLowerCase();
    
    // Text search
    const matchesQuery = !searchFilters.query || 
      music.name?.toLowerCase().includes(queryLower) ||
      music.artist?.user?.email?.toLowerCase().includes(queryLower) ||
      music.genres?.some(genre => genre.name.toLowerCase().includes(queryLower));

    // Status filter
    const matchesStatus = searchFilters.status === 'All' || 
      music.status?.toLowerCase() === searchFilters.status.toLowerCase();

    // Duration filter
    const duration = parseInt(music.duration_formatted?.split(':')[0] || 0);
    const matchesDuration = !searchFilters.duration ||
      (searchFilters.duration === 'short' && duration < 3) ||
      (searchFilters.duration === 'medium' && duration >= 3 && duration <= 5) ||
      (searchFilters.duration === 'long' && duration > 5);

    // Date filter
    const submissionDate = new Date(music.created_at);
    const now = new Date();
    const daysDiff = (now - submissionDate) / (1000 * 60 * 60 * 24);
    
    const matchesDate = !searchFilters.dateRange ||
      (searchFilters.dateRange === 'today' && daysDiff <= 1) ||
      (searchFilters.dateRange === 'week' && daysDiff <= 7) ||
      (searchFilters.dateRange === 'month' && daysDiff <= 30) ||
      (searchFilters.dateRange === 'quarter' && daysDiff <= 90);

    return matchesQuery && matchesStatus && matchesDuration && matchesDate;
  };

  const filteredVerifications = verifications.filter(filterVerifications);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-4 sm:py-6 px-2 sm:px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Music Verification Requests
          </h1>
          
          <SearchSection 
            searchFilters={searchFilters}
            setSearchFilters={setSearchFilters}
            onReset={resetFilters}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex justify-between items-center">
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
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {filteredVerifications.length} {filteredVerifications.length === 1 ? 'result' : 'results'} found
        </div>

        {/* Content */}
        <div className="h-[calc(100vh-24rem)] overflow-auto">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-6">
              {filteredVerifications.length > 0 ? (
                filteredVerifications.map((music) => (
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
                  <div className="p-8 sm:p-12 text-center text-gray-500 dark:text-gray-400">
                    {Object.values(searchFilters).some(value => value !== '' && value !== 'All') 
                      ? 'No results match your filters'
                      : 'No pending music verifications'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicVerification;