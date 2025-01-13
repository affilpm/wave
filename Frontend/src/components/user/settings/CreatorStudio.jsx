import React, { useState, useEffect } from 'react';
import { Music, Star, Plus, Clock, Award, Edit2, Save,  X } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alerts';
import api from '../../../api';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer, toast } from 'react-toastify';

const VerificationStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const CreatorStudio = () => {
  const [bio, setBio] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [genres, setGenres] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBio, setCurrentBio] = useState('');
  const [currentGenres, setCurrentGenres] = useState([]);

  useEffect(() => {
    checkVerificationStatus();
    fetchGenres();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await api.get('/api/artists/verification_status/', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setVerificationStatus(response.data.status);
      setCurrentBio(response.data.bio || '');
      setCurrentGenres(response.data.genres || []);
    } catch (err) {
      console.error('Failed to fetch status:', err);
      toast.error('Failed to check verification status');
    }
  };

  const fetchGenres = async () => {
    try {
      const response = await api.get('/api/music/genres/');
      setGenres(response.data);
    } catch (err) {
      console.error('Failed to fetch genres:', err);
      toast.error('Failed to load music genres');
    }
  };

  const handleSubmit = async (isUpdate = false) => {
    const bioToSubmit = isUpdate ? currentBio : bio;
    const genresToSubmit = isUpdate ? currentGenres : selectedGenres;

    if (!bioToSubmit.trim()) {
      toast.warn('Please enter your bio');
      return;
    }
    
    if (genresToSubmit.length === 0) {
      toast.warn('Please select at least one genre');
      return;
    }

    const loadingToast = toast.loading(isUpdate ? 'Updating profile...' : 'Submitting verification request...');
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Access token not found');

      const endpoint = isUpdate ? '/api/artists/update_profile/' : '/api/artists/request_verification/';
      const response = await api.post(endpoint, 
        { bio: bioToSubmit, genres: genresToSubmit }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 200) {
        toast.update(loadingToast, {
          render: isUpdate ? 'Profile updated successfully!' : 'Verification request submitted successfully!',
          type: 'success',
          isLoading: false,
          autoClose: 3000
        });
        
        if (!isUpdate) {
          setBio('');
          setSelectedGenres([]);
        }
        setIsEditing(false);
        await checkVerificationStatus();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to submit request';
      toast.update(loadingToast, {
        render: errorMessage,
        type: 'error',
        isLoading: false,
        autoClose: 3000
      });
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEdit = verificationStatus === VerificationStatus.PENDING || 
                 verificationStatus === VerificationStatus.REJECTED;



  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to original values
    setCurrentBio(currentBio);
    setCurrentGenres(currentGenres);
  };

               

  const renderForm = (isEditMode = false) => (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Tell us about yourself
        </label>
        <textarea
          className="w-full bg-gray-700 text-white rounded-lg p-3 min-h-[100px]"
          placeholder="Share your musical background, achievements, and aspirations..."
          value={isEditMode ? currentBio : bio}
          onChange={(e) => isEditMode ? setCurrentBio(e.target.value) : setBio(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Select Genres
        </label>
        <select
          multiple
          className="w-full bg-gray-700 text-white rounded-lg p-3"
          value={isEditMode ? currentGenres : selectedGenres}
          onChange={(e) => {
            const selected = [...e.target.selectedOptions].map(option => option.value);
            isEditMode ? setCurrentGenres(selected) : setSelectedGenres(selected);
          }}
        >
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
      </div>

      {isEditMode ? (
        <div className="flex gap-3">
          <button
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            onClick={handleCancelEdit}
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
            Cancel
          </button>
          <button
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleSubmit(isEditMode)}
            disabled={isSubmitting || !currentBio.trim() || currentGenres.length === 0}
          >
            <Save className="h-5 w-5" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      ) : (
        <button
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleSubmit(isEditMode)}
          disabled={isSubmitting || !bio.trim() || selectedGenres.length === 0}
        >
          <Plus className="h-5 w-5" />
          {isSubmitting ? 'Submitting...' : 'Request Artist Verification'}
        </button>
      )}
    </>
  );

  // ... (rest of the component remains the same until the edit button section)

  {verificationStatus && canEdit && (
    <div className="mt-4">
      {!isEditing ? (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
        >
          <Edit2 className="h-4 w-4" />
          Edit Profile
        </button>
      ) : (
        renderForm(true)
      )}
    </div>
  )}



  const renderStatusBadge = () => {
    const statusStyles = {
      [VerificationStatus.PENDING]: 'bg-yellow-500',
      [VerificationStatus.APPROVED]: 'bg-green-500',
      [VerificationStatus.REJECTED]: 'bg-red-500'
    };

    return verificationStatus ? (
      <div className="flex items-center gap-2">
        {verificationStatus === VerificationStatus.APPROVED && (
          <div className="flex items-center gap-1 bg-blue-500 px-3 py-1 rounded-full">
            <Award className="h-4 w-4" />
            <span className="text-sm font-medium">Verified Artist</span>
          </div>
        )}
        <span className={`${statusStyles[verificationStatus]} px-3 py-1 rounded-full text-sm font-medium`}>
          {verificationStatus}
        </span>
      </div>
    ) : null;
  };

  return (
    <div>
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          {verificationStatus === VerificationStatus.APPROVED ? 'Artist Studio' : 'Creator Studio'}
        </h2>
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Music className="h-8 w-8 text-blue-400" />
                <div>
                  <div className="font-bold text-lg">
                    {verificationStatus === VerificationStatus.APPROVED ? 'Artist Dashboard' : 'Become an Artist'}
                  </div>
                  <div className="text-gray-400">
                    {verificationStatus === VerificationStatus.APPROVED 
                      ? 'Manage your music and connect with fans'
                      : 'Share your music with the world'}
                  </div>
                </div>
              </div>
              {renderStatusBadge()}
            </div>

            {!verificationStatus && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div>
                    <div className="font-semibold mb-1">Artist Benefits</div>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Upload and manage your music</li>
                      <li>• Access to artist analytics</li>
                      <li>• Customize your artist profile</li>
                      <li>• Connect with your audience</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {!verificationStatus && renderForm(false)}

            {verificationStatus && canEdit && (
              <div className="mt-4">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Request
                  </button>
                ) : (
                  renderForm(true)
                )}
              </div>
            )}
          </div>

          {verificationStatus && (
            <div className="p-4 bg-gray-700">
              <div className="flex items-center gap-4">
                {verificationStatus === VerificationStatus.APPROVED ? (
                  <Award className="h-6 w-6 text-blue-400" />
                ) : (
                  <Clock className="h-6 w-6 text-gray-400" />
                )}
                <div>
                  <div className="font-semibold">Current Status</div>
                  <div className="text-sm text-gray-400">
                    {verificationStatus === VerificationStatus.PENDING && 'Your request is being reviewed'}
                    {verificationStatus === VerificationStatus.APPROVED && 'Congratulations! You are now a verified artist'}
                    {verificationStatus === VerificationStatus.REJECTED && 'Your request was not approved'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      <ToastContainer />
    </div>
  );
};

export default CreatorStudio;