import axios from 'axios';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../constants/authConstants';
import api from '../../api';
import { persistor } from '../../store';



export const logout = async () => {
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
        localStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);
        persistor.purge(); // Clears the persisted storage
        
        window.location.href = '/landingpage';
    }
};

