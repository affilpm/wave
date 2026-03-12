/**
 * Authentication constants — token storage keys and OAuth config.
 */

/** localStorage key for the JWT access token. */
export const ACCESS_TOKEN = 'access_token';

/** localStorage key for the JWT refresh token. */
export const REFRESH_TOKEN = 'refresh_token';

/** Google OAuth 2.0 Client ID (loaded from environment). */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
