import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Music2, Disc3, Users, Headphones, PlayCircle,
  TrendingUp, Clock, CheckCircle, AlertTriangle, XCircle,
  Upload, Loader2,
} from 'lucide-react';
import api from '../../../api';

// ─── Design tokens ──────────────────────────────────────────────────────────
const COLORS = {
  blue:    { gradient: 'from-blue-500/20 to-blue-600/5',    border: 'border-blue-500/25',    text: 'text-blue-400',    fill: '#3b82f6' },
  violet:  { gradient: 'from-violet-500/20 to-violet-600/5',  border: 'border-violet-500/25',  text: 'text-violet-400',  fill: '#8b5cf6' },
  emerald: { gradient: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/25', text: 'text-emerald-400', fill: '#10b981' },
  amber:   { gradient: 'from-amber-500/20 to-amber-600/5',   border: 'border-amber-500/25',   text: 'text-amber-400',   fill: '#f59e0b' },
  rose:    { gradient: 'from-rose-500/20 to-rose-600/5',     border: 'border-rose-500/25',    text: 'text-rose-400',    fill: '#f43f5e' },
  cyan:    { gradient: 'from-cyan-500/20 to-cyan-600/5',     border: 'border-cyan-500/25',    text: 'text-cyan-400',    fill: '#06b6d4' },
};
const DONUT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#ec4899', '#14b8a6'];

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n >= 10_000_000) return (n / 10_000_000).toFixed(1) + 'Cr';
  if (n >= 100_000)    return (n / 100_000).toFixed(1) + 'L';
  if (n >= 1_000)      return (n / 1_000).toFixed(1) + 'K';
  return n?.toLocaleString?.('en-IN') ?? n;
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ─── Animation ──────────────────────────────────────────────────────────────
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <motion.div variants={item}
    className={`relative overflow-hidden rounded-2xl border ${color.border} bg-gradient-to-br ${color.gradient}
                backdrop-blur-xl p-5 transition-all duration-300 hover:scale-[1.02]`}
  >
    <div className={`p-2 rounded-xl bg-white/5 ${color.text} w-fit mb-3`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="text-2xl font-bold text-white tracking-tight mb-0.5">{value}</div>
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</p>
    {subtitle && <p className="text-[11px] text-gray-500 mt-1">{subtitle}</p>}
  </motion.div>
);

// ─── Glass Panel ────────────────────────────────────────────────────────────
const GlassPanel = ({ children, className = '', title, subtitle }) => (
  <motion.div variants={item}
    className={`rounded-2xl border border-gray-700/40 bg-gray-800/50 backdrop-blur-xl p-5 ${className}`}
  >
    {title && (
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    )}
    {children}
  </motion.div>
);

// ─── Tooltip ────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, prefix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800/95 backdrop-blur border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((e, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: e.color || e.stroke }}>
          {prefix}{typeof e.value === 'number' ? e.value.toLocaleString('en-IN') : e.value}
          {e.dataKey === 'listeners' ? ' listeners' : e.dataKey === 'plays' ? ' plays' : ''}
        </p>
      ))}
    </div>
  );
};

// ─── Donut Label ────────────────────────────────────────────────────────────
const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

