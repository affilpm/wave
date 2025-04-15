import React, { useState, useEffect } from 'react';
import api from '../../../api';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUserData } from '../../../slices/user/userSlice';
import { decodeToken } from '../../../utils/tokenUtils';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../../constants/authConstants';
import { Loader, Shield, AlertTriangle } from 'lucide-react';

const OTPVerification = ({ email, setIsOtpSent }) => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [otpExpired, setOtpExpired] = useState(false);
    const [cooldownTime, setCooldownTime] = useState(30);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Timer for OTP expiration
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else {
            setCanResend(true);
            setOtpExpired(true); // Mark OTP as expired when timer reaches 0
        }
    }, [timeLeft]);

    // Reset fields when component mounts
    useEffect(() => {
        setOtp('');
        setError('');
        setTimeLeft(30);
        setCanResend(false);
        setOtpExpired(false);
    }, []);

    const handleResendOTP = async () => {
        if (!canResend) return;
        
        setResendLoading(true);
        setError('');
        setOtp(''); // Clear OTP field when resending

        try {
            const response = await api.post('/api/users/resend-otp/', { email });
            
            // Get expiration and cooldown data from response
            const expiresIn = response.data?.expiresIn || 30;
            const newCooldownTime = response.data?.cooldownTime || 30;
            
            setTimeLeft(expiresIn);
            setCooldownTime(newCooldownTime);
            setCanResend(false);
            setOtpExpired(false); // Reset expired status when new OTP is sent
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to resend OTP';
            const cooldownRemaining = err.response?.data?.cooldownRemaining;
            
            if (cooldownRemaining) {
                setTimeLeft(cooldownRemaining);
                setCooldownTime(cooldownRemaining);
            }
            
            setError(errorMessage);
        } finally {
            setResendLoading(false);
        }
    };
    
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        
        // Prevent verification if OTP is already marked as expired in UI
        if (otpExpired) {
            setError('OTP has expired. Please request a new OTP.');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            // Include the current timestamp when the user submitted the OTP
            const submitted_at = Date.now() / 1000; // Convert to seconds to match server time
            
            const response = await api.post('/api/users/verify-otp/', { 
                email, 
                otp,
                submitted_at
            });
    
            if (!response.data.tokens?.access || !response.data.tokens?.refresh) {
                throw new Error('Invalid token data received from server');
            }
    
            // Store tokens
            localStorage.setItem(ACCESS_TOKEN, response.data.tokens.access);
            localStorage.setItem(REFRESH_TOKEN, response.data.tokens.refresh);
            
            // Decode token
            const decodedToken = decodeToken(response.data.tokens.access);
    
            if (!decodedToken?.user_id || !decodedToken?.email) {
                throw new Error('Invalid user data in token');
            }
    
            // Store user data in Redux
            dispatch(setUserData({
                user_id: decodedToken.user_id,
                email: decodedToken.email,
                username: decodedToken.username,
                first_name: decodedToken.first_name,
                last_name: decodedToken.last_name,
                image: decodedToken.profile_photo || null,
                isAuthenticated: true,
            }));
    
            // Navigate to home after updating state
            navigate('/home');
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Failed to verify OTP';
            setError(errorMessage);
            
            // If OTP has expired according to server response
            if (err.response?.data?.expired) {
                setOtpExpired(true);
                setTimeLeft(0);
                setCanResend(true);
            }
        } finally {
            setLoading(false);
        }
    };
  
    const handleOTPChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 6) {
            setOtp(value);
            setError('');
        }
    };

    return (
        <div className="text-center px-4 sm:px-0">
            <div className="text-center mb-6 sm:mb-10">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2 sm:mb-4">
                    Verify Email
                </h2>
                <p className="text-gray-400 max-w-md mx-auto text-sm sm:text-base">
                    We've sent a verification code to <span className="break-all">{email}</span>
                </p>
            </div>

            {otpExpired && (
                <div className="mb-4 sm:mb-6 p-2 sm:p-3 bg-red-900/30 border border-red-800 rounded-lg flex flex-wrap items-center justify-center text-red-300 text-xs sm:text-sm">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span>OTP has expired. Please request a new one.</span>
                </div>
            )}

            <form onSubmit={handleVerifyOTP} className="max-w-md mx-auto space-y-4 sm:space-y-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                    <input
                        id="otp"
                        name="otp"
                        type="number"
                        inputMode="numeric"
                        required
                        maxLength={6}
                        pattern="\d{6}"
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={handleOTPChange}
                        className={`pl-10 w-full px-4 py-3 bg-gray-700/50 border ${
                            otpExpired ? 'border-red-600/50' : 'border-gray-600/30'
                        } rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition duration-300`}
                        disabled={otpExpired}
                    />
                </div>
                
                {!otpExpired && timeLeft > 0 && (
                    <div className={`text-xs sm:text-sm ${timeLeft <= 5 ? 'text-red-400' : 'text-yellow-400'}`}>
                        OTP expires in {timeLeft} seconds
                    </div>
                )}
                
                {error && (
                    <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-400">{error}</div>
                )}

                <button
                    type="submit"
                    disabled={loading || otp.length !== 6 || otpExpired}
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl 
                    hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                    transition duration-300 ease-in-out transform hover:scale-[1.02] 
                    disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
                >
                    {loading ? (
                        <>
                            <Loader className="animate-spin mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            <span>Verifying...</span>
                        </>
                    ) : (
                        'Verify OTP'
                    )}
                </button>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                    <button
                        type="button"
                        onClick={() => setIsOtpSent(false)}
                        className="text-gray-400 hover:text-gray-200"
                    >
                        Change email
                    </button>
                    <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={!canResend || resendLoading}
                        className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
                    >
                        {resendLoading ? 'Resending...' : 
                         !canResend ? `Resend in ${timeLeft}s` : 'Resend OTP'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default OTPVerification;