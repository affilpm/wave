/**
 * API client — Axios instance with JWT token management.
 *
 * Features:
 * - Automatic access-token refresh via interceptors
 * - Concurrent-request deduplication during refresh
 * - Centralised logout with Redux persist cleanup
 *
 * Usage:
 *   import api from '@/api';
 *   const { data } = await api.get(USERS.PROFILE);
 */

import axios from 'axios';
import jwt_decode from 'jwt-decode';

import { USERS } from './constants/apiEndpoints';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants/authConstants';
import { persistor } from './store';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TOKEN_BUFFER_MS = 30_000;            // refresh 30 s before expiry
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
    return (exp * 1000) - TOKEN_BUFFER_MS <= Date.now();
  } catch {
    return true;
  }
};

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Token refresh (singleton promise prevents thundering-herd)
// ---------------------------------------------------------------------------
let refreshPromise = null;

const refreshAccessToken = async () => {
  const refreshToken = getToken(REFRESH_TOKEN);

  if (!refreshToken || isTokenExpired(refreshToken)) {
    devLog('Refresh token missing or expired — logging out.');
    await handleLogout();
    throw new Error('Invalid or expired refresh token');
  }

  try {
    const { data } = await axios.post(
      `${BASE_URL}${USERS.TOKEN_REFRESH}`,
      { refresh: refreshToken },
    );

    setToken(ACCESS_TOKEN, data.access);
    if (data.refresh) setToken(REFRESH_TOKEN, data.refresh);

    window.dispatchEvent(
      new CustomEvent('tokenRefreshed', { detail: { newToken: data.access } }),
    );

    return data.access;
  } catch (err) {
    devLog('Token refresh failed:', err.message);
    await handleLogout();
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Interceptors
// ---------------------------------------------------------------------------

/** Attach Authorization header, refreshing the token first if necessary. */
api.interceptors.request.use(async (config) => {
  const token = getToken(ACCESS_TOKEN);
  if (!token) return config;

  if (!isTokenExpired(token)) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  try {
    refreshPromise ??= refreshAccessToken();
    const newToken = await refreshPromise;
    config.headers.Authorization = `Bearer ${newToken}`;
  } catch {
    await handleLogout();
  } finally {
    refreshPromise = null;
  }

  return config;
});

/** Retry once on 401 when the access token was stale. */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === UNAUTHORIZED &&
      !original._retry &&
      isTokenExpired(getToken(ACCESS_TOKEN))
    ) {
      original._retry = true;

      try {
        refreshPromise ??= refreshAccessToken();
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        await handleLogout();
        return Promise.reject(refreshErr);
      } finally {
        refreshPromise = null;
      }
    }

    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * Clear tokens, purge persisted Redux state, and redirect.
 * Called automatically on unrecoverable auth failures.
 */
const handleLogout = async () => {
  try {
    const refreshToken = getToken(REFRESH_TOKEN);
    const accessToken  = getToken(ACCESS_TOKEN);

    if (refreshToken && accessToken) {
      // Fire-and-forget — don't block cleanup on network call
      api.post(USERS.LOGOUT, { refresh_token: refreshToken }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }
  } finally {
    setToken(ACCESS_TOKEN, null);
    setToken(REFRESH_TOKEN, null);
    localStorage.clear();
    delete api.defaults.headers.common.Authorization;

    await persistor.purge();
  }
};

export { handleLogout };
export default api;