import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { persistor } from './store';
// Constants
const TOKEN_BUFFER_TIME = 30000; // 30 seconds in milliseconds
const UNAUTHORIZED = 401;

export class api {
  constructor(config) {
    this.config = {
      baseURL: 'http://13.49.227.70:8000',
      accessTokenKey: config.accessTokenKey || 'access_token',
      refreshTokenKey: config.refreshTokenKey || 'refresh_token',
      onLogout: config.onLogout || (() => {}),
      tokenType: config.tokenType || 'Bearer'
    };

    this.refreshPromise = null;
    this.api = this.setupAxiosInstance();
  }
  async getUserProfile() {
    try {
      const response = await this.api.get('/api/users/user/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw error;
    }
  }
  setupAxiosInstance() {
    const instance = axios.create({
      baseURL: this.config.baseURL,
      headers: { 'Content-Type': 'application/json' }
    });

    instance.interceptors.request.use(
      (config) => this.handleRequestInterceptor(config), 
      (error) => this.handleRequestError(error)
    );

    instance.interceptors.response.use(
      (response) => response,
      (error) => this.handleResponseError(error) 
    );

    return instance;
  }

  getToken(key) {
    return localStorage.getItem(this.config[key]);
  }

  setToken(key, value) {
    if (value) {
      localStorage.setItem(this.config[key], value);
    } else {
      localStorage.removeItem(this.config[key]);
    }
  }

  isTokenExpired(token) {
    if (!token) return true;

    try {
      const decoded = jwt_decode(token);
      return (decoded.exp * 1000) - TOKEN_BUFFER_TIME <= Date.now();
    } catch (error) {
      console.error('Token decode error:', error);
      return true;
    }
  }

  async refreshAccessToken() {
    try {
      const refreshToken = this.getToken('refreshTokenKey');

      if (!refreshToken || this.isTokenExpired(refreshToken)) {
        console.error("Refresh token expired. Logging out.");
        this.handleLogout();
        throw new Error('Invalid or expired refresh token');
      }

      const response = await axios.post(`${this.config.baseURL}/api/users/token/refresh/`, {
        refresh: refreshToken
      });

      const { access, refresh } = response.data;

      this.setToken('accessTokenKey', access);
      if (refresh) {
        this.setToken('refreshTokenKey', refresh);
      }

      const event = new CustomEvent('tokenRefreshed', { detail: { newToken: access } });
      window.dispatchEvent(event);
    
      return access;
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.handleLogout();
      throw error;
    }
  }

  async handleRequestInterceptor(config) {
    const token = this.getToken('accessTokenKey');

    if (!token) return config;

    if (!this.isTokenExpired(token)) {
      config.headers.Authorization = `${this.config.tokenType} ${token}`;
      return config;
    }

    try {
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshAccessToken();
      }

      const newToken = await this.refreshPromise;
      config.headers.Authorization = `${this.config.tokenType} ${newToken}`;
      return config;
    } catch (error) {
      console.error('Token refresh failed in request interceptor:', error);
      this.handleLogout();
      throw error;
    } finally {
      this.refreshPromise = null;
    }
  }

  async handleResponseError(error) {
    const originalRequest = error.config;

    if (!error.response) {
      return Promise.reject(error);
    }

    if (
      error.response.status === UNAUTHORIZED &&
      !originalRequest._retry &&
      this.isTokenExpired(this.getToken('accessTokenKey'))
    ) {
      originalRequest._retry = true;

      try {
        if (!this.refreshPromise) {
          this.refreshPromise = this.refreshAccessToken();
        }

        const newToken = await this.refreshPromise;
        originalRequest.headers.Authorization = `${this.config.tokenType} ${newToken}`;
        return this.api(originalRequest);
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError);
        this.handleLogout();
        return Promise.reject(refreshError);
      } finally {
        this.refreshPromise = null;
      }
    }

    return Promise.reject(error);
  }


  handleLogout = async () => {
  try {
      const refreshToken = this.getToken('refreshTokenKey');
      const accessToken = this.getToken('accessTokenKey');
      
      // Attempt to notify server
      if (refreshToken) {
          await this.api.post('/api/users/logout/', {
              refresh_token: refreshToken
          }, {
              headers: {
                  Authorization: `Bearer ${accessToken}`
              }
          });
      }
  } catch (error) {
      console.error('Error during logout:', error);
  } finally {
      // Clean up tokens
      localStorage.removeItem(this.config.accessTokenKey);
      localStorage.removeItem(this.config.refreshTokenKey);
      
      // Clean up API instance
      delete this.api.defaults.headers.common.Authorization;
      
      // Clear persisted state
      persistor.purge();
      
      // Navigate (via config callback)
      this.config.onLogout();
  }
}



}

export const apiInstance = new api({ baseURL: import.meta.env.VITE_API_URL, onLogout: () => window.location.replace('/landingpage') });
export default apiInstance.api; 