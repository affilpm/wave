import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import App from './App'; 
import './index.css';
import store, { persistor } from './store'; 
import { PersistGate } from 'redux-persist/integration/react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Global Network Interceptors for Uncaught 429 "Too Many Requests" ---
// This ensures that even if robust clients like hls.js swallow rate limit errors via aborts,
// the browser network layer still pushes a visible toast to the user.

const setupGlobalRateLimitCatch = () => {
  // 1. Intercept Fetch API
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    try {
      const response = await originalFetch.apply(this, args);
      if (response.status === 429) {
        toast.error("You are switching tracks too fast! Please wait a moment.", { toastId: 'rate-limit-global' });
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  // 2. Intercept XMLHttpRequests (Used by HLS.js)
  const originalXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', function () {
      if (this.status === 429) {
        toast.error("You are switching tracks too fast! Please wait a moment.", { toastId: 'rate-limit-global' });
      }
    });
    return originalXhrSend.apply(this, args);
  };
};

setupGlobalRateLimitCatch();


ReactDOM.createRoot(document.getElementById('root')).render(
    <Provider store={store}>
      <CssBaseline />
      <PersistGate loading={null} persistor={persistor}>
      <ToastContainer theme="dark" />
          <App />
      </PersistGate>
    </Provider>
);