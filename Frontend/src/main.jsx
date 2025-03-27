import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import App from './App'; 
import './index.css';
import store, { persistor } from './store'; 
import { PersistGate } from 'redux-persist/integration/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <Provider store={store}>
      <CssBaseline />
      <PersistGate loading={null} persistor={persistor}>
      <ToastContainer theme="dark" />
          <App />
      </PersistGate>
    </Provider>
);