// components/NavTabs.js
import React from 'react';
import { Users, CheckCircle, Music , LayoutDashboard, IndianRupee} from 'lucide-react';

export const NavTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
    },
    {
      id: 'artist-verification',
      label: 'Artist Verification',
      icon: CheckCircle,
    },
    {
      id: 'music-verification',
      label: 'Music Verification',
      icon: Music,
    },
    {
      id: 'transactions',
      label: 'transactions',
      icon: IndianRupee,
    },
  ];

  return (
    <div className="sticky top-[73px] sm:top-[65px] z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
      <div className="px-3 sm:px-6">
        {/* Desktop Tabs */}
        <div className="hidden sm:flex space-x-6 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`py-4 px-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap
                ${
                  activeTab === id
                    ? 'border-violet-500 text-violet-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Mobile Tabs */}
        <div className="flex sm:hidden">
          <div className="flex space-x-4 overflow-x-auto py-3 w-full">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap
                  ${
                    activeTab === id
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


export default NavTabs;