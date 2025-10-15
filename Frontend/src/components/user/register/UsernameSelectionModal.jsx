import React, { useState } from 'react';
import { Loader, AtSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';

const UsernameSelectionModal = ({ 
  isOpen, 
  onClose, 
  googleCredential 
}) => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    
    // Username validation
    const usernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9_]{1,18}[a-zA-Z0-9])?$/;
  
    if (!username) {
      setError('Username is required');
      return;
    }
    
    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }
    
    if (!usernameRegex.test(username)) {
      setError('Username can only contain letters, numbers, and underscores (no leading/trailing underscores)');
      return;
    }
  
    try {
      setLoading(true);
      await api.post('/api/users/google-register/', 
        { 
          token: googleCredential, 
          username: username 
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
  
      navigate('/login', {
        state: { message: 'Registration successful! Please log in.' }
      });
    } catch (err) {
      console.error('Username registration error:', err);
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        'Username registration failed'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" />
      
      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-50"></div>
          
          <div className="relative z-10 p-8">
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <img 
                  src="/shape.png" 
                  alt="Company Logo" 
                  className="w-14 h-14 object-contain" 
                />
              </div>
            </div>

            <div className="text-center mb-10">
              <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
                Choose Username
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                Select a unique username for your account
              </p>
            </div>

            <form onSubmit={handleUsernameSubmit} className="max-w-md mx-auto space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AtSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  className="pl-10 w-full px-4 py-3 bg-gray-700/50 border border-gray-600/30 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition duration-300"
                />

              </div>
              {error && (
                  <div className="mt-2 text-sm text-red-400">{error}</div>
                )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl 
                hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                transition duration-300 ease-in-out transform hover:scale-[1.02] 
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin mr-3 h-5 w-5" />
                    Creating account...
                  </>
                ) : (
                  'Continue'
                )}
              </button>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-4 bg-transparent border border-gray-600 text-gray-400 rounded-xl 
                  hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/50 
                  transition duration-300 ease-in-out transform hover:scale-[1.02]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsernameSelectionModal;