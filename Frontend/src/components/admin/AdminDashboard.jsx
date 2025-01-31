import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import NavTabs from './NavTabs';
import UserTable from './UsersTable';
import ArtistVerification from './ArtistVerification';
import MusicVerification from './music_section/MusicVerification';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const navigate = useNavigate();

  // Get email from Redux state
  const {email} = useSelector((state) => state.admin);

  const handleLogout = () => {
    // Implement logout logic here
    navigate('/adminlogout');
  };

  return (
    <div className="bg-gray-900 min-h-screen">
      <AdminHeader email={email} onLogout={handleLogout} />
      <NavTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="max-w-9xl mx-auto px-6 py-6">
        {activeTab === 'users' && <UserTable />}
        {activeTab === 'artist-verification' && <ArtistVerification />}
        {activeTab === 'music-verification' && <MusicVerification />}
      </div>
    </div>
  );
};

export default AdminDashboard;