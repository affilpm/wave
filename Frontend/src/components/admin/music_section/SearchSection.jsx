import React, { useState } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

const SearchSection = ({ searchFilters, setSearchFilters, onReset }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (field, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const statusOptions = ['All', 'Pending', 'Approved', 'Rejected'];
  const hasActiveFilters = searchFilters.query || searchFilters.status !== 'All' || searchFilters.duration || searchFilters.dateRange;

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/60 backdrop-blur-sm p-4 space-y-3">
      {/* Basic Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-500" />
        </div>
        <input
          type="text"
          placeholder="Search by title, artist, or genre..."
          value={searchFilters.query}
          onChange={(e) => handleChange('query', e.target.value)}
          className="block w-full pl-10 pr-3 py-2.5 border border-gray-600/50 rounded-lg bg-gray-900/50 text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-colors"
        />
      </div>

      {/* Filter Toggle Row */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
          {isExpanded
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />
          }
        </button>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-700/50">
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
              Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleChange('status', status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    searchFilters.status === status
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
              Duration
            </label>
            <select
              value={searchFilters.duration}
              onChange={(e) => handleChange('duration', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-600/50 rounded-lg bg-gray-900/50 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-colors"
            >
              <option value="">Any duration</option>
              <option value="short">Short (&lt; 3 min)</option>
              <option value="medium">Medium (3-5 min)</option>
              <option value="long">Long (&gt; 5 min)</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
              Submitted
            </label>
            <select
              value={searchFilters.dateRange}
              onChange={(e) => handleChange('dateRange', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-600/50 rounded-lg bg-gray-900/50 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-colors"
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