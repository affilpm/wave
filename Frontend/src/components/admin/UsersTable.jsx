import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Search, Users, Filter } from 'lucide-react';

const UserStatusColors = {
  active: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400'
  },
  inactive: {
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
    dot: 'bg-rose-400'
  }
};

const RoleColors = {
  artist: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400'
  },
  user: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400'
  }
};

const UsersTable = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    role: '',
    joinedPeriod: ''
  });
  const [showFilters, setShowFilters] = useState(false);




  const handleStatusChange = async (userId, newStatus) => {
    setActionLoading(userId);
    try {
      await api.patch(`/api/admins/user-table/${userId}/`, {
        is_active: newStatus
      });
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_active: newStatus }
          : user
      ));
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/api/admins/user-table/');
        const userData = Array.isArray(response.data) ? response.data : response.data.results || [];
        setUsers(userData);
        console.log(userData)
        setFilteredUsers(userData); 
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const getStatusBadge = (isActive) => {
    const colors = isActive ? UserStatusColors.active : UserStatusColors.inactive;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></span>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const colors = RoleColors[role.toLowerCase()] || RoleColors.user;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
        {role}
      </span>
    );
  };

  const getRandomColor = (str) => {
    const colors = [
      'bg-violet-500',
      'bg-pink-500',
      'bg-blue-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
      'bg-yellow-500',
      'bg-indigo-500',
    ];
    const index = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };


  
  const UserCard = ({ user }) => (
    <div className="p-3 bg-gray-800/70 rounded-lg border border-gray-700/50">
      <div className="flex flex-col space-y-3">
        <div className="flex items-start gap-3">
          {user.profile_photo ? (
            <img 
              src={user.profile_photo} 
              alt={user.username}
              className="w-12 h-12 rounded-lg object-cover ring-2 ring-gray-700 shrink-0"
            />
          ) : (
            <div className={`w-12 h-12 rounded-lg ring-2 ring-gray-700 flex items-center justify-center ${getRandomColor(user.email)} shrink-0`}>
              <span className="text-sm font-medium text-white">
                {user.username}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-gray-200 font-medium">{user.username}</p>
            <p className="text-gray-300 text-sm break-all">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {getRoleBadge(user.role)}
              {getStatusBadge(user.is_active)}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
          <span className="text-sm text-gray-400">Joined {user.joined}</span>
          {actionLoading === user.id ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
          ) : user.is_active ? (
            <button
              onClick={() => handleStatusChange(user.id, false)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
            >
              Block
            </button>
          ) : (
            <button
              onClick={() => handleStatusChange(user.id, true)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              Unblock
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-3 sm:p-8 border border-gray-700/50 backdrop-blur-sm">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 rounded-xl p-3 sm:p-8 border border-red-500/20">
        <div className="text-center text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 bg-violet-500/10 rounded-lg shrink-0">
            <Users className="h-5 w-5 text-violet-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-200 truncate">Users</h2>
            <p className="text-sm text-gray-400">Managing {users.length} users</p>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl 
                       focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 
                       text-gray-200 placeholder-gray-400 transition-colors"
            />
          </div>
          <button className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition-colors shrink-0">
            <Filter className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden md:block bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 backdrop-blur-sm mx-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left py-4 px-6 font-medium text-gray-400">User</th>
                <th className="text-left py-4 px-6 font-medium text-gray-400">Email</th>
                <th className="text-left py-4 px-6 font-medium text-gray-400">Role</th>
                <th className="text-left py-4 px-6 font-medium text-gray-400">Joined</th>
                <th className="text-left py-4 px-6 font-medium text-gray-400">Status</th>
                <th className="text-left py-4 px-6 font-medium text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {user.profile_photo ? (
                        <img 
                          src={user.profile_photo} 
                          alt={user.username}
                          className="w-10 h-10 rounded-lg object-cover ring-2 ring-gray-700"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-lg ring-2 ring-gray-700 flex items-center justify-center ${getRandomColor(user.email)}`}>
                          <span className="text-sm font-medium text-white">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-200">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-gray-400">@{user.username.split('@')[0]}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-300">{user.email}</td>
                  <td className="py-4 px-6">{getRoleBadge(user.role)}</td>
                  <td className="py-4 px-6">
                    <span className="text-gray-300">{user.joined}</span>
                  </td>
                  <td className="py-4 px-6">{getStatusBadge(user.is_active)}</td>
                  <td className="py-4 px-6">
                    {actionLoading === user.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                    ) : user.is_active ? (
                      <button
                        onClick={() => handleStatusChange(user.id, false)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                      >
                        Block
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(user.id, true)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                      >
                        Unblock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards - Shown only on mobile */}
      <div className="md:hidden space-y-2 px-3">
        {filteredUsers.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No users found matching your filters.</p>
        </div>
      )}
    </div>
  );
};


export default UsersTable;