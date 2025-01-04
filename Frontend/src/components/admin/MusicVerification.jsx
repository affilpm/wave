import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const MusicVerification = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-300">Artist Verification Requests</h2>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition">
            Filter
          </button>
        </div>
      </div>
      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        <table className="w-full text-left">
          <thead className="bg-blue-700 text-white">
            <tr>
              <th className="py-4 px-6">Song</th>
              <th className="py-4 px-6">Artist</th>
              <th className="py-4 px-6">Submitted</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-700 hover:bg-gray-700/50 transition">
              <td className="py-4 px-6 text-white">Song Title</td>
              <td className="py-4 px-6 text-white">Artist Name</td>
              <td className="py-4 px-6 text-white">Dec 26, 2023</td>
              <td className="py-4 px-6 text-white">
                <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-sm font-semibold">
                  Pending
                </span>
              </td>
              <td className="py-4 px-6">
                <div className="flex gap-2">
                  <button className="p-2 bg-green-600 hover:bg-green-500 rounded-full transition">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </button>
                  <button className="p-2 bg-red-600 hover:bg-red-500 rounded-full transition">
                    <XCircle className="h-5 w-5 text-white" />
                  </button>
                </div>
              </td>
            </tr>
            {/* Add more music verification requests as needed */}
          </tbody>
        </table>
      </div>
      </div>

  );
};

export default MusicVerification;