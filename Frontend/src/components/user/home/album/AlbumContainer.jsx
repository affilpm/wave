import React, { useState } from 'react';
import AlbumSection from '../dashboard/AlbumSection';
import AlbumPage from './AlbumPage';

const AlbumContainer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAlbum, setCurrentAlbum] = useState(null);

  const togglePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const setAlbum = (album) => {
    setCurrentAlbum(album);
  };

  return (
    <div>
      <AlbumSection
        isPlaying={isPlaying}
        togglePlayPause={togglePlayPause}
        currentAlbum={currentAlbum}
        setAlbum={setAlbum}
      />
      <AlbumPage
        isPlaying={isPlaying}
        togglePlayPause={togglePlayPause}
        currentAlbum={currentAlbum}
        setAlbum={setAlbum}
      />
    </div>
  );
};

export default AlbumContainer;