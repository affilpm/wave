import api from '../../api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../constants/authConstants';
import { persistor } from '../../store';

export const logout = () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    const accessToken = localStorage.getItem(ACCESS_TOKEN);

    if (refreshToken && accessToken) {
        api.post(`${import.meta.env.VITE_API_URL}/api/users/logout/`, {
            refresh_token: refreshToken,
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }).catch((err) => {
            console.error('Logout API error (non-blocking):', err);
        });
    }

    // Cleanup
    localStorage.clear();
    delete api.defaults.headers.common.Authorization;
    persistor.purge();

    // Redirect
    window.location.href = '/landingpage';
};