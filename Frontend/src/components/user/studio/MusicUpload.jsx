import React, { useState } from 'react';
import { Music, Upload, Calendar, Video, Image as ImageIcon, X } from 'lucide-react';

const MusicUpload = () => {
  const [formData, setFormData] = useState({
    name: '',
    selectedGenres: [],
    releaseDate: '',
    description: ''
  });

  const [files, setFiles] = useState({
    audio: null,
    cover: null,
    video: null
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
    { id: 11, value: 'other', label: 'Other' }
  ];

  const handleGenreChange = (genreId) => {
    setFormData(prev => {
      const newSelectedGenres = prev.selectedGenres.includes(genreId)
        ? prev.selectedGenres.filter(id => id !== genreId)
        : [...prev.selectedGenres, genreId];

      return {
        ...prev,
        selectedGenres: newSelectedGenres
      };
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({
        ...prev,
        [type]: file
      }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const audioFile = Array.from(e.dataTransfer.files).find(file =>
      file.type.startsWith('audio/')
    );

    if (audioFile) {
      setFiles(prev => ({
        ...prev,
        audio: audioFile
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // First validate the files
    const validation = SongUploadService.validateFiles(files);
    if (!validation.isValid) {
      // Handle validation errors
      console.error('Validation errors:', validation.errors);
      return;
    }
    
    try {
      const result = await SongUploadService.uploadSong(formData, files);
      if (result.success) {
        // Handle successful upload
        console.log('Upload successful:', result.data);
        // Reset form or redirect
      } else {
        // Handle upload error
        console.error('Upload failed:', result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Upload New Track</h2>
        <p className="text-gray-600">Share your music with the world</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Audio Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${files.audio ? 'bg-green-50 border-green-500' : ''}`}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Track Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md bg-white text-black"
            placeholder="Enter track name"
          />
        </div>

        {/* Multiple Genre Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Genres (Select multiple)
          </label>
          <div className="mb-2">
            {formData.selectedGenres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.selectedGenres.map(genreId => {
                  const genre = genres.find(g => g.id === genreId);
                  return (
                    <span
                      key={genre.id}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      {genre.label}
                      <button
                        type="button"
                        onClick={() => handleGenreChange(genre.id)}
                        className="ml-2 hover:text-blue-900"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {genres.map(genre => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => handleGenreChange(genre.id)}
                  className={`p-2 rounded-md text-sm text-left transition-colors
                    ${formData.selectedGenres.includes(genre.id)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {genre.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Release Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Release Date
          </label>
          <input
    type="datetime-local"
    name="releaseDate"
    value={formData.releaseDate}
    onChange={handleInputChange}
    className="w-full p-2 border rounded-md bg-white"
          />
        </div>

        {/* Cover Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cover Photo
          </label>
          <div className="flex items-center space-x-4">
            <div className="w-32 h-32 border rounded-lg overflow-hidden">
              {files.cover ? (
                <img
                  src={URL.createObjectURL(files.cover)}
                  alt="Cover preview"
                  className="w-full h-full object-cover bg-black"
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

        {/* Video Upload (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Music Video(Optional)
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