import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Users, Crown, Mic2, Music2, Disc3, ListMusic, Headphones,
  IndianRupee, AlertTriangle, TrendingUp, TrendingDown,
  ArrowRight, Clock, UserPlus, Upload, CreditCard,
} from 'lucide-react';
import api from '../../api';

// ─── Palette ────────────────────────────────────────────────────────────────
const COLORS = {
  blue:    { gradient: 'from-blue-500/20 to-blue-600/5',    border: 'border-blue-500/30',  text: 'text-blue-400',    fill: '#3b82f6',  glow: 'shadow-blue-500/10'    },
  violet:  { gradient: 'from-violet-500/20 to-violet-600/5',  border: 'border-violet-500/30', text: 'text-violet-400',  fill: '#8b5cf6',  glow: 'shadow-violet-500/10'  },
  emerald: { gradient: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/30', text: 'text-emerald-400', fill: '#10b981', glow: 'shadow-emerald-500/10' },
  amber:   { gradient: 'from-amber-500/20 to-amber-600/5',   border: 'border-amber-500/30', text: 'text-amber-400',   fill: '#f59e0b',  glow: 'shadow-amber-500/10'   },
  rose:    { gradient: 'from-rose-500/20 to-rose-600/5',     border: 'border-rose-500/30',  text: 'text-rose-400',    fill: '#f43f5e',  glow: 'shadow-rose-500/10'    },
  cyan:    { gradient: 'from-cyan-500/20 to-cyan-600/5',     border: 'border-cyan-500/30',  text: 'text-cyan-400',    fill: '#06b6d4',  glow: 'shadow-cyan-500/10'    },
  teal:    { gradient: 'from-teal-500/20 to-teal-600/5',     border: 'border-teal-500/30',  text: 'text-teal-400',    fill: '#14b8a6',  glow: 'shadow-teal-500/10'    },
  pink:    { gradient: 'from-pink-500/20 to-pink-600/5',     border: 'border-pink-500/30',  text: 'text-pink-400',    fill: '#ec4899',  glow: 'shadow-pink-500/10'    },
};

const DONUT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#ec4899', '#14b8a6', '#6366f1', '#84cc16'];

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n >= 10_000_000) return (n / 10_000_000).toFixed(1) + 'Cr';
  if (n >= 100_000)    return (n / 100_000).toFixed(1) + 'L';
  if (n >= 1_000)      return (n / 1_000).toFixed(1) + 'K';
  return n?.toLocaleString?.('en-IN') ?? n;
};
const fmtCurrency = (n) => '₹' + fmt(n);

const pctChange = (curr, prev) => {
  if (!prev || prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev * 100).toFixed(1);
};

// ─── Stagger animation ─────────────────────────────────────────────────────
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, icon: Icon, color, delay = 0 }) => (
  <motion.div variants={item}
    className={`relative overflow-hidden rounded-2xl border ${color.border} bg-gradient-to-br ${color.gradient}
                backdrop-blur-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${color.glow}`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2.5 rounded-xl bg-white/5 ${color.text}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <div className="text-2xl font-bold text-white tracking-tight mb-1">{value}</div>
    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
  </motion.div>
);

// ─── Pending Action Card ────────────────────────────────────────────────────
const PendingCard = ({ title, count, onClick }) => (
  <motion.div variants={item}
    onClick={onClick}
    className="flex items-center gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur
               p-4 cursor-pointer hover:bg-amber-500/10 transition-all duration-200 group"
  >
    <div className="p-2.5 rounded-lg bg-amber-500/10">
      <AlertTriangle className="w-5 h-5 text-amber-400" />
    </div>
    <div className="flex-1">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-amber-400/80 mt-0.5">{count} pending review</p>
    </div>
    <ArrowRight className="w-4 h-4 text-amber-400/50 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
  </motion.div>
);

// ─── Glass Panel ────────────────────────────────────────────────────────────
const GlassPanel = ({ children, className = '', title, subtitle }) => (
  <motion.div variants={item}
    className={`rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl p-6 ${className}`}
  >
    {title && (
      <div className="mb-5">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    )}
    {children}
  </motion.div>
);

// ─── Custom Tooltip ─────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, valuePrefix = '', valueSuffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-slate-300 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color || entry.fill }}>
          {valuePrefix}{typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN') : entry.value}{valueSuffix}
        </p>
      ))}
    </div>
  );
};

// ─── Donut Label ────────────────────────────────────────────────────────────
const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

