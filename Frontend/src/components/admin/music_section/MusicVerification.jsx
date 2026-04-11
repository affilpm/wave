import React, { useState, useEffect, useRef } from 'react';
import { Music, CheckCircle, XCircle, Play, Pause, Clock, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { musicVerificationService } from '../../../services/admin/musicVerificationService';
import SearchSection from './SearchSection';
import SimpleVerificationPlayer from './SimpleVerificationPlayer';


// ─── Loading skeleton ───────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="space-y-3" aria-label="Loading content">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="rounded-xl border border-gray-700/30 bg-gray-800/40 p-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-gray-700/50 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700/50 rounded w-1/4 animate-pulse" />
            <div className="h-3 bg-gray-700/50 rounded w-1/3 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded-lg bg-gray-700/50 animate-pulse" />
            <div className="h-8 w-20 rounded-lg bg-gray-700/50 animate-pulse" />
          </div>
        </div>
      </div>
    ))}
  </div>
);


// ─── Status badge ───────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const config = {
    pending:  { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Pending' },
    approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'Approved' },
    rejected: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/20', label: 'Rejected' },
  };
  const s = config[status?.toLowerCase()] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.text.replace('text-', 'bg-')}`} />
      {s.label}
    </span>
  );
};


// ─── Time ago helper ────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};


// ─── Verification Card ──────────────────────────────────────────────────────
const MusicVerificationCard = ({ music, onApprove, onReject, isPlaying, onPlayToggle, disabled }) => {
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    if (isPlaying) setShowPlayer(true);
  }, [isPlaying]);

  const handlePlayClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (music.audio_url) {
      onPlayToggle(music.id, music.audio_url);
      setShowPlayer(true);
    }
  };

  return (
    <div className={`rounded-xl border transition-all duration-200 ${
      isPlaying
        ? 'border-blue-500/30 bg-blue-500/5'
        : 'border-gray-700/40 bg-gray-800/50 hover:bg-gray-800/70 hover:border-gray-600/50'
    }`}>
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Cover + Play overlay */}
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-700/50 flex-shrink-0 group cursor-pointer"
            onClick={music.audio_url ? handlePlayClick : undefined}
          >
            {music.cover_photo ? (
              <img
                src={music.cover_photo}
                alt={music.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="h-5 w-5 text-gray-500" />
              </div>
            )}
            {/* Play overlay */}
            {music.audio_url && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </div>
            )}
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-white truncate text-sm">
                {music.name || 'Untitled'}
              </h3>
              <StatusBadge status={music.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="truncate">{music.artist?.user?.username || music.artist?.user?.email || 'Unknown'}</span>
              {music.duration_formatted && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {music.duration_formatted}
                  </span>
                </>
              )}
              {music.genres?.length > 0 && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="hidden sm:inline truncate">{music.genres.map(g => g.name).join(', ')}</span>
                </>
              )}
              {music.submitted_date && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="hidden md:flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {timeAgo(music.submitted_date)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {music.status !== 'approved' && (
              <button
                type="button"
                onClick={() => onApprove(music.id)}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-emerald-500/10 text-emerald-400 border border-emerald-500/20
                           hover:bg-emerald-500/20 hover:border-emerald-500/30
                           disabled:opacity-40 transition-all"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Approve</span>
              </button>
            )}
            {music.status !== 'rejected' && (
              <button
                type="button"
                onClick={() => onReject(music.id)}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-rose-500/10 text-rose-400 border border-rose-500/20
                           hover:bg-rose-500/20 hover:border-rose-500/30
                           disabled:opacity-40 transition-all"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reject</span>
              </button>
            )}
          </div>
        </div>

        {/* Audio Player (inline) */}
        {music.audio_url && showPlayer && (
          <div className="mt-3 pt-3 border-t border-gray-700/30">
            <SimpleVerificationPlayer
              audioUrl={music.audio_url}
              isPlaying={isPlaying}
              onPlayToggle={onPlayToggle}
              musicId={music.id}
            />
          </div>
        )}
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
const MusicVerification = () => {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 8;

  const [searchFilters, setSearchFilters] = useState({
    query: '',
    status: 'All',
    duration: '',
    dateRange: ''
  });

  useEffect(() => {
    loadVerifications(currentPage);
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [currentPage]);

  const loadVerifications = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await musicVerificationService.getPendingVerifications(page);

      if (data && data.results) {
        setVerifications(data.results);
        setTotalItems(data.count);
      } else {
        setVerifications(Array.isArray(data) ? data : []);
        setTotalItems(Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayToggle = (musicId, audioUrl) => {
    if (!audioUrl) {
      setError('No audio URL available');
      return;
    }
    setPlayingId(prev => prev === musicId ? null : musicId);
  };

  const handleApprove = async (musicId) => {
    try {
      setActionInProgress(true);
      const updatedMusic = await musicVerificationService.approveMusic(musicId);
      setVerifications(prev =>
        prev.map(m => m.id === musicId ? updatedMusic : m)
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
        prev.map(m => m.id === musicId ? updatedMusic : m)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const resetFilters = () => {
    setSearchFilters({ query: '', status: 'All', duration: '', dateRange: '' });
  };

  // ── Client-side filter (applies within the current page) ──
  const filterVerifications = (music) => {
    const q = searchFilters.query.toLowerCase();

    const matchesQuery = !q ||
      music.name?.toLowerCase().includes(q) ||
      music.artist?.user?.email?.toLowerCase().includes(q) ||
      music.artist?.user?.username?.toLowerCase().includes(q) ||
      music.genres?.some(g => g.name.toLowerCase().includes(q));

    const matchesStatus = searchFilters.status === 'All' ||
      music.status?.toLowerCase() === searchFilters.status.toLowerCase();

    // Duration: parse "M:SS" format
    let matchesDuration = true;
    if (searchFilters.duration && music.duration_formatted) {
      const parts = music.duration_formatted.split(':');
      const totalMinutes = parseInt(parts[0] || 0) + (parseInt(parts[1] || 0) / 60);
      matchesDuration =
        (searchFilters.duration === 'short'  && totalMinutes < 3) ||
        (searchFilters.duration === 'medium' && totalMinutes >= 3 && totalMinutes <= 5) ||
        (searchFilters.duration === 'long'   && totalMinutes > 5);
    } else if (searchFilters.duration) {
      matchesDuration = false;
    }

    // Date: use submitted_date (serializer field) which maps to created_at
    let matchesDate = true;
    if (searchFilters.dateRange && music.submitted_date) {
      const daysDiff = (Date.now() - new Date(music.submitted_date).getTime()) / (1000 * 60 * 60 * 24);
      matchesDate =
        (searchFilters.dateRange === 'today'   && daysDiff <= 1) ||
        (searchFilters.dateRange === 'week'    && daysDiff <= 7) ||
        (searchFilters.dateRange === 'month'   && daysDiff <= 30) ||
        (searchFilters.dateRange === 'quarter' && daysDiff <= 90);
    } else if (searchFilters.dateRange) {
      matchesDate = false;
    }

    return matchesQuery && matchesStatus && matchesDuration && matchesDate;
  };

  const filteredVerifications = verifications.filter(filterVerifications);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // ── Pagination page numbers array ──
  const getPageNumbers = () => {
    const pages = [];
    const delta = 1;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white mb-1">Music Verification</h1>
        <p className="text-sm text-gray-500">Review and approve submitted tracks</p>
      </div>

      {/* Search & Filters */}
      <SearchSection
        searchFilters={searchFilters}
        setSearchFilters={setSearchFilters}
        onReset={resetFilters}
      />

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 flex justify-between items-center">
          <p className="text-sm text-rose-400">{error}</p>
          <div className="flex gap-3 text-xs">
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">Dismiss</button>
            <button onClick={() => loadVerifications(currentPage)} className="text-rose-400 hover:text-rose-300">Retry</button>
          </div>
        </div>
      )}

      {/* Results Info Bar */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {!loading && (
            <>
              Showing <span className="text-gray-300 font-medium">{filteredVerifications.length}</span>
              {totalItems > pageSize && (
                <> of <span className="text-gray-300 font-medium">{totalItems}</span></>
              )} tracks
            </>
          )}
        </p>
        {totalPages > 1 && (
          <p className="text-xs text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
        )}
      </div>

      {/* Track List */}
      <div className="space-y-2">
        {loading ? (
          <LoadingSkeleton />
        ) : filteredVerifications.length > 0 ? (
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
          <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 py-16 text-center">
            <Music className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {Object.values(searchFilters).some(v => v !== '' && v !== 'All')
                ? 'No tracks match your filters on this page'
                : 'No verification requests'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-1.5 pt-2 pb-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-700/40 bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span key={`e-${idx}`} className="px-1.5 text-gray-600 text-sm">…</span>
            ) : (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                  currentPage === page
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'border border-gray-700/40 bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-700/40 bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MusicVerification;