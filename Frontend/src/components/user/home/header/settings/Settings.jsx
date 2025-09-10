import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, User, Bell, Globe, Lock, Shield, Volume2, Download, Plus, Clock, Info, Music, Star, ArrowLeft, Sliders, CreditCard, Factory, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../../../../api';
import CreatorStudio from './CreatorStudio';
import EqualizerControl from '../../main-content/music-player/Equalizer';

const Settings = () => {
  const navigate = useNavigate();
  const [showEqualizer, setShowEqualizer] = useState(false);
  
  const [selectedQuality, setSelectedQuality] = useState('low');
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [isLoadingQuality, setIsLoadingQuality] = useState(true);
  const [isUpdatingQuality, setIsUpdatingQuality] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [qualityError, setQualityError] = useState('');
  const [qualitySuccess, setQualitySuccess] = useState('');


  const allQualityOptions =  [
    { value: "low", label: "Low (96 kbps)", description: "Data-friendly streaming" },
    { value: "medium", label: "Medium (160 kbps)", description: "Good quality for most users" },
    { value: "high", label: "High (320 kbps)", description: "Best quality for premium users" },
    { value: "lossless", label: "Lossless (FLAC)", description: "Studio quality audio" },
  ];

  // Load quality options on component mount
  useEffect(() => {
    fetchQualityOptions();
  }, []);

  const fetchQualityOptions = async () => {
    try {
      setIsLoadingQuality(true);
      const response = await api.get('api/music/user/quality-preference/');
      
      setSelectedQuality(response.data.current_quality);
      setIsPremium(response.data.is_premium);
      setQualityError('');
    } catch (error) {
      console.error('Error fetching quality options:', error);
      setQualityError('Failed to load quality options. Please try again.');
    } finally {
      setIsLoadingQuality(false);
    }
  };

  const handleQualitySelect = async (qualityValue) => {
    // Prevent API request if selecting the same quality
    if (qualityValue === selectedQuality) {
      setIsQualityOpen(false);
      return;
    }

    if (isUpdatingQuality) return;

    try {
      setIsUpdatingQuality(true);
      setQualityError('');
      setQualitySuccess('');

      const response = await api.put('api/music/user/update-preference/', {
        preferred_quality: qualityValue
      });

      setSelectedQuality(qualityValue);
      setIsQualityOpen(false);
      setQualitySuccess('Quality preference updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setQualitySuccess(''), 3000);
      
    } catch (error) {
      console.error('Error updating quality:', error);
      
      if (error.response?.status === 403) {
        setQualityError('Premium subscription required for higher quality options. Please upgrade to access better audio quality.');
      } else if (error.response?.data?.error) {
        setQualityError(error.response.data.error);
      } else {
        setQualityError('Failed to update quality preference. Please try again.');
      }
      
      // Clear error message after 5 seconds
      setTimeout(() => setQualityError(''), 5000);
    } finally {
      setIsUpdatingQuality(false);
    }
  };

  const toggleQualityDropdown = () => {
    if (!isLoadingQuality) {
      setIsQualityOpen(!isQualityOpen);
    }
  };

  const getQualityLabel = (value) => {
    const option = allQualityOptions.find(q => q.value === value);
    return option?.label || value;
  };

  const getQualityDescription = (value) => {
    const option = allQualityOptions.find(q => q.value === value);
    return option?.description || "Audio quality option";
  };

  const handleSelect = (value) => {
    handleQualitySelect(value);
  };

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
            
            {/* Transactions Button */}
            <div 
              className="p-4 flex items-center justify-between hover:bg-gray-700 cursor-pointer"
              onClick={() => navigate('/transactions')}
            >
              <div className="flex items-center gap-4">
                <CreditCard className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-semibold">Transactions</div>
                  <div className="text-sm text-gray-400">View your payment history</div>
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

        {/* Playback Settings */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            Playback
            {isPremium && (
              <span className="text-xs bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-2 py-1 rounded-full font-semibold">
                PREMIUM
              </span>
            )}
          </h2>
          
          {/* Error/Success Messages */}
          {qualityError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2 text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{qualityError}</span>
            </div>
          )}
          
          {qualitySuccess && (
            <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg flex items-center gap-2 text-green-300">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{qualitySuccess}</span>
            </div>
          )}
          
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            {/* Streaming Quality Toggle */}
            <div
              className={`p-4 flex items-center justify-between hover:bg-gray-700 cursor-pointer transition-colors ${
                isLoadingQuality ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={toggleQualityDropdown}
            >
              <div className="flex items-center gap-4">
                <Music className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-semibold">Streaming Quality</div>
                  <div className="text-sm text-gray-400">
                    {isLoadingQuality ? 'Loading options...' : `Currently: ${getQualityLabel(selectedQuality)}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isUpdatingQuality ? (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isQualityOpen && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                    <ChevronRight
                      className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                        isQualityOpen ? "rotate-90" : ""
                      }`}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Collapsible Quality Options */}
            {isQualityOpen && !isLoadingQuality && (
              <div className="border-t border-gray-700 p-4 bg-gray-750 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  {allQualityOptions.map((quality) => {
                    const isPremiumQuality = quality.value !== 'low';
                    const isDisabled = isPremiumQuality && !isPremium;
                    const isSelected = selectedQuality === quality.value;
                    
                    return (
                      <div
                        key={quality.value}
                        className={`p-3 rounded-lg transition-colors flex items-start justify-between group relative ${
                          isSelected ? 'bg-gray-600 border-l-4 border-l-blue-500' : 'bg-gray-800'
                        } ${
                          isDisabled 
                            ? 'cursor-not-allowed opacity-60' 
                            : 'hover:bg-gray-600 cursor-pointer'
                        }`}
                        onClick={() => !isDisabled && handleQualitySelect(quality.value)}
                      >
                        <div className="flex-1">
                          <div className={`font-medium transition-colors flex items-center gap-2 ${
                            isDisabled 
                              ? 'text-gray-400' 
                              : isSelected 
                                ? 'text-white' 
                                : 'text-white group-hover:text-blue-400'
                          }`}>
                            {quality.label}
                            {isPremiumQuality && !isPremium && (
                              <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                            )}
                            {isSelected && (
                              <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full ml-2">
                                Current
                              </span>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${
                            isDisabled ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            {quality.description}
                            {isPremiumQuality && !isPremium && (
                              <span className="text-yellow-500 ml-1">• Premium required</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Lock overlay for disabled options */}
                        {isDisabled && (
                          <div className="flex items-center justify-end">
                            <Lock className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Premium Upgrade Prompt for Free Users */}
                  {!isPremium && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 rounded-lg">
                      <div className="text-xs text-yellow-300 text-center">
                        <Star className="h-3 w-3 inline mr-1" />
                        Upgrade to Premium for high-quality streaming options
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-gray-700"></div>

            {/* Equalizer Section */}
            <div
              className="p-4 flex items-center justify-between hover:bg-gray-700 cursor-pointer transition-colors"
              onClick={toggleEqualizer}
            >
              <div className="flex items-center gap-4">
                <Sliders className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-semibold">Equalizer</div>
                  <div className="text-sm text-gray-400">Customize audio frequency settings</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showEqualizer && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                <ChevronRight
                  className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                    showEqualizer ? "rotate-90" : ""
                  }`}
                />
              </div>
            </div>

            {/* Collapsible Equalizer Component */}
            {showEqualizer && (
              <div className="border-t border-gray-700 p-4 bg-gray-750 animate-in slide-in-from-top-2 duration-300">
                <EqualizerControl />
              </div>
            )}
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