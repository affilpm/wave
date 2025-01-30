import React from 'react';
import { Music, Disc } from 'lucide-react';
import StudioCard from './StudioCard';
import MusicUpload from './music_uploader/MusicUpload';
import AlbumCreator from './AlbumCreator';
import { useDispatch, useSelector } from 'react-redux';
import { openModal } from '../../../slices/artist/modalSlice';

const UploadOptions = () => {
  const dispatch = useDispatch();
  const { isOpen } = useSelector((state) => state.modal);

  const handleOpenModal = (content) => {
    dispatch(openModal(content));
  };

  return (
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
};

export default UploadOptions;