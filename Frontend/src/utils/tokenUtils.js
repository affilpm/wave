/**
 * JWT token decoder — manual base64 decode (no external dependency).
 *
 * @param {string} token - Raw JWT or "Bearer <token>" string.
 * @returns {object} Decoded token payload.
 * @throws {Error} When the token is malformed or cannot be decoded.
 */
export const decodeToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token format');
  }

  const cleanToken = token.replace('Bearer ', '').trim();
  const base64Url  = cleanToken.split('.')[1];
  const base64     = base64Url.replace(/-/g, '+').replace(/_/g, '/');

  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );

  return JSON.parse(jsonPayload);
};