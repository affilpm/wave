// src/services/authService.js
import api from "../../api";

export const registerService = {
  async initiateRegistration(email) {
    try {
      const response = await api.post('api/users/register/initiate/', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  async verifyOTP(email, otp) {
    try {
      const response = await api.post('api/users/register/verify-otp/', { email, otp });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },


    async resendOTP(email) {
    try {
        const response = await api.post('api/users/register/resend-otp/', { email });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.message || 
                            error.message || 
                            'Failed to resend OTP';
        throw new Error(errorMessage);
    }
    },


  async completeRegistration(userData) {
    try {
      const response = await api.post('api/users/register/complete/', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};