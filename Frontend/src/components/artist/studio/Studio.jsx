import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, BarChart, Upload, Settings, Music, Library } from 'lucide-react';
import DashboardStats from './DashboardStats';
import UploadOptions from './UploadOptions';
import RecentActivity from './RecentActivity';
import Modal from '../../modal';
import { useDispatch, useSelector } from 'react-redux';
import { openModal, closeModal } from '../../../slices/artist/modalSlice';
import MusicUpload from './music_uploader/MusicUpload';
import AlbumCreator from './AlbumCreator';
import MusicManagement from './MusicManagement';
import AlbumManagement from './AlbumManagement';

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

  const renderModalContent = () => {
    if (modalContent === 'musicUpload') {
      return <MusicUpload />;
    }
    if (modalContent === 'albumCreator') {
      return <AlbumCreator />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-20 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-8 space-y-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
          <img src="/shape.png" alt="Logo" className="h-auto w-auto" />
        </div>

        {[
          { icon: BarChart, view: 'dashboard', label: 'Dashboard' },
          { icon: Upload, view: 'upload', label: 'Upload' },
          { icon: Music, view: 'musicCrud', label: 'Music CRUD' },
          { icon: Library, view: 'albumManagement', label: 'Albums' }, // New Album Management Option
          { icon: Settings, view: 'settings', label: 'Settings' },
        ].map(({ icon: Icon, view, label }) => (
          <button
            key={view}
            className={`p-3 rounded-xl group relative ${
              activeView === view ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveView(view)}
          >
            <Icon className="h-6 w-6" />
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="ml-20 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header section remains the same */}
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

          {/* Content views */}
          {activeView === 'dashboard' && (
            <>
              <DashboardStats />
              <RecentActivity />
            </>
          )}

          {activeView === 'upload' && <UploadOptions />}

          {activeView === 'musicCrud' && <MusicManagement />}

          {activeView === 'albumManagement' && <AlbumManagement />} {/* New Album Management View */}

          {activeView === 'settings' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700">
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
            </div>
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