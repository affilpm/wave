import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, User, Bell, Globe, Lock, Shield, Volume2, Download, Plus, Clock, Info, Music, Star, ArrowLeft, Sliders } from 'lucide-react';
import api from '../../../../../api';
import CreatorStudio from './CreatorStudio';
import EqualizerControl from '../../main-content/music-player/Equalizer';

const Settings = () => {
  const navigate = useNavigate();
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEqualizer, setShowEqualizer] = useState(false); // State to control equalizer visibility


  // Toggle equalizer visibility
  const toggleEqualizer = () => {
    setShowEqualizer(!showEqualizer);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex-col">
      {/* Settings Header */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center">
          <button
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => navigate('/home')}
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

        {/* Playback - Now includes Equalizer */}
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
            
            {/* Equalizer section header - clicking toggles the equalizer visibility */}
            <div 
              className="p-4 flex items-center justify-between hover:bg-gray-700 cursor-pointer"
              onClick={toggleEqualizer}
            >
              <div className="flex items-center gap-4">
                <Sliders className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-semibold">Equalizer</div>
                  <div className="text-sm text-gray-400">Customize audio frequency settings</div>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${showEqualizer ? 'rotate-90' : ''}`} />
            </div>
            
            {/* Collapsible Equalizer Component */}
            {showEqualizer && (
              <div className="border-t border-gray-700 p-4 bg-gray-800">
                <EqualizerControl />
              </div>
            )}
            
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
        <CreatorStudio />

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