import React, { useState } from 'react';
import { Music, Disc, AlertCircle } from 'lucide-react';
import StudioCard from './StudioCard';
import { useDispatch, useSelector } from 'react-redux';
import { openModal } from '../../../slices/artist/modalSlice';
import axios from 'axios';
import api from '../../../api';


const UploadOptions = () => {
  const dispatch = useDispatch();
  const { isOpen } = useSelector((state) => state.modal);
  const [showAlert, setShowAlert] = useState(false);

  const handleOpenModal = async (content) => {
    if (content === 'musicUpload') {
      try {
        // Check if the artist has at least one album before opening the music upload modal
        const response = await api.get('/api/artists/has-albums/');
        
        if (response.data.has_albums) {
          // If albums exist, open the music upload modal
          dispatch(openModal(content));
        } else {
          // If no albums exist, show the alert
          setShowAlert(true);
          // Automatically hide the alert after 5 seconds
          setTimeout(() => setShowAlert(false), 5000);
        }
      } catch (error) {
        console.error('Error checking albums:', error);
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 5000);
      }
    } else {
      // For other modals (like albumCreator), open directly without checks
      dispatch(openModal(content));
    }
  };

  return (
    <>
      {showAlert && (
        <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500 text-amber-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
            <div>
              <h4 className="font-semibold">Album Required</h4>
              <p className="mt-1">You need to create at least one album before uploading music tracks.</p>
            </div>
          </div>
        </div>
      )}

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
            !isOpen ? 'ring-2 ring-purple-500' : ''
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
    </>
  );
};

export default UploadOptions;