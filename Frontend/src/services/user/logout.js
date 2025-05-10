import api from '../../api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../constants/authConstants';
import { persistor } from '../../store';

export const logout = () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    const accessToken = localStorage.getItem(ACCESS_TOKEN);

    // ✅ Step 1: Immediate cleanup
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    delete api.defaults.headers.common.Authorization;

    // ✅ Step 2: Purge persisted Redux state
    window.location.href = '/landingpage';
    persistor.purge();

    // ✅ Step 4: Optional API logout in background
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
};