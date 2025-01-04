// tokenUtils.js
export const decodeToken = (token) => {
    try {
      // Basic token validation
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token format');
      }
  
      // Remove Bearer prefix if present
      const cleanToken = token.replace('Bearer ', '').trim();
      
      // Decode token
      const base64Url = cleanToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
  
      const decoded = JSON.parse(jsonPayload);
      console.log('Decoded token:', decoded);
      return decoded;
    } catch (error) {
      console.error('Token decode error:', error);
      throw error;
    }
  };