import api from "../../api";
import { MUSIC } from "../../constants/apiEndpoints";

export const musicVerificationService = {
  getPendingVerifications: async (page = 1) => {
    const response = await api.get(`${MUSIC.VERIFICATION}?page=${page}`);
    return response.data;
  },

  approveMusic: async (musicId) => {
    const response = await api.post(MUSIC.APPROVE(musicId));
    return response.data;
  },

  rejectMusic: async (musicId) => {
    const response = await api.post(MUSIC.REJECT(musicId));
    return response.data;
  }
};