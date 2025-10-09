import axios from 'axios';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../constants/authConstants';
import api from '../../api';
import {persistor} from '../../store'
import { clearUserData } from '../../slices/user/userSlice';



export const adminLogout = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    const accessToken = localStorage.getItem(ACCESS_TOKEN);

    try {
        
        if (refreshToken && accessToken) {
            await api.post(`${import.meta.env.VITE_API_URL}/api/users/logout/`, {
                refresh_token: refreshToken,
            }, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
        }
    } catch (err) {
        console.error('Error during logout:', err);
        // Even if API fails, continue cleanup
    } finally {
        localStorage.clear(); // clears everything at once

        delete api.defaults.headers.common.Authorization;

        persistor.purge().finally(() => {
            window.location.href = '/adminlogin';
        });
    }
};