import React, { useState, useEffect } from 'react';
import { Music, Upload, Calendar, Video, Image as ImageIcon, X } from 'lucide-react';
// Ensure SongUploadService is imported correctly
// import SongUploadService from './services/SongUploadService';

const MusicUpload = () => {
  const [formData, setFormData] = useState({
    name: '',
    selectedGenres: [],
    releaseDate: '',
    description: '',
  });

  const [files, setFiles] = useState({
    audio: null,
    cover: null,
    video: null,
  });

  const [dragActive, setDragActive] = useState(false);

  const genres = [
    { id: 1, value: 'pop', label: 'Pop' },
    { id: 2, value: 'rock', label: 'Rock' },
    { id: 3, value: 'hip_hop', label: 'Hip-Hop' },
    { id: 4, value: 'jazz', label: 'Jazz' },
    { id: 5, value: 'classical', label: 'Classical' },
    { id: 6, value: 'electronic', label: 'Electronic' },
    { id: 7, value: 'reggae', label: 'Reggae' },
    { id: 8, value: 'r_and_b', label: 'R&B' },
    { id: 9, value: 'country', label: 'Country' },
    { id: 10, value: 'folk', label: 'Folk' },
    { id: 11, value: 'other', label: 'Other' },
  ];

  const handleGenreChange = (genreId) => {
    setFormData((prev) => {
      const newSelectedGenres = prev.selectedGenres.includes(genreId)
        ? prev.selectedGenres.filter((id) => id !== genreId)
        : [...prev.selectedGenres, genreId];
      return { ...prev, selectedGenres: newSelectedGenres };
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setFiles((prev) => ({ ...prev, [type]: file }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const audioFile = Array.from(e.dataTransfer.files).find((file) =>
      file.type.startsWith('audio/')
    );
    if (audioFile) {
      setFiles((prev) => ({ ...prev, audio: audioFile }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!files.audio || !files.cover || !formData.name || formData.selectedGenres.length === 0) {
      console.error('All required fields must be filled.');
      return;
    }

    try {
      const validation = SongUploadService.validateFiles(files);
      if (!validation.isValid) {
        console.error('Validation errors:', validation.errors);
        return;
      }

      const result = await SongUploadService.uploadSong(formData, files);
      if (result.success) {
        console.log('Upload successful:', result.data);
        // Reset form after successful upload
        setFormData({ name: '', selectedGenres: [], releaseDate: '', description: '' });
        setFiles({ audio: null, cover: null, video: null });
      } else {
        console.error('Upload failed:', result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const [modalSize, setModalSize] = useState('max-w-4xl'); // Default size

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setModalSize('max-w-full'); // Small screens
      } else if (window.innerWidth < 1024) {
        setModalSize('max-w-2xl'); // Medium screens
      } else {
        setModalSize('max-w-4xl'); // Large screens
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call to set the size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`bg-white shadow-lg rounded-lg w-full p-6 ${modalSize} overflow-auto`}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Upload New Track</h2>
        <p className="text-gray-600">Share your music with the world</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Audio Upload */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          } ${files.audio ? 'bg-green-50 border-green-500' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('audio-upload').click()}
        >
          <input
            id="audio-upload"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, 'audio')}
          />
          <Music className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {files.audio ? (
            <div className="text-green-600 font-medium">{files.audio.name}</div>
          ) : (
            <>
              <p className="text-lg mb-2">Drag and drop your audio file here</p>
              <p className="text-sm text-gray-500">or click to browse</p>
              <p className="text-xs text-gray-400 mt-2">Supported formats: MP3, WAV, AAC</p>
            </>
          )}
        </div>

        {/* Track Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Track Name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md bg-white text-black"
            placeholder="Enter track name"
          />
        </div>

        {/* Genre Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Genres (Select multiple)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {genres.map((genre) => (
              <button
                key={genre.id}
                type="button"
                onClick={() => handleGenreChange(genre.id)}
                className={`p-2 rounded-md text-sm text-left transition-colors ${
                  formData.selectedGenres.includes(genre.id)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {genre.label}
              </button>
            ))}
          </div>
        </div>

        {/* Release Date */}
        <div>
          <label htmlFor="releaseDate" className="block text-sm font-medium text-gray-700 mb-1">
            Release Date
          </label>
          <input
            id="releaseDate"
            type="datetime-local"
            name="releaseDate"
            value={formData.releaseDate}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md bg-white"
          />
        </div>

        {/* Cover Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cover Photo</label>
          <div className="flex items-center space-x-4">
            <div className="w-32 h-32 border rounded-lg overflow-hidden">
              {files.cover ? (
                <img
                  src={URL.createObjectURL(files.cover)}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'cover')}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                        file:rounded-full file:border-0 file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>

        {/* Video Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Music Video (Optional)
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleFileChange(e, 'video')}
            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                      file:rounded-full file:border-0 file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md 
                   hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          disabled={!files.audio || !files.cover || !formData.name || formData.selectedGenres.length === 0}
        >
          Upload Track
        </button>
      </form>
    </div>
  );
};

export default MusicUpload;