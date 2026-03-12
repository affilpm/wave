// src/services/authService.js
import api from "../../api";
import { USERS } from "../../constants/apiEndpoints";

export const registerService = {
  async initiateRegistration(email) {
    try {
      const response = await api.post(USERS.REGISTER_INITIATE, { email });
      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
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
      const response = await api.post(USERS.REGISTER_VERIFY, { email, otp });
      return response.data;
    } catch (error) {
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
      const response = await api.post(USERS.REGISTER_RESEND, { email });
      return response.data;
    } catch (error) {
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
      const response = await api.post(USERS.REGISTER_COMPLETE, userData);
      return response.data;
    } catch (error) {
      if (error.response?.data?.error?.includes('expired')) {
        throw { 
          error: error.response?.data?.error || 'Registration session expired',
          isSessionExpired: true
        };
      }
      throw error.response?.data || { error: error.message };
    }
  },
  
  async checkVerificationStatus(email, token) {
    try {
      const response = await api.post(USERS.REGISTER_STATUS, { 
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