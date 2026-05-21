import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import ErrorBoundary from './components/ErrorBoundary';
import PrivateRoute from './components/user/PrivateRoute';
import RedirectIfLoggedIn from './components/user/RedirectIfLoggedIn';
import ProtectedRoute from './components/admin/ProtectedRoute';
import ArtistRoute from './components/artist/ArtistRoute';

// -- Lazy-loaded components --

// Common 
const NotFound = lazy(() => import('./components/NotFound'));

// User Auth
const LandingPage = lazy(() => import('./components/user/LandingPage'));
const LoginPage = lazy(() => import('./components/user/login/Login'));
const Logout = lazy(() => import('./components/user/Logout'));
const MultiStepRegister = lazy(() => import('./components/user/register/MultiStepRegister'));

// User Home / Content
const HomePage = lazy(() => import('./pages/user/HomePage'));
const Main_Content = lazy(() => import('./components/user/home/main-content/Main_Content'));
const Premium = lazy(() => import('./components/user/home/header/Premium'));
const SettingsPage = lazy(() => import('./pages/user/SettingsPage'));
const TransactionHistory = lazy(() => import('./components/user/home/header/settings/TransactionHistory'));
const Profile = lazy(() => import('./components/user/home/header/profile/Profile'));
const YourPlaylistPage = lazy(() => import('./components/user/home/playlist/your-playlist-page/YourPlaylistPage'));
const SavedPlaylistPage = lazy(() => import('./components/user/home/playlist/playlist-page/SavedPlaylistPage'));
const MusicShowMorePage = lazy(() => import('./components/user/home/main-content/Music-section/MusicShowMorePage'));
const PlaylistShowMorePage = lazy(() => import('./components/user/home/main-content/Playlist-section/PlaylistShowMore'));
const AlbumShowMorePage = lazy(() => import('./components/user/home/main-content/Album-section/AlbumShowMore'));
const ArtistsShowMorePage = lazy(() => import('./components/user/home/main-content/Artist-section/ArtistsShowMorePage'));
const AlbumPage = lazy(() => import('./components/user/home/album/AlbumPage'));
const GenrePage = lazy(() => import('./components/user/home/main-content/Genre-section/GenrePage'));
const ArtistPage = lazy(() => import('./components/user/home/main-content/Artist-section/ArtistPage'));
const DiscoverPage = lazy(() => import('./pages/user/DiscoverPage'));
const PrivacyPolicy = lazy(() => import('./pages/user/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/user/TermsOfService'));

// Artist Studio
const StudioPage = lazy(() => import('./pages/artist/StudioPage'));
const MusicUpload = lazy(() => import('./components/artist/studio/music_uploader/MusicUpload'));
const AlbumCreator = lazy(() => import('./components/artist/studio/AlbumCreator'));
const EditAlbum = lazy(() => import('./components/artist/studio/EditAlbum'));
const MonetizationPage = lazy(() => import('./components/artist/studio/Monetization'));

// Admin
const AdminLogin = lazy(() => import('./components/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminLogout = lazy(() => import('./components/admin/AdminLogout'));

// Loading fallback UI
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-black">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
  </div>
);

function App() {
  const { isAuthenticated } = useSelector((state) => state.user);

  return (
    <Router>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="*" element={<NotFound />} />

            {/* Public Routes (Auth) */}
            <Route 
              path="/landingpage" 
              element={
                <RedirectIfLoggedIn isAuthenticated={isAuthenticated}>
                  <LandingPage />
                </RedirectIfLoggedIn>
              } 
            />
            <Route
              path="/login"
              element={
                <RedirectIfLoggedIn isAuthenticated={isAuthenticated}>
                  <LoginPage />
                </RedirectIfLoggedIn>
              }
            />
            <Route path="/register" element={<MultiStepRegister />} />
            <Route path="/logout" element={<Logout />} />

            {/* Protected User Routes */}
            <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
              <Route path="/premium" element={<Premium />} />
              
              <Route path="/" element={<HomePage />}>
                <Route index element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<Main_Content />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/playlist/:playlistId" element={<YourPlaylistPage />} />
                <Route path="/saved-playlist/:playlistId" element={<SavedPlaylistPage />} />
                <Route path="/music-show-more" element={<MusicShowMorePage />} />
                <Route path="/playlist-show-more" element={<PlaylistShowMorePage />} />
                <Route path="/albums-show-more" element={<AlbumShowMorePage />} />
                <Route path="/artists-show-more" element={<ArtistsShowMorePage />} />
                <Route path="/album/:albumId" element={<AlbumPage />} />
                <Route path="/genres/:genreId" element={<GenrePage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/monetization" element={<MonetizationPage />} />
                <Route path="/artist/:artistId" element={<ArtistPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/transactions" element={<TransactionHistory />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
              </Route>

              {/* Protected Artist Studio Routes */}
              <Route element={<ArtistRoute />}>
                <Route path="/studio" element={<StudioPage />} />
                <Route path="/musicupload" element={<MusicUpload />} />
                <Route path="/albumcreator" element={<AlbumCreator />} />
                <Route path="/editalbum/:id" element={<EditAlbum />} />
              </Route>
            </Route>

            {/* Admin Routes */}
            <Route path="/adminlogin" element={<AdminLogin />} />
            <Route path="/adminlogout" element={<AdminLogout />} />
            <Route 
              path="/admindashboard" 
              element={
                <ProtectedRoute> 
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;