import React from 'react';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition-all">
    <div className="p-6">
      <div className="flex items-center space-x-3">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
      </div>
    </div>
  </div>
);

export default StatCard;