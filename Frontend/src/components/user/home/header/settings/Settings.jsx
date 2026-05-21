import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, User, Bell, Globe, Lock, Shield, Volume2, Download, Plus, Clock, Info, Music, Star, ArrowLeft, Sliders, CreditCard, Factory, AlertCircle, CheckCircle, Trash2, LogOut } from 'lucide-react';
import api, { handleLogout } from '../../../../../api';
import { USERS } from '../../../../../constants/apiEndpoints';
import { REFRESH_TOKEN } from '../../../../../constants/authConstants';
import CreatorStudio from './CreatorStudio';
import EqualizerControl from './EqualizerControl';

const Settings = () => {
  const navigate = useNavigate();
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [isCloseAccountModalOpen, setIsCloseAccountModalOpen] = useState(false);
  const [isClosingAccount, setIsClosingAccount] = useState(false);

  const handleCloseAccount = async () => {
    try {
      setIsClosingAccount(true);
      const refreshToken = localStorage.getItem(REFRESH_TOKEN);
      
      await api.post(USERS.CLOSE_ACCOUNT, {
        refresh_token: refreshToken
      });

      // Clear tokens and redirect to landing page
      await handleLogout({ skipApi: true });
    } catch (error) {
      console.error('Error closing account:', error);
      setQualityError('Failed to close account. Please try again later.');
      setIsCloseAccountModalOpen(false);
    } finally {
      setIsClosingAccount(false);
    }
  };
  
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
      const response = await api.get('/api/v1/music/user/quality-preference/');
      
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

      const response = await api.put('/api/v1/music/user/update-preference/', {
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
    <div className="flex-col">
      {/* Settings Header */}
      <div className="sticky top-0 bg-black/40 backdrop-blur-xl z-10 border-b border-gray-800/50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center">
            <button
              className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-800/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all mr-4 md:hidden"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
              <p className="text-sm text-gray-400 mt-0.5">Manage your account preferences</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 pb-20 space-y-10">
        
        {/* Account Settings */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
            <User className="h-5 w-5 text-blue-400" />
            Account
          </h2>
          <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden backdrop-blur-sm transition-all hover:border-gray-600/50">
            
            {/* Edit Profile */}
            <div 
              className="p-4 flex items-center justify-between hover:bg-gray-700/40 cursor-pointer transition-colors group"
              onClick={() => navigate('/profile')}
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-blue-300 transition-colors">Profile Information</div>
                  <div className="text-sm text-gray-400 mt-0.5">Update your personal details and public profile</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>

            <div className="border-t border-gray-700/50 ml-16"></div>

            <div className="border-t border-gray-700/50 ml-16"></div>

            {/* Close Account */}
            <div 
              className="p-4 flex items-center justify-between hover:bg-red-500/10 cursor-pointer transition-colors group"
              onClick={() => setIsCloseAccountModalOpen(true)}
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 group-hover:scale-110 transition-all duration-300">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-red-300 transition-colors">Close Account</div>
                  <div className="text-sm text-gray-400 mt-0.5">Permanently deactivate your account and delete your data</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>

            <div className="border-t border-gray-700/50 ml-16"></div>

            {/* Transactions Button */}
            <div 
              className="p-4 flex items-center justify-between hover:bg-gray-700/40 cursor-pointer transition-colors group"
              onClick={() => navigate('/transactions')}
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 group-hover:scale-110 transition-all duration-300">
                  <CreditCard className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-green-300 transition-colors">Transactions</div>
                  <div className="text-sm text-gray-400 mt-0.5">View your payment history and subscriptions</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </section>


        {/* Playback Settings */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
            <Volume2 className="h-5 w-5 text-orange-400" />
            Playback
            {isPremium && (
              <span className="ml-2 text-[10px] bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-2 py-0.5 rounded-full font-bold tracking-wider uppercase shadow-sm">
                PREMIUM
              </span>
            )}
          </h2>
          
          {/* Error/Success Messages */}
          {qualityError && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{qualityError}</span>
            </div>
          )}
          
          {qualitySuccess && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 animate-in fade-in slide-in-from-top-2">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{qualitySuccess}</span>
            </div>
          )}
          
          <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden backdrop-blur-sm transition-all hover:border-gray-600/50">
            {/* Streaming Quality Toggle */}
            <div
              className={`p-4 flex items-center justify-between hover:bg-gray-700/40 cursor-pointer transition-colors group ${
                isLoadingQuality ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={toggleQualityDropdown}
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20 group-hover:scale-110 transition-all duration-300">
                  <Music className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-orange-300 transition-colors">Streaming Quality</div>
                  <div className="text-sm text-gray-400 mt-0.5">
                    {isLoadingQuality ? 'Loading options...' : `Currently: ${getQualityLabel(selectedQuality)}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isUpdatingQuality ? (
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isQualityOpen && <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse mr-2 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>}
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${
                        isQualityOpen ? "rotate-180 text-white" : "group-hover:text-white"
                      }`}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Collapsible Quality Options */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isQualityOpen && !isLoadingQuality ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="border-t border-gray-700/50 p-4 bg-gray-800/60">
                <div className="space-y-2">
                  {allQualityOptions.map((quality) => {
                    const isPremiumQuality = quality.value !== 'low';
                    const isDisabled = isPremiumQuality && !isPremium;
                    const isSelected = selectedQuality === quality.value;
                    
                    return (
                      <div
                        key={quality.value}
                        className={`p-4 rounded-xl transition-all duration-200 flex items-center justify-between group relative ${
                          isSelected ? 'bg-orange-500/10 border border-orange-500/30 shadow-[inset_0_0_20px_rgba(249,115,22,0.05)]' : 'bg-gray-800/50 border border-transparent'
                        } ${
                          isDisabled 
                            ? 'cursor-not-allowed opacity-60' 
                            : 'hover:bg-gray-700/60 cursor-pointer hover:border-gray-600'
                        }`}
                        onClick={() => !isDisabled && handleQualitySelect(quality.value)}
                      >
                        <div className="flex-1">
                          <div className={`font-medium transition-colors flex items-center gap-2 ${
                            isDisabled 
                              ? 'text-gray-400' 
                              : isSelected 
                                ? 'text-white' 
                                : 'text-gray-200 group-hover:text-white'
                          }`}>
                            {quality.label}
                            {isPremiumQuality && !isPremium && (
                              <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" fill="currentColor" />
                            )}
                            {isSelected && (
                              <span className="text-[10px] uppercase font-bold tracking-wider bg-orange-500 text-white px-2 py-0.5 rounded-full ml-2 shadow-sm">
                                Active
                              </span>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${
                            isDisabled ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            {quality.description}
                            {isPremiumQuality && !isPremium && (
                              <span className="text-yellow-500/80 ml-1 font-medium">• Premium required</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Lock overlay for disabled options */}
                        {isDisabled && (
                          <div className="flex items-center justify-end">
                            <Lock className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                        
                        {/* Checkmark for selected option */}
                        {isSelected && (
                          <div className="flex items-center justify-end">
                            <CheckCircle className="h-5 w-5 text-orange-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Premium Upgrade Prompt for Free Users */}
                  {!isPremium && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                          <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
                        </div>
                        <div className="text-sm font-medium text-yellow-400">
                          Upgrade to Premium for high-quality streaming
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate('/premium')}
                        className="text-xs font-bold text-black bg-yellow-500 hover:bg-yellow-400 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                      >
                        Upgrade
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700/50"></div>

            {/* Equalizer Section */}
            <div
              className={`p-4 flex items-center justify-between transition-colors group ${
                !isPremium ? 'cursor-not-allowed opacity-80 bg-gray-800/20' : 'hover:bg-gray-700/40 cursor-pointer'
              }`}
              onClick={() => {
                if (!isPremium) {
                  setQualityError('The equalizer is a premium feature. Please upgrade to customize your audio settings.');
                  setTimeout(() => setQualityError(''), 5000);
                  return;
                }
                toggleEqualizer();
              }}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl transition-all duration-300 ${!isPremium ? 'bg-gray-700/50' : 'bg-pink-500/10 group-hover:bg-pink-500/20 group-hover:scale-110'}`}>
                  <Sliders className={`h-5 w-5 ${!isPremium ? 'text-gray-500' : 'text-pink-400'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`font-semibold transition-colors ${!isPremium ? 'text-gray-400' : 'text-white group-hover:text-pink-300'}`}>Equalizer</div>
                    {!isPremium && <Star className="h-3.5 w-3.5 text-yellow-500" fill="currentColor" />}
                  </div>
                  <div className="text-sm text-gray-400 mt-0.5">
                    {!isPremium ? 'Premium feature required' : 'Customize audio frequency settings'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isPremium ? (
                  <Lock className="h-4 w-4 text-gray-500" />
                ) : (
                  <>
                    {showEqualizer && <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse mr-2 shadow-[0_0_8px_rgba(236,72,153,0.6)]"></div>}
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${
                        showEqualizer ? "rotate-180 text-white" : "group-hover:text-white"
                      }`}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Collapsible Equalizer Component */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showEqualizer && isPremium ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="border-t border-gray-700/50 p-6 bg-gray-800/60">
                <EqualizerControl />
              </div>
            </div>
          </div>
        </section>

        {/* Creator Studio Component will inherit its own styling, but we might want to wrap it if needed. 
            Assuming CreatorStudio handles its own section wrapper. */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
          <CreatorStudio />
        </div>

        {/* About */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
          <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
            <Info className="h-5 w-5 text-teal-400" />
            About
          </h2>
          <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden backdrop-blur-sm transition-all hover:border-gray-600/50">
            <div className="p-4 flex items-center justify-between hover:bg-gray-700/40 cursor-pointer transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-teal-500/10 rounded-xl group-hover:bg-teal-500/20 group-hover:scale-110 transition-all duration-300">
                  <Info className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-teal-300 transition-colors">Version</div>
                  <div className="text-sm text-gray-400 mt-0.5">Wave Platform 1.0.0</div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-700/50 ml-16"></div>
            
            <div 
              className="p-4 flex items-center justify-between hover:bg-gray-700/40 cursor-pointer transition-colors group"
              onClick={() => navigate('/privacy-policy')}
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-300">
                  <Shield className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors">Privacy Policy</div>
                  <div className="text-sm text-gray-400 mt-0.5">Read our privacy and data policies</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            
            <div className="border-t border-gray-700/50 ml-16"></div>

            <div 
              className="p-4 flex items-center justify-between hover:bg-gray-700/40 cursor-pointer transition-colors group"
              onClick={() => navigate('/terms-of-service')}
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-yellow-500/10 rounded-xl group-hover:bg-yellow-500/20 group-hover:scale-110 transition-all duration-300">
                  <Star className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-yellow-300 transition-colors">Terms of Service</div>
                  <div className="text-sm text-gray-400 mt-0.5">Read our terms and conditions</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </section>
      </div>

      {/* Close Account Confirmation Modal */}
      {isCloseAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-red-500/10 rounded-full mb-6">
                <AlertCircle className="h-12 w-12 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Close your account?</h3>
              <p className="text-gray-400 mb-8">
                This action is permanent and cannot be undone. You will lose all your playlists, liked songs, and premium benefits.
              </p>
              
              <div className="flex flex-col w-full gap-3">
                <button
                  disabled={isClosingAccount}
                  onClick={handleCloseAccount}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClosingAccount ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5" />
                      Yes, Close My Account
                    </>
                  )}
                </button>
                <button
                  disabled={isClosingAccount}
                  onClick={() => setIsCloseAccountModalOpen(false)}
                  className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <footer className="border-t border-gray-800/80 bg-gray-900/50 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-2">Wave</div>
          <span className="text-sm text-gray-500">© 2024 Wave Audio Technologies. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default Settings;