// ─── Activity Row ───────────────────────────────────────────────────────────
const ActivityRow = ({ icon: Icon, primary, secondary, time, color = 'text-slate-400' }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-slate-800/50 last:border-0">
    <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-white truncate">{primary}</p>
      <p className="text-xs text-slate-500 truncate">{secondary}</p>
    </div>
    {time && (
      <span className="text-[10px] text-slate-600 whitespace-nowrap flex items-center gap-1">
        <Clock className="w-3 h-3" />{time}
      </span>
    )}
  </div>
);


// ═════════════════════════════════════════════════════════════════════════════
// Main Dashboard Component
// ═════════════════════════════════════════════════════════════════════════════

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/v1/admins/dashboard-stats/');
        setData(res.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
            <div className="absolute inset-0 rounded-full border-2 border-t-violet-500 border-r-blue-500 border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="text-slate-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-rose-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-400 mb-5">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-medium rounded-xl
                       hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-500/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { stats, pending, charts, top_songs, top_artists, recent_activity } = data;
  const revenueChange = pctChange(stats.monthly_revenue, stats.previous_month_revenue);

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      className="min-h-screen bg-slate-950 p-4 md:p-8"
    >
      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* ╒═══════════════════════════╕
            │   Welcome + Date Header   │
            ╘═══════════════════════════╛ */}
        <motion.div variants={item} className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Platform Overview
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </motion.div>

        {/* ╒═══════════════════════════╕
            │   Pending Actions Banner  │
            ╘═══════════════════════════╛ */}
        {(pending.artist_verifications > 0 || pending.music_approvals > 0) && (
          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pending.artist_verifications > 0 && (
              <PendingCard title="Artist Verifications" count={pending.artist_verifications} />
            )}
            {pending.music_approvals > 0 && (
              <PendingCard title="Music Approvals" count={pending.music_approvals} />
            )}
          </motion.div>
        )}

        {/* ╒═══════════════════════════╕
            │       KPI Stat Cards      │
            ╘═══════════════════════════╛ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard title="Total Users"     value={fmt(stats.total_users)}     icon={Users}      color={COLORS.blue} />
          <StatCard title="Premium Subs"    value={fmt(stats.active_premium)}  icon={Crown}      color={COLORS.violet}
            subtitle={stats.total_users > 0 ? `${((stats.active_premium / stats.total_users) * 100).toFixed(1)}% of users` : ''}
          />
          <StatCard title="Artists"         value={fmt(stats.total_artists)}   icon={Mic2}       color={COLORS.emerald} />
          <StatCard title="Tracks"          value={fmt(stats.total_tracks)}    icon={Music2}     color={COLORS.amber} />
          <StatCard
            title="Revenue (Mo)"
            value={fmtCurrency(stats.monthly_revenue)}
            icon={IndianRupee}
            color={COLORS.teal}
            subtitle={
              <span className={`inline-flex items-center gap-0.5 text-xs ${revenueChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {revenueChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(revenueChange)}% vs last month
              </span>
            }
          />
          <StatCard title="Total Streams"   value={fmt(stats.total_streams)}   icon={Headphones} color={COLORS.pink} />
        </div>

        {/* ╒═══════════════════════════╕
            │    Revenue + User Growth  │
            ╘═══════════════════════════╛ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue Trend */}
          <GlassPanel title="Revenue Trend" subtitle="Last 6 months">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenue_trend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => '₹' + fmt(v)} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={65} />
                  <Tooltip content={(props) => <ChartTooltip {...props} valuePrefix="₹" />} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          {/* User Growth */}
          <GlassPanel title="User Growth" subtitle="New signups per month">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.user_growth}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={ChartTooltip} />
                  <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} fill="url(#userGrad)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>
        </div>

        {/* ╒═══════════════════════════╕
            │ Top Songs + Top Artists   │
            ╘═══════════════════════════╛ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Songs */}
          <GlassPanel title="Top Tracks" subtitle="Most played songs">
            {top_songs.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top_songs} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#e2e8f0', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                            <p className="text-sm font-semibold text-white">{d.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">by {d.artist}</p>
                            <p className="text-sm font-bold text-blue-400 mt-1">{d.play_count?.toLocaleString('en-IN')} plays</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="play_count" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-52 flex items-center justify-center text-slate-500 text-sm">No play data yet</div>
            )}
          </GlassPanel>

          {/* Top Artists */}
          <GlassPanel title="Top Artists" subtitle="By follower count">
            {top_artists.length > 0 ? (
              <div className="space-y-3">
                {top_artists.map((a, i) => (
                  <div key={a.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-400/20 text-slate-300' : i === 2 ? 'bg-orange-700/20 text-orange-500' : 'bg-slate-700/30 text-slate-500'}`}>
                      {i + 1}
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {(a.user__username || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{a.user__username}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-emerald-400">{fmt(a.follower_count)}</span>
                      <span className="text-xs text-slate-500 ml-1">followers</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-52 flex items-center justify-center text-slate-500 text-sm">No artist data yet</div>
            )}
          </GlassPanel>
        </div>

        {/* ╒═══════════════════════════╕
            │  Genre + Plan Distrib.    │
            ╘═══════════════════════════╛ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Genre Distribution */}
          <GlassPanel title="Genre Distribution" subtitle="Tracks by genre">
            {charts.genre_distribution.length > 0 ? (
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-48 h-48 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.genre_distribution}
                        dataKey="track_count"
                        nameKey="name"
                        cx="50%" cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        labelLine={false}
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
                            <div className="bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                              <p className="text-sm font-semibold text-white">{payload[0].name}</p>
                              <p className="text-xs text-slate-300 mt-0.5">{payload[0].value} tracks</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {charts.genre_distribution.map((g, i) => (
                    <div key={g.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="text-xs text-slate-300 flex-1 truncate">{g.name}</span>
                      <span className="text-xs font-medium text-slate-400">{g.track_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No genre data</div>
            )}
          </GlassPanel>

          {/* Plan Distribution */}
          <GlassPanel title="Subscription Plans" subtitle="Active subscribers by plan">
            {charts.plan_distribution.length > 0 ? (
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-48 h-48 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.plan_distribution}
                        dataKey="subscribers"
                        nameKey="name"
                        cx="50%" cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        labelLine={false}
                        label={renderDonutLabel}
                      >
                        {charts.plan_distribution.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                              <p className="text-sm font-semibold text-white">{d.name}</p>
                              <p className="text-xs text-slate-300 mt-0.5">{d.subscribers} subscribers</p>
                              <p className="text-xs text-emerald-400 mt-0.5">₹{d.price}/plan</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {charts.plan_distribution.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="text-xs text-slate-300 flex-1 truncate">{p.name}</span>
                      <span className="text-xs font-medium text-emerald-400">₹{p.price}</span>
                      <span className="text-xs text-slate-500">· {p.subscribers}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No plan data</div>
            )}
          </GlassPanel>
        </div>

        {/* ╒═══════════════════════════╕
            │     Recent Activity       │
            ╘═══════════════════════════╛ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Transactions */}
          <GlassPanel title="Recent Transactions" subtitle="Latest payments">
            {recent_activity.transactions.length > 0 ? (
              <div>
                {recent_activity.transactions.map((t) => (
                  <ActivityRow
                    key={t.id}
                    icon={CreditCard}
                    primary={`₹${parseFloat(t.amount).toLocaleString('en-IN')}`}
                    secondary={t.user?.email || 'Unknown'}
                    time={timeAgo(t.timestamp)}
                    color={t.status === 'captured' || t.status === 'authorized' ? 'text-emerald-400' : t.status === 'refunded' ? 'text-amber-400' : 'text-slate-400'}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">No transactions yet</p>
            )}
          </GlassPanel>

          {/* Recent Signups */}
          <GlassPanel title="New Users" subtitle="Latest registrations">
            {recent_activity.signups.length > 0 ? (
              <div>
                {recent_activity.signups.map((u) => (
                  <ActivityRow
                    key={u.id}
                    icon={UserPlus}
                    primary={u.username}
                    secondary={u.email}
                    time={timeAgo(u.created_at)}
                    color="text-blue-400"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">No recent signups</p>
            )}
          </GlassPanel>

          {/* Recent Uploads */}
          <GlassPanel title="Recent Uploads" subtitle="Latest track submissions">
            {recent_activity.uploads.length > 0 ? (
              <div>
                {recent_activity.uploads.map((m) => (
                  <ActivityRow
                    key={m.id}
                    icon={Upload}
                    primary={m.name}
                    secondary={`by ${m.artist}`}
                    time={timeAgo(m.created_at)}
                    color={m.status === 'approved' ? 'text-emerald-400' : m.status === 'pending' ? 'text-amber-400' : 'text-rose-400'}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">No recent uploads</p>
            )}
          </GlassPanel>
        </div>

        {/* ╒═══════════════════════════╕
            │      Content Summary      │
            ╘═══════════════════════════╛ */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-4 text-center">
            <Disc3 className="w-5 h-5 text-violet-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{fmt(stats.total_albums)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Albums</p>
          </div>
          <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-4 text-center">
            <ListMusic className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{fmt(stats.total_playlists)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Playlists</p>
          </div>
          <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-4 text-center">
            <Music2 className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{fmt(stats.total_tracks)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Approved Tracks</p>
          </div>
          <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-4 text-center">
            <Mic2 className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{fmt(stats.total_artists)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Verified Artists</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;