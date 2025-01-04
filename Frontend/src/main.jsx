import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google'; // Import GoogleOAuthProvider
// import store from './store'; // Assuming you have a Redux store
import App from './App'; // Your main app component
import './index.css';
import store, { persistor } from './store'; // Import store as default
import { PersistGate } from 'redux-persist/integration/react';

// Replace with your actual Google OAuth Client ID
// const clientId = "677574147888-pm58173p2vhha2nr8kffg1dslmg1v6ql.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CssBaseline />
    {/* Ensure the clientId is passed correctly */}
    {/* <GoogleOAuthProvider clientId={clientId}> */}
    <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <App />
    </PersistGate>
  </Provider>,
    {/* </GoogleOAuthProvider> */}
  </StrictMode>
);