import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';

const SearchSection = ({ searchFilters, setSearchFilters, onReset }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (field, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const statusOptions = ['All', 'Pending', 'Approved', 'Rejected'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-4">
      {/* Basic Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by title, artist, or genre..."
          value={searchFilters.query}
          onChange={(e) => handleChange('query', e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Expand/Collapse Button */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <Filter className="h-4 w-4" />
          Advanced Filters
        </button>
        {(searchFilters.query || searchFilters.status !== 'All' || searchFilters.duration || searchFilters.dateRange) && (
          <button
            onClick={onReset}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Advanced Search Options */}
      {isExpanded && (
        <div className="grid gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleChange('status', status)}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    searchFilters.status === status
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Duration
            </label>
            <select
              value={searchFilters.duration}
              onChange={(e) => handleChange('duration', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
            <option value="">Any duration</option>
            <option value="short">Short (&lt; 3 min)</option>
            <option value="medium">Medium (3-5 min)</option>
            <option value="long">Long (&gt; 5 min)</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Submission Date
            </label>
            <select
              value={searchFilters.dateRange}
              onChange={(e) => handleChange('dateRange', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any time</option>
              <option value="today">Today</option>
              <option value="week">Past week</option>
              <option value="month">Past month</option>
              <option value="quarter">Past 3 months</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchSection;