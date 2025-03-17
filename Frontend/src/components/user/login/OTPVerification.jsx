import React, { useState, useEffect } from 'react';
import api from '../../../api';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUserData } from '../../../slices/user/userSlice';
import { decodeToken } from '../../../utils/tokenUtils';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../../constants/authConstants';
import { Loader, Shield } from 'lucide-react';

const OTPVerification = ({ email, setIsOtpSent }) => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else {
            setCanResend(true);
        }
    }, [timeLeft]);

    const handleResendOTP = async () => {
        if (!canResend) return;
        
        setResendLoading(true);
        setError('');

        try {
            await api.post('/api/users/resend-otp/', { email });
            setTimeLeft(30);
            setCanResend(false);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to resend OTP';
            setError(errorMessage);
        } finally {
            setResendLoading(false);
        }
    };
    
    const handleVerifyOTP = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      
      try {
          const response = await api.post('/api/users/verify-otp/', { email, otp });
  
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
  
  
          // Navigate to home **AFTER** updating state
          navigate('/home');
      } catch (err) {
          setError(err.response?.data?.error || 'Failed to verify OTP');
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
        <div className="text-center">
            <div className="text-center mb-10">
                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
                    Verify Email
                </h2>
                <p className="text-gray-400 max-w-md mx-auto">
                    We've sent a verification code to {email}
                </p>
            </div>

            <form onSubmit={handleVerifyOTP} className="max-w-md mx-auto space-y-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Shield className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        id="otp"
                        name="otp"
                        type="text"
                        required
                        maxLength={6}
                        pattern="\d{6}"
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={handleOTPChange}
                        className="pl-10 w-full px-4 py-3 bg-gray-700/50 border border-gray-600/30 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition duration-300"
                    />
                </div>
                {error && (
                        <div className="mt-2 text-sm text-red-400">{error}</div>
                    )}

                <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl 
                    hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                    transition duration-300 ease-in-out transform hover:scale-[1.02] 
                    disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {loading ? (
                        <>
                            <Loader className="animate-spin mr-3 h-5 w-5" />
                            Verifying...
                        </>
                    ) : (
                        'Verify OTP'
                    )}
                </button>

                <div className="flex items-center justify-between text-sm">
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