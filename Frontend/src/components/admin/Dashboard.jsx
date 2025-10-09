import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import apiInstance from '../../api';

// Modern card component with gradient background
const DashboardCard = ({ title, value, subtext, icon: Icon, color }) => (
  <div className={`bg-gradient-to-br ${color} p-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02]`}>
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-white/80 text-sm font-medium uppercase tracking-wide">{title}</h3>
      <Icon className="w-6 h-6 text-white/90" />
    </div>
    <div className="text-3xl font-bold text-white mb-1">{value}</div>
    <p className="text-sm text-white/70">{subtext}</p>
  </div>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    monthlyRevenue: 0,
    topSongs: [],
    topArtists: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch data from all endpoints in parallel
        const [totalUsersRes, statsRes, topSongsRes, topArtistsRes] = await Promise.all([
          apiInstance.get('/api/admins/total-users/'),
          apiInstance.get('/api/admins/premium-stats/'),
          apiInstance.get('/api/admins/top-songs/'),
          apiInstance.get('/api/admins/top-artists/')
        ]);

        // Format top songs data for chart
        const formattedSongs = topSongsRes.data.map(song => ({
          name: song.name,
          plays: song.play_count,
          artist: song.artist
        }));
  
        // Format top artists data for chart
        const formattedArtists = topArtistsRes.data.map(artist => ({
          name: artist.user__username,
          plays: artist.follower_count
        }));
  
        // Calculate growth rate if previous month data is available
        // This is a placeholder - you'd implement actual calculation based on your data
        const currentRevenue = statsRes.data.monthly_revenue || 0;
        const previousRevenue = statsRes.data.previous_monthly_revenue || 0;
        const growthRate = previousRevenue > 0 
          ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
          : 0;
  
        // Combine all data
        setDashboardData({
          totalUsers: totalUsersRes.data.total_users,
          premiumUsers: statsRes.data.total_premium_users,
          monthlyRevenue: statsRes.data.total_revenue,
          growthRate: growthRate,
          topSongs: formattedSongs,
          topArtists: formattedArtists
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
  
    fetchDashboardData();
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num;
  };

  // Modern icons
  const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );

  const CrownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
    </svg>
  );

  const RevenueIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="h-14 w-14 border-4 border-t-blue-500 border-r-blue-500 border-b-blue-200 border-l-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <div className="bg-slate-900 p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Oops!</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <button 
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/25"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          {/* <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent">Music Platform Dashboard</h1> */}
          
          {/* <div className="hidden md:block">
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg mr-2 transition-colors">
              <span className="mr-2">●</span> Live Data
            </button>
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
              <span className="mr-2">↓</span> Export
            </button>
          </div> */}
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <DashboardCard 
            title="Total Users"
            value={formatNumber(dashboardData.totalUsers)}
            subtext="Active accounts"
            icon={UsersIcon}
            color="from-blue-600 to-blue-800"
          />
          
          <DashboardCard 
            title="Premium Users"
            value={formatNumber(dashboardData.premiumUsers)}
            subtext={`${((dashboardData.premiumUsers / dashboardData.totalUsers) * 100).toFixed(1)}% of total users`}
            icon={CrownIcon}
            color="from-violet-600 to-violet-800"
          />
          
          <DashboardCard 
      title="Monthly Revenue"
      value={`$${formatNumber(dashboardData.monthlyRevenue / 100)}`}
      subtext={dashboardData.growthRate > 0 
        ? `↑ ${dashboardData.growthRate}%` 
        : dashboardData.growthRate < 0 
          ? `↓ ${Math.abs(dashboardData.growthRate)}%` 
          : 'No change from last month'}
      icon={RevenueIcon}
      color="from-emerald-600 to-emerald-800"
    />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/70 backdrop-blur p-6 rounded-xl shadow-lg border border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-2">Top Songs</h2>
            <p className="text-slate-400 text-sm mb-4">Most played tracks this month</p>
            
            {dashboardData.topSongs.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.topSongs}>
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fill: '#94a3b8' }} />
                    <YAxis tickFormatter={formatNumber} tick={{ fill: '#94a3b8' }} />
                    <Tooltip 
                      formatter={(value) => formatNumber(value)}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-800 p-3 border border-slate-700 rounded-lg shadow-lg">
                              <p className="font-medium text-white">{data.name}</p>
                              <p className="text-sm text-slate-300 mt-1">Artist: {data.artist}</p>
                              <p className="text-sm font-medium text-blue-400 mt-1">Plays: {formatNumber(data.plays)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="plays" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center text-slate-400">
                No song data available
              </div>
            )}
          </div>

          <div className="bg-slate-900/70 backdrop-blur p-6 rounded-xl shadow-lg border border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-2">Top Artists</h2>
            <p className="text-slate-400 text-sm mb-4">Most followed creators</p>
            
            {dashboardData.topArtists.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.topArtists}>
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fill: '#94a3b8' }} />
                    <YAxis tickFormatter={formatNumber} tick={{ fill: '#94a3b8' }} />
                    <Tooltip 
                      formatter={(value) => formatNumber(value)}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-800 p-3 border border-slate-700 rounded-lg shadow-lg">
                              <p className="font-medium text-white">{data.name}</p>
                              <p className="text-sm font-medium text-emerald-400 mt-1">Followers: {formatNumber(data.plays)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="plays" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center text-slate-400">
                No artist data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;