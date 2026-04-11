import { logout } from '../../api';

/**
 * Admin logout service.
 * Uses the centralized logout logic from api.js.
 */
export const adminLogout = () => {
    logout({ redirectUrl: '/adminlogin' });
};