import api from "../api";

export const musicVerificationService = {
  getPendingVerifications: async () => {
    const response = await api.get('/api/music/music-verification/');
    return response.data;
  },

  approveMusic: async (musicId) => {
    const response = await api.post(`/api/music/music-verification/${musicId}/approve/`);
    return response.data;
  },

  rejectMusic: async (musicId) => {
    const response = await api.post(`/api/music/music-verification/${musicId}/reject/`);
    return response.data;
  }
};