const DashboardStats = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/v1/artists/dashboard-stats/');
        setData(res.data);
      } catch (err) {
        console.error('Artist dashboard fetch error:', err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 mb-5">{error}</p>
          <button onClick={() => window.location.reload()}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium rounded-xl
                       hover:from-blue-500 hover:to-violet-500 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { stats, top_tracks, charts, recently_played, recent_uploads } = data;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

      {/* ═══  Track Status Banner  ═══ */}
      {(stats.pending_tracks > 0 || stats.rejected_tracks > 0) && (
        <motion.div variants={item} className="flex flex-wrap gap-3">
          {stats.pending_tracks > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-sm text-amber-200"><strong>{stats.pending_tracks}</strong> track{stats.pending_tracks > 1 ? 's' : ''} pending review</span>
            </div>
          )}
          {stats.rejected_tracks > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span className="text-sm text-rose-200"><strong>{stats.rejected_tracks}</strong> track{stats.rejected_tracks > 1 ? 's' : ''} rejected</span>
            </div>
          )}
        </motion.div>
      )}

      {/* ═══  KPI Stat Cards  ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Total Tracks"    value={fmt(stats.total_tracks)}     icon={Music2}     color={COLORS.blue} />
        <StatCard title="Albums"          value={fmt(stats.total_albums)}     icon={Disc3}      color={COLORS.violet} />
        <StatCard title="Followers"       value={fmt(stats.total_followers)}  icon={Users}      color={COLORS.emerald} />
        <StatCard
          title="Total Plays"
          value={fmt(stats.total_plays)}
          icon={PlayCircle}
          color={COLORS.amber}
          subtitle="A play counts after 30s"
        />
        <StatCard title="Monthly Listeners" value={fmt(stats.monthly_listeners)} icon={Headphones} color={COLORS.cyan}
          subtitle="This month"
        />
      </div>

      {/* ═══  Track Status Mini-Bar  ═══ */}
      {stats.total_tracks > 0 && (
        <motion.div variants={item} className="rounded-xl border border-gray-700/40 bg-gray-800/40 p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Track Status</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-white font-semibold">{stats.approved_tracks}</span>
              <span className="text-xs text-gray-500">Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-white font-semibold">{stats.pending_tracks}</span>
              <span className="text-xs text-gray-500">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span className="text-sm text-white font-semibold">{stats.rejected_tracks}</span>
              <span className="text-xs text-gray-500">Rejected</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex rounded-full overflow-hidden h-2 mt-3 bg-gray-700/40">
            {stats.approved_tracks > 0 && (
              <div className="bg-emerald-500 transition-all" style={{ width: `${(stats.approved_tracks / stats.total_tracks) * 100}%` }} />
            )}
            {stats.pending_tracks > 0 && (
              <div className="bg-amber-500 transition-all" style={{ width: `${(stats.pending_tracks / stats.total_tracks) * 100}%` }} />
            )}
            {stats.rejected_tracks > 0 && (
              <div className="bg-rose-500 transition-all" style={{ width: `${(stats.rejected_tracks / stats.total_tracks) * 100}%` }} />
            )}
          </div>
        </motion.div>
      )}

      {/* ═══  Play Trend + Genre Distribution  ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Play Trend — spans 2 cols */}
        <GlassPanel title="Play Trend" subtitle="Plays & listeners over 6 months" className="lg:col-span-2">
          {charts.play_trend.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.play_trend}>
                  <defs>
                    <linearGradient id="playGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="listenerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={(props) => <ChartTooltip {...props} />} />
                  <Area type="monotone" dataKey="plays" stroke="#3b82f6" strokeWidth={2} fill="url(#playGrad)"
                        dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="listeners" stroke="#10b981" strokeWidth={2} fill="url(#listenerGrad)"
                        dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">No play data yet</div>
          )}
        </GlassPanel>

        {/* Genre Distribution */}
        <GlassPanel title="Your Genres" subtitle="Track distribution">
          {charts.genre_distribution.length > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.genre_distribution}
                      dataKey="count" nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={35} outerRadius={70}
                      paddingAngle={2} labelLine={false}
                      label={renderDonutLabel}
                    >
                      {charts.genre_distribution.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-gray-800/95 backdrop-blur border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
                            <p className="text-sm font-semibold text-white">{payload[0].name}</p>
                            <p className="text-xs text-gray-300">{payload[0].value} tracks</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-1.5">
                {charts.genre_distribution.map((g, i) => (
                  <div key={g.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-xs text-gray-300 flex-1 truncate">{g.name}</span>
                    <span className="text-xs font-medium text-gray-500">{g.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">No genre data</div>
          )}
        </GlassPanel>
      </div>

      {/* ═══  Top Tracks + Recent Activity  ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top Tracks */}
        <GlassPanel title="Top Tracks" subtitle="Your most played songs">
          {top_tracks.length > 0 ? (
            <div className="space-y-2">
              {top_tracks.map((track, i) => (
                <div key={track.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors"
                >
                  {/* Rank */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-orange-700/20 text-orange-500' : 'bg-gray-700/30 text-gray-500'}`}>
                    {i + 1}
                  </div>

                  {/* Cover */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-700/50 flex-shrink-0">
                    {track.cover_photo ? (
                      <img src={track.cover_photo} alt={track.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{track.name}</p>
                  </div>

                  {/* Plays */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-semibold text-blue-400">{fmt(track.play_count)}</span>
                    <span className="text-xs text-gray-500 ml-1">plays</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">No play data yet</div>
          )}
        </GlassPanel>

        {/* Recent Activity — splits into Recently Played + Recent Uploads */}
        <div className="space-y-4">
          {/* Recently Played */}
          <GlassPanel title="Recently Played" subtitle="Who's listening">
            {recently_played.length > 0 ? (
              <div className="space-y-1">
                {recently_played.map((rp) => (
                  <div key={`${rp.music_id}-${rp.last_played}`}
                    className="flex items-center gap-3 py-2 border-b border-gray-700/30 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-700/50 flex-shrink-0">
                      {rp.cover_photo ? (
                        <img src={rp.cover_photo} alt={rp.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{rp.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {rp.listener ? `Played by ${rp.listener}` : `${rp.total_plays} total plays`}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-600 whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" />{timeAgo(rp.last_played)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent plays</p>
            )}
          </GlassPanel>

          {/* Recent Uploads */}
          <GlassPanel title="Recent Uploads" subtitle="Your latest submissions">
            {recent_uploads.length > 0 ? (
              <div className="space-y-1">
                {recent_uploads.map((u) => (
                  <div key={u.id}
                    className="flex items-center gap-3 py-2 border-b border-gray-700/30 last:border-0"
                  >
                    <div className={`p-1.5 rounded-lg ${
                      u.approval_status === 'approved' ? 'bg-emerald-500/10' :
                      u.approval_status === 'pending'  ? 'bg-amber-500/10' : 'bg-rose-500/10'
                    }`}>
                      {u.approval_status === 'approved' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> :
                       u.approval_status === 'pending'  ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> :
                       <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{u.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{u.approval_status}</p>
                    </div>
                    <span className="text-[10px] text-gray-600 whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" />{timeAgo(u.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No uploads yet</p>
            )}
          </GlassPanel>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardStats;