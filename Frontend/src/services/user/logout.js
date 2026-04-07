import { logout } from '../../api';

/**
 * User logout service.
 * Uses the centralized logout logic from api.js.
 */
export const logoutUser = () => {
    logout({ redirectUrl: '/landingpage' });
};

// Also export as default if needed, or keeping the named export
export { logoutUser as logout };