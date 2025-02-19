import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const DashboardCard = ({ title, value, subtext, icon: Icon }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-gray-600 text-sm font-semibold">{title}</h3>
      <Icon className="w-5 h-5 text-blue-500" />
    </div>
    <div className="text-2xl font-bold text-gray-800">{value}</div>
    <p className="text-sm text-gray-500 mt-1">{subtext}</p>
  </div>
);

const Dashboard = () => {
  // Sample data - replace with your actual data
  const topSongs = [
    { name: "Blinding Lights", plays: 2500000 },
    { name: "Shape of You", plays: 2100000 },
    { name: "Stay", plays: 1800000 },
    { name: "Bad Guy", plays: 1600000 },
    { name: "Levitating", plays: 1400000 }
  ];

  const topArtists = [
    { name: "The Weeknd", plays: 5200000 },
    { name: "Ed Sheeran", plays: 4800000 },
    { name: "Dua Lipa", plays: 4200000 },
    { name: "Taylor Swift", plays: 3900000 },
    { name: "Drake", plays: 3600000 }
  ];

  const subscriptionData = {
    totalUsers: 10000000,
    premiumUsers: 4000000,
    revenueThisMonth: 12000000,
    growthRate: 12.5
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num;
  };

  // Simple icons using SVG
  const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  const CrownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );

  const RevenueIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <DashboardCard 
          title="Total Users"
          value={formatNumber(subscriptionData.totalUsers)}
          subtext="Active accounts"
          icon={UsersIcon}
        />
        
        <DashboardCard 
          title="Premium Users"
          value={formatNumber(subscriptionData.premiumUsers)}
          subtext={`${((subscriptionData.premiumUsers / subscriptionData.totalUsers) * 100).toFixed(1)}% of total users`}
          icon={CrownIcon}
        />
        
        <DashboardCard 
          title="Monthly Revenue"
          value={`$${formatNumber(subscriptionData.revenueThisMonth)}`}
          subtext={`↑ ${subscriptionData.growthRate}% from last month`}
          icon={RevenueIcon}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Top Songs</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSongs}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                <YAxis tickFormatter={formatNumber} />
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Bar dataKey="plays" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Top Artists</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topArtists}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                <YAxis tickFormatter={formatNumber} />
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Bar dataKey="plays" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;