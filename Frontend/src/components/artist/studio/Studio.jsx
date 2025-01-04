import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Upload, Disc, BarChart, Settings, Plus, ArrowLeft } from 'lucide-react';
import MusicUpload from './MusicUpload';
import { XCircle } from 'lucide-react'; 
import Modal from '../../modal';


const StudioCard = ({ children, className = '', onClick = () => {} }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
  >
    {children}
  </div>
);

const Studio = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [isAlbumUpload, setIsAlbumUpload] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const navigate = useNavigate(); 

  const handleOpenModal = (content) => {
    setModalContent(content);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
  };

  const DashboardStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <StudioCard>
        <div className="p-6">
          <div className="flex items-center space-x-2">
            <Music className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-gray-500">Total Tracks</span>
          </div>
          <p className="text-2xl font-bold mt-2">24</p>
        </div>
      </StudioCard>
      
      <StudioCard>
        <div className="p-6">
          <div className="flex items-center space-x-2">
            <Disc className="h-5 w-5 text-purple-500" />
            <span className="text-sm text-gray-500">Albums</span>
          </div>
          <p className="text-2xl font-bold mt-2">3</p>
        </div>
      </StudioCard>
      
      <StudioCard>
        <div className="p-6">
          <div className="flex items-center space-x-2">
            <BarChart className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-500">Total Plays</span>
          </div>
          <p className="text-2xl font-bold mt-2">12.5K</p>
        </div>
      </StudioCard>
    </div>
  );

  const UploadOptions = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Studio Card */}
      <StudioCard
        className={`cursor-pointer transition-all ${!isModalOpen ? 'ring-2 ring-blue-500' : ''}`}
        onClick={() => handleOpenModal(<MusicUpload />)} // Open modal with MusicUpload component
      >
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <Music className="h-12 w-12 text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upload Music</h3>
            <p className="text-sm text-gray-500">Upload individual tracks one at a time</p>
          </div>
        </div>
      </StudioCard>

      {/* Create Album Card */}
      <StudioCard 
        className={`cursor-pointer transition-all`}
        onClick={() => {
          navigate('/upload/album'); // Navigate to create album page
        }}
      >
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <Disc className="h-12 w-12 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Create Album</h3>
            <p className="text-sm text-gray-500">Group multiple tracks as an album</p>
          </div>
        </div>
      </StudioCard>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-16 bg-white border-r flex flex-col items-center py-6 space-y-6">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
          <Music className="h-6 w-6 text-white" />
        </div>
        <button 
          className={`p-3 rounded-xl ${activeView === 'dashboard' ? 'bg-blue-50 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveView('dashboard')}
        >
          <BarChart className="h-6 w-6" />
        </button>
        <button 
          className={`p-3 rounded-xl ${activeView === 'upload' ? 'bg-blue-50 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveView('upload')}
        >
          <Upload className="h-6 w-6" />
        </button>
        <button 
          className={`p-3 rounded-xl ${activeView === 'settings' ? 'bg-blue-50 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveView('settings')}
        >
          <Settings className="h-6 w-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="ml-16 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => navigate('/home')} 
              className="flex items-center space-x-2 text-blue-500 hover:text-blue-700"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </button>
            <h1 className="text-2xl font-bold">Music Studio</h1>
            <button className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
              <Plus className="h-5 w-5" />
              <span>New Upload</span>
            </button>
          </div>


          {activeView === 'dashboard' && (
            <>
              <DashboardStats />
              <StudioCard>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Uploads</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Recent uploads list would go here */}
                    <div className="flex items-center space-x-4">
                      <Music className="h-8 w-8 text-gray-400" />
                      <div>
                        <h4 className="font-medium">Summer Vibes</h4>
                        <p className="text-sm text-gray-500">Uploaded 2 days ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </StudioCard>
            </>
          )}

          {activeView === 'upload' && (
            <>
              <UploadOptions />
              {/* Upload form would go here */}
            </>
          )}

          {activeView === 'settings' && (
            <StudioCard>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Studio Settings</h3>
              </div>
              <div className="p-6">
                {/* Settings content would go here */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Automatic Upload Processing</span>
                    <button className="bg-blue-100 text-blue-500 px-3 py-1 rounded-full text-sm">
                      Enabled
                    </button>
                  </div>
                </div>
              </div>
            </StudioCard>
          )}
        </div>
        </div>

{/* Modal Component */}
<Modal isOpen={isModalOpen} onClose={handleCloseModal}>
  {modalContent}
</Modal>
</div>
  );
};

export default Studio;