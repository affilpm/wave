import axios from 'axios';
// import { jwt_decode } from 'jwt-decode';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants/authConstants';
// import jwt_decode from 'jwt-decode';
import jwt_decode from 'jwt-decode';
const API_URL = import.meta.env.VITE_API_URL;

// const jwt_decode = require('jwt-decode');


const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

let refreshPromise = null;

// Helper function to check if the token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const decoded = jwt_decode(token);
    // Check if the token is expired
    return decoded.exp * 1000 <= Date.now();
  } catch (error) {
    console.error('Error decoding token:', error);
    return true;
  }
};

// Helper function to refresh the access token
const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_URL}/api/token/refresh/`, {
      refresh: refreshToken
    });

    const { access } = response.data;
    localStorage.setItem(ACCESS_TOKEN, access);
    adminapi.defaults.headers.common.Authorization = `Bearer ${access}`;
    return access;
  } catch (err) {
    console.error('Token refresh failed:', err);
    // Clear tokens if refresh fails
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    // Optionally, redirect to login page
    window.location.href = '/login';
    throw err;
  }
};

// Request interceptor to add Authorization header and handle token refresh
adminApi.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    
    if (token) {
      if (!isTokenExpired(token)) {
        config.headers.Authorization = `Bearer ${token.trim()}`;
      } else {
        try {
          if (!refreshPromise) {
            refreshPromise = refreshAccessToken();
          }
          const newToken = await refreshPromise;
          config.headers.Authorization = `Bearer ${newToken.trim()}`;
        } catch (error) {
          console.error('Token refresh failed:', error);
          throw error;
        } finally {
          refreshPromise = null;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to retry the request after refreshing the token
adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh if it's a 401 error, and the token is expired
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      isTokenExpired(localStorage.getItem(ACCESS_TOKEN))
    ) {
      originalRequest._retry = true;

      try {
        // Handle concurrent refresh requests
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken();
        }

        // Wait for the refresh to complete
        const newToken = await refreshPromise;
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Optionally, handle error (e.g., redirect to login)
        window.location.href = '/adminlogin';
        return Promise.reject(refreshError);
      } finally {
        refreshPromise = null;
      }
    }

    return Promise.reject(error);
  }
);

export default adminApi;