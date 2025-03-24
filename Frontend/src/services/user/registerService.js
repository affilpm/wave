// src/services/authService.js
import api from "../../api";

export const registerService = {
  async initiateRegistration(email) {
    try {
      const response = await api.post('api/users/register/initiate/', { email });
      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limiting response
        throw { 
          error: error.response?.data?.error || 'Too many requests. Please try again later.',
          isRateLimited: true 
        };
      }
      throw error.response?.data || { error: error.message };
    }
  },

  async verifyOTP(email, otp) {
    try {
      const response = await api.post('api/users/register/verify-otp/', { email, otp });
      return response.data;
    } catch (error) {
      // Check if this is an expiration issue
      if (error.response?.data?.error?.includes('expired')) {
        throw { 
          error: error.response?.data?.error || 'OTP has expired',
          isExpired: true
        };
      }
      throw error.response?.data || { error: error.message };
    }
  },

  async resendOTP(email) {
    try {
      const response = await api.post('api/users/register/resend-otp/', { email });
      return response.data;
    } catch (error) {
      // Specifically handle rate limiting
      if (error.response?.status === 429) {
        const message = error.response?.data?.error || 'Please wait before requesting another code';
        throw { 
          error: message,
          isRateLimited: true,
          message: message,
          remainingTime: error.response?.data?.remainingTime
        };
      }
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to resend OTP';
      throw { error: errorMessage, message: errorMessage };
    }
  },

  async completeRegistration(userData) {
    try {
      const response = await api.post('api/users/register/complete/', userData);
      return response.data;
    } catch (error) {
      // Check if this is a session expiration issue
      if (error.response?.data?.error?.includes('expired')) {
        throw { 
          error: error.response?.data?.error || 'Registration session expired',
          isSessionExpired: true
        };
      }
      throw error.response?.data || { error: error.message };
    }
  },
  
  // Helper method to check remaining time on verification token
  async checkVerificationStatus(email, token) {
    try {
      const response = await api.post('api/users/register/check-status/', { 
        email, 
        verification_token: token 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

export default registerService;