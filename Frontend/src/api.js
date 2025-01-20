import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants/authConstants';

const API_URL = import.meta.env.VITE_API_URL;

class Api {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    this.refreshPromise = null;
    this.setupInterceptors();
  }

  isTokenExpired(token) {
    if (!token) return true;
    try {
      const decoded = jwt_decode(token);
      // Add 30-second buffer to prevent edge cases
      return (decoded.exp * 1000) - 30000 <= Date.now();
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  }

  async refreshAccessToken() {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      if (this.isTokenExpired(refreshToken)) {
        throw new Error('Refresh token has expired');
      }

      const response = await axios.post(`${API_URL}/api/token/refresh/`, {
        refresh: refreshToken
      });

      const { access, refresh } = response.data;
      
      // Store both new tokens if rotation is enabled
      localStorage.setItem(ACCESS_TOKEN, access);
      if (refresh) {
        localStorage.setItem(REFRESH_TOKEN, refresh);
      }
      
      this.api.defaults.headers.common.Authorization = `Bearer ${access}`;
      return access;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      throw error;
    }
  }

  logout() {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    localStorage.clear()
    delete this.api.defaults.headers.common.Authorization;
    // Implement your logout logic here (e.g., redirect)
    // window.location.href = '/login';
  }

  setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        
        if (!token) {
          return config;
        }

        if (!this.isTokenExpired(token)) {
          config.headers.Authorization = `Bearer ${token}`;
          return config;
        }

        try {
          if (!this.refreshPromise) {
            this.refreshPromise = this.refreshAccessToken();
          }
          
          const newToken = await this.refreshPromise;
          config.headers.Authorization = `Bearer ${newToken}`;
          return config;
        } catch (error) {
          this.logout();
          throw error;
        } finally {
          this.refreshPromise = null;
        }
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          this.isTokenExpired(localStorage.getItem(ACCESS_TOKEN))
        ) {
          originalRequest._retry = true;

          try {
            if (!this.refreshPromise) {
              this.refreshPromise = this.refreshAccessToken();
            }

            const newToken = await this.refreshPromise;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            this.logout();
            throw refreshError;
          } finally {
            this.refreshPromise = null;
          }
        }

        return Promise.reject(error);
      }
    );
  }
}

export const apiInstance = new Api();
export default apiInstance.api;