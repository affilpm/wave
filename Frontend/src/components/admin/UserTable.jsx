// components/UserTable.js
import React from 'react';
import { ChevronRight } from 'lucide-react';

const UserTable = () => {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-4 px-6">User</th>
            <th className="text-left py-4 px-6">Email</th>
            <th className="text-left py-4 px-6">Role</th>
            <th className="text-left py-4 px-6">Joined</th>
            <th className="text-left py-4 px-6">Status</th>
            <th className="text-left py-4 px-6">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-700 hover:bg-gray-700/50">
            <td className="py-4 px-6">John Doe</td>
            <td className="py-4 px-6">john@example.com</td>
            <td className="py-4 px-6">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">Artist</span>
            </td>
            <td className="py-4 px-6">Dec 24, 2023</td>
            <td className="py-4 px-6">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Active</span>
            </td>
            <td className="py-4 px-6">
              <button className="text-gray-400 hover:text-white">
                <ChevronRight className="h-5 w-5" />
              </button>
            </td>
          </tr>
          {/* Add more user rows as needed */}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;