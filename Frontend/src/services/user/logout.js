import api from '../../api';
import { USERS } from '../../constants/apiEndpoints';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../constants/authConstants';
import { persistor } from '../../store';

const devLog = import.meta.env.DEV ? (...args) => console.warn('[logout]', ...args) : () => {};

export const logout = () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    const accessToken = localStorage.getItem(ACCESS_TOKEN);

    if (refreshToken && accessToken) {
        api.post(USERS.LOGOUT, {
            refresh_token: refreshToken,
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }).catch((err) => {
            devLog('Logout API error (non-blocking):', err.message);
        });
    }

    // Cleanup
    localStorage.clear();
    delete api.defaults.headers.common.Authorization;
    persistor.purge();

    // Redirect
    window.location.href = '/landingpage';
};