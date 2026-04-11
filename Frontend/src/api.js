/**
 * API client — Axios instance with JWT token management.
 *
 * Features:
 * - Automatic access-token refresh via interceptors
 * - Concurrent-request deduplication during refresh
 * - Centralised logout with Redux persist cleanup
 */

import axios from 'axios';
import jwt_decode from 'jwt-decode';

import { USERS } from './constants/apiEndpoints';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants/authConstants';
import store, { persistor } from './store';
import { clearUserData } from './slices/user/userSlice';
import { resetAdmin } from './slices/admin/adminSlice';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TOKEN_BUFFER_MS = 60_000;            // refresh 60 s before expiry
const UNAUTHORIZED    = 401;
const BASE_URL        = import.meta.env.VITE_API_URL;
const IS_DEV          = import.meta.env.DEV;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Dev-only logger — silenced in production builds. */
const devLog = IS_DEV
  ? (...args) => console.warn('[api]', ...args)
  : () => {};

const getToken  = (key) => localStorage.getItem(key);
const setToken  = (key, value) => {
  if (value) localStorage.setItem(key, value);
  else       localStorage.removeItem(key);
};

/** Returns `true` when the token is missing or within the buffer window. */
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const { exp } = jwt_decode(token);
    // Use a safety buffer to account for clock skew and network latency
    return (exp * 1000) - TOKEN_BUFFER_MS <= Date.now();
  } catch {
    return true;
  }
};

// ---------------------------------------------------------------------------
// Axios instances
// ---------------------------------------------------------------------------

/** Main instance used by the application with interceptors. */
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/** 
 * Internal clean instance without interceptors.
 * Used for token refresh and logout to avoid infinite interceptor loops.
 */
const authApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let refreshPromise = null;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Fetches a new access token using the current refresh token.
 * Singleton promise pattern prevents multiple simultaneous refresh calls.
 */
const refreshAccessToken = async () => {
  const refreshToken = getToken(REFRESH_TOKEN);

  // If we can't refresh, just log out.
  if (!refreshToken || isTokenExpired(refreshToken)) {
    devLog('Refresh token missing or expired — triggering logout.');
    // We call logout with redirect enabled to ensure the app resets.
    await logout({ skipApi: true }); 
    throw new Error('Session expired');
  }

  try {
    const { data } = await authApi.post(USERS.TOKEN_REFRESH, {
      refresh: refreshToken,
    });

    setToken(ACCESS_TOKEN, data.access);
    if (data.refresh) setToken(REFRESH_TOKEN, data.refresh);

    devLog('Tokens refreshed successfully.');
    
    // Broadcast for other listeners (optional)
    window.dispatchEvent(
      new CustomEvent('tokenRefreshed', { detail: { newToken: data.access } }),
    );

    return data.access;
  } catch (err) {
    devLog('Token refresh failed:', err.response?.data || err.message);
    
    // On refresh failure, logout is mandatory.
    logout({ skipApi: true });

    // Extract human-readable error if possible
    const errorData = err.response?.data;
    const errorMsg = (typeof errorData === 'string' ? errorData : (errorData?.detail || errorData?.error)) || err.message;
    throw new Error(errorMsg);
  } finally {
    refreshPromise = null;
  }
};

/**
 * Centralized logout function.
 * Clears tokens, purges Redux state, and notifies the backend.
 */
export const logout = async (options = {}) => {
  const { skipApi = false, redirectUrl = '/landingpage' } = options;

  try {
    const refreshToken = getToken(REFRESH_TOKEN);
    const accessToken  = getToken(ACCESS_TOKEN);

    // Call logout API if we have tokens and haven't opted out.
    if (!skipApi && refreshToken && accessToken) {
      // Use authApi to bypass interceptors and avoid loops.
      authApi.post(USERS.LOGOUT, 
        { refresh_token: refreshToken },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ).catch(() => {
        // Silently fail API call — the client-side cleanup is priority.
      });
    }
  } catch (err) {
    devLog('Logout API error:', err.message);
  } finally {
    // 1. Clear specific tokens immediately (synchronous)
    setToken(ACCESS_TOKEN, null);
    setToken(REFRESH_TOKEN, null);
    
    // 2. Clear instance headers
    delete api.defaults.headers.common.Authorization;

    // 3. Dispatch clear actions to Redux (immediate in-memory cleanup)
    // This breaks potential loops where Router guards might redirect back to protected routes.
    try {
      store.dispatch(clearUserData());
      store.dispatch(resetAdmin());
    } catch (reduxErr) {
      devLog('Redux clear error (ignoring):', reduxErr.message);
    }

    // 4. Purge persisted state and then redirect
    // We don't await the purge here to prevent potential hangs from blocking navigation.
    persistor.purge().finally(() => {
      if (redirectUrl) {
         window.location.replace(redirectUrl);
      }
    });

    // Safety fallback: Redirect after 300ms regardless of purge status.
    setTimeout(() => {
      if (redirectUrl && !window.location.pathname.includes(redirectUrl)) {
        window.location.replace(redirectUrl);
      }
    }, 300);
  }
};

// ---------------------------------------------------------------------------
// Interceptors
// ---------------------------------------------------------------------------

/** Request Interceptor: Attach Authorization header and handle preemptive refresh. */
api.interceptors.request.use(async (config) => {
  const token = getToken(ACCESS_TOKEN);
  
  // If no token, proceed (endpoint might be public)
  if (!token) return config;

  // If token is valid, just attach and go
  if (!isTokenExpired(token)) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  // If token is expired, wait for refresh
  try {
    refreshPromise ??= refreshAccessToken();
    const newToken = await refreshPromise;
    config.headers.Authorization = `Bearer ${newToken}`;
    return config;
  } catch (err) {
    // refreshAccessToken handles logout on failure
    return Promise.reject(err);
  }
});

/** Response Interceptor: Handle unexpected 401s (e.g. blacklisted token or skew). */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === UNAUTHORIZED && !originalRequest._retry) {
      originalRequest._retry = true;

      // Only attempt refresh if we have a refresh token
      if (getToken(REFRESH_TOKEN)) {
        try {
          refreshPromise ??= refreshAccessToken();
          const newToken = await refreshPromise;
          
          // Update original request and retry
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          // Failure handled in refreshAccessToken
          return Promise.reject(refreshErr);
        }
      }
    }

    return Promise.reject(error);
  }
);

// Backward compatibility or alternative name
export { logout as handleLogout };

export default api;