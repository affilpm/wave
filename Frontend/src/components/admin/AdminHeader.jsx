import React from 'react';
import { Search, Users, CheckCircle, Music, Bell } from 'lucide-react';

export const AdminHeader = ({ email, onLogout }) => {
  return (
    <div className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
      <div className="px-3 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Left side - Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-100">
            Admin Dashboard
          </h1>

          {/* Right side - Search, Profile, Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl 
                         focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 
                         text-gray-200 placeholder-gray-400 transition-colors"
              />
            </div>

            {/* Profile & Actions */}
            <div className="flex items-center gap-4 sm:ml-4">
              {/* Notifications */}
              <button className="p-2 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700/70 transition-colors">
                <Bell className="h-4 w-4 text-gray-400" />
              </button>

              {/* Profile Section */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-200">Admin</p>
                  <p className="text-xs text-gray-400">{email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 
                           rounded-lg text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default AdminHeader;