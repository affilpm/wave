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
import GoogleAuth from './components/user/GoogleAuth';
import ProtectedRoute from './components/admin/ProtectedRoute';
import MusicUpload from './components/artist/studio/MusicUpload';
import StudioPage from './pages/artist/StudioPage';
import AlbumCreator from './components/artist/studio/AlbumCreator';
import EditAlbum from './components/artist/studio/EditAlbum';
import MultiStepRegister from './components/user/register/MultiStepRegister';
import LoginPage from './components/user/login/Login';
import Dashboard from './components/user/home/dashboard/Dashboard';
import PlaylistPage from './components/user/home/playlist/PlaylistPage'; 
import Premium from './components/user/home/header/Premium';
import MusicShowMorePage from './components/user/home/dashboard/MusicShowMorePage';

import { Navigate } from 'react-router-dom';
export const logout= () => {
  // Completely clear all data from localStorage
  localStorage.clear();
};


function App() {
  const { isAuthenticated } = useSelector((state) => state.user);

  
  return (
    <Router>
      <Routes>

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

        <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>

          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/studio" element={<StudioPage/>} />
          <Route path="/musicupload" element={<MusicUpload/>} />
          <Route path="/albumcreator" element={<AlbumCreator/>} />
          <Route path="/editalbum/:id" element={<EditAlbum/>} />
          <Route path="/premium" element={<Premium/>} />


          <Route path="/" element={<HomePage />}>
              <Route path="/home" element={<Dashboard/>} />
              <Route path="/playlist/:playlistId" element={<PlaylistPage/>} />
              <Route path="/music-show-more" element={<MusicShowMorePage/>} />





          </Route>
          <Route path="/" element={<Navigate to="/home" />} />

        </Route>


        {/* Account settings page */}
        


        <Route path="/adminlogin" element={<AdminLogin/>} /> 
        <Route path="/register" element={<MultiStepRegister/>} /> 



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