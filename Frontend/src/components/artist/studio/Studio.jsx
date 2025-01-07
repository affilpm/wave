import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Upload, Disc, BarChart, Settings, Plus, ArrowLeft, Users, PlayCircle, Clock } from 'lucide-react';
import MusicUpload from './MusicUpload';
import AlbumCreator from './AlbumCreator'; // Add this import at the top
import { useDispatch, useSelector } from 'react-redux';
import { openModal, closeModal } from '../../../slices/modalSlice'; // Import actions
import Modal from '../../modal';

const StudioCard = ({ children, className = '', onClick = () => {} }) => (
  <div 
    onClick={onClick}
    className={`bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition-all ${className}`}
  >
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value, color }) => (
  <StudioCard>
    <div className="p-6">
      <div className="flex items-center space-x-3">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
      </div>
    </div>
  </StudioCard>
);

const Studio = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isOpen, modalContent } = useSelector((state) => state.modal);

  const handleOpenModal = (content) => {
    dispatch(openModal(content));
  };

  const handleCloseModal = () => {
    dispatch(closeModal());
  };

  // Move renderModalContent here, before it's used
  const renderModalContent = () => {
    if (modalContent === 'musicUpload') {
      return <MusicUpload />;
    }
    if (modalContent === 'albumCreator') {
      return <AlbumCreator />;
    }
    return null;
  };

  const DashboardStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard 
        icon={Music} 
        label="Total Tracks" 
        value="24" 
        color="bg-blue-600"
      />
      <StatCard 
        icon={Disc} 
        label="Albums" 
        value="3" 
        color="bg-purple-600"
      />
      <StatCard 
        icon={PlayCircle} 
        label="Total Plays" 
        value="12.5K" 
        color="bg-green-600"
      />
      <StatCard 
        icon={Users} 
        label="Monthly Listeners" 
        value="5.2K" 
        color="bg-orange-600"
      />
    </div>
  );

  const UploadOptions = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <StudioCard
        className={`cursor-pointer transform hover:scale-[1.02] transition-all ${
          !isOpen ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => handleOpenModal('musicUpload')}
      >
        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="bg-blue-600/20 p-4 rounded-full mb-6">
              <Music className="h-12 w-12 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-white">Upload Music</h3>
            <p className="text-gray-400">Share your latest tracks with your audience</p>
          </div>
        </div>
      </StudioCard>

      <StudioCard
  className={`cursor-pointer transform hover:scale-[1.02] transition-all ${
    !isOpen ? 'ring-2 ring-blue-500' : ''
  }`}
  onClick={() => handleOpenModal('albumCreator')}
>
  <div className="p-8">
    <div className="flex flex-col items-center text-center">
      <div className="bg-purple-600/20 p-4 rounded-full mb-6">
        <Disc className="h-12 w-12 text-purple-500" />
      </div>
      <h3 className="text-xl font-semibold mb-3 text-white">Create Album</h3>
      <p className="text-gray-400">Bundle your tracks into a cohesive album</p>
    </div>
  </div>
</StudioCard>
    </div>
  );

  const RecentActivity = () => (
    <StudioCard className="mb-8">
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          {[1, 2, 3].map((_, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="bg-gray-700 p-3 rounded-lg">
                <Music className="h-6 w-6 text-gray-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">Summer Vibes</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <p className="text-sm text-gray-400">Uploaded 2 days ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">1.2K plays</span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StudioCard>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-20 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-8 space-y-8">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
        <img 
          src="/shape.png" 
          alt="Logo" 
          className="h-auto w-auto" 
        />      </div>
        
        {[
          { icon: BarChart, view: 'dashboard', label: 'Dashboard' },
          { icon: Upload, view: 'upload', label: 'Upload' },
          { icon: Settings, view: 'settings', label: 'Settings' }
        ].map(({ icon: Icon, view, label }) => (
          <button 
            key={view}
            className={`p-3 rounded-xl group relative ${
              activeView === view ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveView(view)}
          >
            <Icon className="h-6 w-6" />
            <span className="absolute left-full ml-4 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="ml-20 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => navigate('/home')} 
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </button>
            <h1 className="text-2xl font-bold text-white">Music Studio</h1>
            <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
              <Plus className="h-5 w-5" />
              <span>New Upload</span>
            </button>
          </div>

          {activeView === 'dashboard' && (
            <>
              <DashboardStats />
              <RecentActivity />
            </>
          )}

          {activeView === 'upload' && <UploadOptions />}

          {activeView === 'settings' && (
            <StudioCard>
              <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Studio Settings</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white">Automatic Upload Processing</span>
                    <button className="bg-blue-600/20 text-blue-400 px-4 py-1.5 rounded-full text-sm">
                      Enabled
                    </button>
                  </div>
                </div>
              </div>
            </StudioCard>
          )}
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={handleCloseModal}>
        {renderModalContent()}
      </Modal>
    </div>
  );
};

export default Studio;