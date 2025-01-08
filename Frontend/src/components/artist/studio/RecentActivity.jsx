import React from 'react';
import { Music, Clock } from 'lucide-react';
import StudioCard from './StudioCard';

const RecentActivity = () => (
  <StudioCard className="mb-8">
    <div className="px-6 py-4 border-b border-gray-700">
      <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
    </div>
    <div className="p-6">
      <div className="space-y-6">
        {[1, 2, 3].map((_, index) => (
          <div key={index} className="flex items-center space-x-4">
            <div className="bg-gray-700 p-3 rounded-lg">
              <Music className="h-6 w-6 text-gray-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-white">Summer Vibes</h4>
              <div className="flex items-center space-x-2 mt-1">
                <Clock className="h-4 w-4 text-gray-500" />
                <p className="text-sm text-gray-400">Uploaded 2 days ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">1.2K plays</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </StudioCard>
);

export default RecentActivity;