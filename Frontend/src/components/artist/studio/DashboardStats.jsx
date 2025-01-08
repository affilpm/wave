import React from 'react';
import StatCard from './StatCard';
import { Music, Disc, PlayCircle, Users } from 'lucide-react';

const DashboardStats = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <StatCard icon={Music} label="Total Tracks" value="24" color="bg-blue-600" />
    <StatCard icon={Disc} label="Albums" value="3" color="bg-purple-600" />
    <StatCard icon={PlayCircle} label="Total Plays" value="12.5K" color="bg-green-600" />
    <StatCard icon={Users} label="Monthly Listeners" value="5.2K" color="bg-orange-600" />
  </div>
);

export default DashboardStats;