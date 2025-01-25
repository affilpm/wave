import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { ChevronRight, User, Bell, Globe, Lock, Shield, Volume2, Download, Plus, Clock, Info, Music, Star, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { ACCESS_TOKEN } from '../../../constants/authConstants';
import api from '../../../api'; // Import your API instance
import CreatorStudio from './CreatorStudio';
const Settings = () => {

  const navigate = useNavigate();
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');


  
  const handleSubmit = async () => {
    if (!bio.trim()) return;
  
    setIsSubmitting(true);
    setError('');
    setSuccess('');
  
    try {
      // Get the access token from localStorage
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Access token not found');
      }
  
      // Make the request using the api.js instance with the Authorization header
      const response = await api.post('/api/artists/request_verification/', {
        bio,
      }, {
        headers: {
          Authorization: `Bearer ${token}`, // Attach the token here
        }
      });
  
      if (response.status === 200) {
        setSuccess('Your verification request has been submitted successfully!');
        setBio('');
      }
    } catch (err) {
      // If unauthorized (401), attempt to refresh the token and retry the request
      if (err.response?.status === 401) {
        try {
          const newToken = await refreshAccessToken();
          // Retry the original request with the new token
          const response = await api.post('/api/artists/request_verification/', {
            bio,
          }, {
            headers: {
              Authorization: `Bearer ${newToken}`,
            }
          });
  
          if (response.status === 200) {
            setSuccess('Your verification request has been submitted successfully!');
            setBio('');
          }
        } catch (refreshError) {
          setError('Failed to refresh token or submit request');
        }
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to submit request');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Refresh the access token if expired
  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token'); // Assuming you store the refresh token
    if (!refreshToken) {
      throw new Error('No refresh token found');
    }
  
    try {
      const response = await fetch('http://localhost:8000/api/token/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
  
      const data = await response.json();
  
      if (!response.ok || !data?.access) {
        throw new Error('Failed to refresh access token');
      }
  
      // Store the new access token
      localStorage.setItem('access_token', data.access);
      return data.access;
    } catch (err) {
      throw new Error('Error refreshing token: ' + err.message);
    }
  };
  return (
    <div className="min-h-screen bg-gray-900 text-white flex-col">
      {/* Settings Header */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center">
          <button
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => navigate('/home')} // Navigate to the home page
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-semibold">Back</span>
          </button>
          <h1 className="text-2xl font-bold ml-auto">Settings</h1>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-5xl mx-auto px-8 py-6">
        {/* Account Settings */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Account</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 flex items-center justify-between hover:bg-gray-700 cursor-pointer">
              <div className="flex items-center gap-4">
                <User className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-semibold">Profile</div>
                  <div className="text-sm text-gray-400">Edit your profile</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="border-t border-gray-700"></div>
            
            <div className="p-4 flex items-center justify-between hover:bg-gray-700 cursor-pointer">
              <div className="flex items-center gap-4">
                <Lock className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-semibold">Account security</div>
                  <div className="text-sm text-gray-400">Password, email, phone number</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </section>


        {/* Notifications */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Notifications</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 flex items-center justify-between hover:bg-gray-700 cursor-pointer">
              <div className="flex items-center gap-4">
                <Bell className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-semibold">Notification settings</div>
                  <div className="text-sm text-gray-400">Choose what notifications you want to receive</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </section>

        {/* App Settings */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">App Settings</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 flex items-center justify-between hover:bg-gray-700 cursor-pointer">
              <div className="flex items-center gap-4">
                <Globe className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-semibold">Language</div>
                  <div className="text-sm text-gray-400">Choose your preferred language</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">English</span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div className="border-t border-gray-700"></div>
            
            <div className="p-4 flex items-center justify-between hover:bg-gray-700 cursor-pointer">
              <div className="flex items-center gap-4">
                <Download className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-semibold">Offline storage</div>
                  <div className="text-sm text-gray-400">Control where your music is stored</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </section>

        {/* Playback */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Playback</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 flex items-center justify-between hover:bg-gray-700 cursor-pointer">
              <div className="flex items-center gap-4">
                <Volume2 className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-semibold">Audio quality</div>
                  <div className="text-sm text-gray-400">Control your audio quality settings</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="border-t border-gray-700"></div>
            
            <div className="p-4 flex items-center justify-between hover:bg-gray-700 cursor-pointer">
              <div className="flex items-center gap-4">
                <Clock className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-semibold">Crossfade</div>
                  <div className="text-sm text-gray-400">Allow tracks to blend into each other</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </section>

        {/* Creator Studio */}

        <CreatorStudio/>


        {/* About */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">About</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 flex items-center justify-between hover:bg-gray-700 cursor-pointer">
              <div className="flex items-center gap-4">
                <Info className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-semibold">Version</div>
                  <div className="text-sm text-gray-400">1.0.0</div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-700"></div>
            
            <div className="p-4 flex items-center justify-between hover:bg-gray-700 cursor-pointer">
              <div className="flex items-center gap-4">
                <Shield className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-semibold">Privacy Policy</div>
                  <div className="text-sm text-gray-400">Read our privacy policy</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </section>
      </div>
      
      <footer className="bg-gray-800 text-gray-400 py-4">
        <div className="max-w-5xl mx-auto text-center">
          <span>© 2024 Wave</span>
        </div>
      </footer>
    </div>
  );
};

export default Settings;