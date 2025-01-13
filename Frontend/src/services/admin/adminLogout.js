import axios from 'axios';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../constants/authConstants';
import api from '../../api';

// Frontend: logout.js

export const adminLogout = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    const accessToken = localStorage.getItem(ACCESS_TOKEN);

    try {
        if (refreshToken) {
            await api.post(`${import.meta.env.VITE_API_URL}/api/users/logout/`, {
                refresh_token: refreshToken,  // Changed from 'refresh' to 'refresh_token'
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
        }
    } catch (err) {
        console.error('Error during logout:', err);
    } finally {
        localStorage.clear();
        window.location.href = '/adminlogin';
    }
};

