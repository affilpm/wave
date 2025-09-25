import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, BarChart, Upload, Settings, Music, Library, Video, Menu, X } from 'lucide-react';
import DashboardStats from './DashboardStats';
import UploadOptions from './UploadOptions';
import RecentActivity from './RecentActivity';
import Modal from '../../Modal';
import { useDispatch, useSelector } from 'react-redux';
import { openModal, closeModal } from '../../../slices/artist/modalSlice';
import MusicUpload from './music_uploader/MusicUpload';
import AlbumCreator from './AlbumCreator';
import MusicManagement from './MusicManagement';
import AlbumManagement from './AlbumManagement';
import ArtistLiveStream from '../../livestream/ArtistLiveStream';

const Studio = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isOpen, modalContent } = useSelector((state) => state.modal);

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
      setIsLargeScreen(width >= 1024);
      
      // Auto-close sidebar on small screens
      if (width < 640) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Check on initial load
    checkScreenSize();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Define sidebar items in a single array for better maintainability
  const sidebarItems = [
    { icon: BarChart, view: 'dashboard', label: 'Dashboard' },
    { icon: Upload, view: 'upload', label: 'Upload' },
    { icon: Music, view: 'musicCrud', label: 'Music CRUD' },
    { icon: Library, view: 'albumManagement', label: 'Albums' },
    // { icon: Video, view: 'livestream', label: 'Livestream' },
    { icon: Settings, view: 'settings', label: 'Settings' },
  ];

  // Content mapping object that connects views to their respective components
  const contentComponents = {
    dashboard: (
      <>
        <DashboardStats />
        <RecentActivity />
      </>
    ),
    upload: <UploadOptions />,
    musicCrud: <MusicManagement />,
    albumManagement: <AlbumManagement />,
    // livestream: <ArtistLiveStream />,
    settings: (
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
    ),
  };

  const handleOpenModal = (content) => {
    dispatch(openModal(content));
  };

  const handleCloseModal = () => {
    dispatch(closeModal());
  };

  const handleSidebarItemClick = (view) => {
    setActiveView(view);
    // Close sidebar automatically when clicking on an item in mobile view
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const renderModalContent = () => {
    const modalComponents = {
      musicUpload: <MusicUpload />,
      albumCreator: <AlbumCreator />,
    };
    
    return modalComponents[modalContent] || null;
  };

  // Dynamic sidebar classes based on screen size and sidebar state
  const sidebarClasses = sidebarOpen 
    ? "fixed left-0 top-0 h-full bg-gray-800 border-r border-gray-700 flex flex-col z-20 transition-all duration-300 ease-in-out"
    : "fixed -left-full sm:left-0 top-0 h-full bg-gray-800 border-r border-gray-700 flex flex-col z-20 transition-all duration-300 ease-in-out";
  
  // Dynamically adjust sidebar width based on screen size
  let sidebarWidth;
  if (isMobile) {
    sidebarWidth = sidebarOpen ? "w-64" : "w-0";
  } else if (isTablet) {
    sidebarWidth = "w-20";
  } else if (isLargeScreen) {
    sidebarWidth = sidebarOpen ? "w-64" : "w-20";
  } else {
    sidebarWidth = "w-20";
  }
  
  // Dynamically calculate content margin
  const contentMargin = sidebarOpen 
    ? (isMobile ? "ml-0" : (isLargeScreen && sidebarOpen ? "ml-64" : "ml-20")) 
    : "ml-0";

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile menu toggle button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-30 sm:hidden bg-gray-800 p-2 rounded-lg text-white"
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar with scrolling */}
      <div className={`${sidebarClasses} ${sidebarWidth}`}>
        {/* Logo section at top of sidebar */}
        <div className="w-full flex justify-center py-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
            <img src="/shape.png" alt="Logo" className="h-auto w-auto" />
          </div>
        </div>

        {/* Scrollable sidebar content */}
        <div className="flex-1 w-full overflow-y-auto px-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {sidebarItems.map(({ icon: Icon, view, label }) => (
            <button
              key={view}
              className={`w-full p-3 rounded-xl group relative flex ${
                (isMobile || isLargeScreen) && sidebarOpen ? "justify-start items-center" : "justify-center"
              } ${
                activeView === view ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              } mb-4 transition-colors`}
              onClick={() => handleSidebarItemClick(view)}
              aria-label={label}
              title={label}
            >
              <Icon className="h-6 w-6 flex-shrink-0" />
              
              {/* Show labels in expanded views (mobile or large screens) */}
              {((isMobile || isLargeScreen) && sidebarOpen) && (
                <span className="ml-3 text-sm">{label}</span>
              )}
              
              {/* Show tooltip in tablet or collapsed desktop view */}
              {!((isMobile || isLargeScreen) && sidebarOpen) && (
                <span className="absolute left-full ml-2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                  {label}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Back to Home button at bottom */}
        <div className="w-full mt-auto py-4 px-3">
          <button
            onClick={() => navigate('/home')}
            className={`flex ${
              (isMobile || isLargeScreen) && sidebarOpen ? "flex-row items-center justify-start px-3 w-full" : "flex-col items-center justify-center w-full"
            } text-gray-400 hover:text-white transition-colors p-3`}
            title="Back to Home"
          >
            <ArrowLeft className="h-6 w-6" />
            <span className={`${(isMobile || isLargeScreen) && sidebarOpen ? "ml-3" : "mt-1"} text-xs`}>Home</span>
          </button>
        </div>
      </div>

      {/* Main Content with header inside content area (not fixed/sticky) */}
      <div className={`${contentMargin} transition-all duration-300 ease-in-out`}>
        {/* Header inside content area */}
        <div className="bg-gray-900 py-4 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Studio</h1>
        </div>
        
        {/* Content below header */}
        <div className="p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Dynamically render content based on activeView */}
            {contentComponents[activeView]}
          </div>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={handleCloseModal}>
        {renderModalContent()}
      </Modal>
    </div>
  );
};

export default Studio;