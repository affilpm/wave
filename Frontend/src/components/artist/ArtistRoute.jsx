import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useArtistStatus } from '../../hooks/useArtistStatus';

const ArtistRoute = () => {
  const { isAuthenticated } = useSelector((state) => state.user);
  const { isArtist, isLoading } = useArtistStatus();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <div>Loading...</div>; 
  }

  return isArtist ? <Outlet /> : <Navigate to="/" replace />;
};

export default ArtistRoute;