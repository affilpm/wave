import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Lock } from 'lucide-react';
import { setUser } from '../../slices/admin/adminSlice';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../constants/authConstants';
import api from '../../api';


const AdminLogin = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [password, setPassword] = useState(''); // Local state for password
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { email } = useSelector((state) => state.admin); // Only email from Redux

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
    
        try {
            const response = await api.post('/api/admins/login/', {
                email,
                password,
            });
    
            const { token, refresh, user } = response.data;
            localStorage.setItem(ACCESS_TOKEN, token);
            localStorage.setItem(REFRESH_TOKEN, refresh);
    
            // Dispatching the setUser action to update the Redux state
            dispatch(setUser({
                ...user,
                email,
                Admin_isAuthenticated: true, // Set to true after successful login
            }));
            navigate('/admindashboard');
        } catch (error) {
            setError(error.response?.data?.detail || 'Incorrect email or password');
            setLoading(false);
        } finally {
            setPassword(''); // Clear password after submission
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">Admin Login</h2>
                    <p className="mt-2 text-sm text-gray-400">Access your admin dashboard</p>
                </div>
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="email" className="sr-only">Email</label>
                            <input
                                id="email"
                                name="email"
                                type="text"
                                value={email}
                                onChange={(e) => dispatch(setUser({ email: e.target.value }))}
                                required
                                className="appearance-none rounded-lg relative block w-full px-4 py-3 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Email"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type={password ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="appearance-none rounded-lg relative block w-full px-4 py-3 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            <Lock className="h-5 w-5 mr-2" />
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;