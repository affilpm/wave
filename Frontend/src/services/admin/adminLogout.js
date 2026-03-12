import api from '../../api';
import { USERS } from '../../constants/apiEndpoints';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../constants/authConstants';
import { persistor } from '../../store';

const devLog = import.meta.env.DEV ? (...args) => console.warn('[adminLogout]', ...args) : () => {};

export const adminLogout = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    const accessToken = localStorage.getItem(ACCESS_TOKEN);

    try {
        if (refreshToken && accessToken) {
            await api.post(USERS.LOGOUT, {
                refresh_token: refreshToken,
            }, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
        }
    } catch (err) {
        devLog('Error during admin logout:', err.message);
        // Even if API fails, continue cleanup
    } finally {
        localStorage.clear(); // clears everything at once
        delete api.defaults.headers.common.Authorization;

        persistor.purge().finally(() => {
            window.location.href = '/adminlogin';
        });
    }
};