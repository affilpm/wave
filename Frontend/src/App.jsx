import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/user/HomePage';
import LandingPage from './components/user/LandingPage';
import Logout from './components/user/Logout';
import SettingsPage from './pages/user/SettingsPage';
import PrivateRoute from './components/user/PrivateRoute';
import RedirectIfLoggedIn from './components/user/RedirectIfLoggedIn';
import { useSelector } from 'react-redux';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminLogout from './components/admin/AdminLogout';
import ProtectedRoute from './components/admin/ProtectedRoute';
import MusicUpload from './components/artist/studio/music_uploader/MusicUpload';
import StudioPage from './pages/artist/StudioPage';
import AlbumCreator from './components/artist/studio/AlbumCreator';
import EditAlbum from './components/artist/studio/EditAlbum';
import MultiStepRegister from './components/user/register/MultiStepRegister';
import LoginPage from './components/user/login/Login';
import Main_Content from './components/user/home/main-content/Main_Content';
import YourPlaylistPage from './components/user/home/playlist/your-playlist-page/YourPlaylistPage'; 
import Premium from './components/user/home/header/Premium';
import MusicShowMorePage from './components/user/home/main-content/Music-section/MusicShowMorePage';
import SavedPlaylistPage from './components/user/home/playlist/playlist-page/SavedPlaylistPage';
import { Navigate } from 'react-router-dom';
import AlbumPage from './components/user/home/album/AlbumPage';
import UsernameSelectionPage from './components/user/register/UsernameSelectionPage';
import GenrePage from './components/user/home/main-content/Genre-section/GenrePage';
import Profile from './components/user/home/header/profile/Profile';
import MonetizationPage from './components/artist/studio/Monetization';
// import { apiInstance } from './api';
// import { musicStreamService } from './services/user/musicService';
import PlaylistShowMorePage from './components/user/home/main-content/Playlist-section/PlaylistShowMore';
import AlbumShowMorePage from './components/user/home/main-content/Album-section/AlbumShowMore';
import ArtistPage from './components/user/home/main-content/Artist-section/ArtistPage';
// import LivestreamApp from './components/live';
import EqualizerControl from './components/user/home/main-content/music-player/Equalizer';
import { useDispatch } from 'react-redux';
import { handlePageReload } from './slices/user/musicPlayerSlice';
// import LivestreamViewerApp from './components/live';
import StreamListingPage from './components/livestream/LiveStreamViewerApp';
import TransactionHistory from './components/user/home/header/settings/TransactionHistory';
import ArtistsShowMorePage from './components/user/home/main-content/Artist-section/ArtistsShowMorePage';
import NotFound from './components/NotFound';
// import VideoStreamingPage from './components/livestream/testing/VideoStreamingPage';
// import StreamsList from './components/livestream/testing/list';
// import LiveStreamPage from './components/livestream/testing/fdf';
import ArtistRoute from './components/artist/ArtistRoute';


// export const logout= () => {
//   // Completely clear all data from localStorage
//   localStorage.clear();
// };


function App() {
  const { isAuthenticated } = useSelector((state) => state.user);
  // musicStreamService.setApiInstance(apiInstance);
  const dispatch = useDispatch();
  useEffect(() => {
    
    dispatch(handlePageReload());
  }, [dispatch]);
  return (
    <Router>
      <Routes>

        <Route path="*" element={<NotFound />} />

        <Route path="/landingpage" element={
            <RedirectIfLoggedIn isAuthenticated={isAuthenticated}>
              <LandingPage />
            </RedirectIfLoggedIn>
          } />



        <Route
          path="/login"
          element={
            <RedirectIfLoggedIn isAuthenticated={isAuthenticated}>
              <LoginPage/>
            </RedirectIfLoggedIn>
          }
        />

        <Route path="/logout" element={<Logout/>} />



        <Route path="/register" element={<MultiStepRegister/>} />



        <Route path="select-username" element={<UsernameSelectionPage/>} />





         {/* <Route path="/stream/:streamId" element={<VideoStreamingPage/>} /> */}



         {/* <Route path="/streams" element={<StreamsList/>} />
         <Route path="/streams/:streamId" element={<LiveStreamPage/>} /> */}
         {/* <Route path="/stream/:streamId" element={<VideoStreamingPage/>} /> */}





        <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>

          <Route path="/premium" element={<Premium/>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/transactions" element={<TransactionHistory />} />
          <Route path="/livestreams" element={<StreamListingPage/>} />

          <Route path="/" element={<HomePage />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<Main_Content />} />
              <Route path="/playlist/:playlistId" element={<YourPlaylistPage/>} />
              <Route path="/saved-playlist/:playlistId" element={<SavedPlaylistPage />} />
              <Route path="/music-show-more" element={<MusicShowMorePage/>} />
              <Route path="/album/:albumId" element={<AlbumPage/>} />
              <Route path="/genres/:genreId" element={<GenrePage/>} />
              <Route path="/profile" element={<Profile/>} />
              <Route path="/monetization" element={<MonetizationPage/>} />
              <Route path="/playlist-show-more" element={<PlaylistShowMorePage/>} />
              <Route path="/albums-show-more" element={<AlbumShowMorePage/>} />
              <Route path="/artist/:artistId" element={<ArtistPage />} />
              <Route path="/artists-show-more" element={<ArtistsShowMorePage/>} />


              {/* <LivestreamViewerApp/> */}
          </Route>

          <Route element={<ArtistRoute />}>

            <Route path="/studio" element={<StudioPage/>} />
            <Route path="/musicupload" element={<MusicUpload/>} />
            <Route path="/albumcreator" element={<AlbumCreator/>} />
            <Route path="/editalbum/:id" element={<EditAlbum/>} />

          </Route>




        </Route>








        {/* Admin side */}
        


        <Route path="/adminlogin" element={<AdminLogin/>} /> 
         



        <Route path="/admindashboard" element={
                  <ProtectedRoute> 
                    <AdminDashboard />
                  </ProtectedRoute>
        }/>


        <Route path="/adminlogout" element={<AdminLogout/>} />


      </Routes>
    </Router>
  );
}

export default App;