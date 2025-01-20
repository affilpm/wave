import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import api from '../../../api';
import GoogleAuthButton from '../GoogleAuth';


const LoginPage = () => {
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/api/users/login/', { email });
      setIsOtpSent(true);
      setSuccess('OTP sent successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
        {/* Logo Space */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center">
          <img src="/shape.png" alt="Logo" className="h-auto w-auto" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-100 mb-2">
            Sign in 
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            Continue with your email or Google account
          </p>
        </div>
        
        {!isOtpSent ? (
          <>
            <div className="space-y-6">
            {/* GoogleAuthButton with proper padding */}
            <div className="flex justify-center items-center">
              <div className="w-full">
                <GoogleAuthButton />
              </div>
            </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-800 text-gray-400">or</span>
                </div>
              </div>

              <EmailForm
                email={email}
                setEmail={setEmail}
                handleSubmit={handleLogin}
                loading={loading}
                error={error}
                success={success}
              />
            </div>
          </>
        ) : (
          <OTPVerification 
            email={email}
            setIsOtpSent={setIsOtpSent}
          />
        )}
      </div>
    </div>
  );
};

const EmailForm = ({ email, setEmail, handleSubmit, loading, error, success }) => (
  <form onSubmit={handleSubmit} className="space-y-4">
    <div>
      <label htmlFor="email" className="block text-sm font-medium text-gray-300">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        className="mt-1 block w-full rounded-full border border-gray-600 bg-gray-700 text-gray-100 px-4 py-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </div>

    {error && (
      <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative">
        {error}
      </div>
    )}

    {success && (
      <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg relative">
        {success}
      </div>
    )}

    <button
      type="submit"
      disabled={loading}
      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {loading ? (
        <span className="flex items-center">
          <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
          Sending OTP...
        </span>
      ) : (
        'Continue with email'
      )}
    </button>
  </form>
);


const OTPVerification = ({ email, setIsOtpSent }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
      
    setResendLoading(true);
    setError('');
  
    try {
      const response = await api.post('/api/users/resend-otp/', { email });
      setResendCooldown(60);
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
      localStorage.setItem('accessToken', response.data.tokens.access);
      localStorage.setItem('refreshToken', response.data.tokens.refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.tokens.access}`;
      window.location.href = '/dashboard';
    } catch (err) {
      if (err.response?.data?.error?.includes('expired')) {
        setError('OTP has expired. Please request a new one.');
        setResendCooldown(0);
      } else if (err.response?.data?.error === 'Invalid OTP') {
        setError('Invalid OTP. Please try again or request a new one.');
      } else {
        setError(err.response?.data?.error || 'Failed to verify OTP');
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
    <form onSubmit={handleVerifyOTP} className="space-y-4">
      <p className="text-sm text-gray-400 text-center">
        We've sent a verification code to {email}
      </p>

      <div>
        <label htmlFor="otp" className="block text-sm font-medium text-gray-300">
          Enter OTP
        </label>
        <input
          id="otp"
          name="otp"
          type="text"
          required
          maxLength={6}
          pattern="\d{6}"
          className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter 6-digit code"
          value={otp}
          onChange={handleOTPChange}
        />
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || otp.length !== 6}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center">
            <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
            Verifying...
          </span>
        ) : (
          'Verify OTP'
        )}
      </button>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOtpSent(false)}
          className="text-sm text-gray-400 hover:text-gray-200"
        >
          Change email
        </button>
        <button
          type="button"
          onClick={handleResendOTP}
          disabled={resendLoading || resendCooldown > 0}
          className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
        >
          {resendLoading ? 'Resending...' : 
           resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
        </button>
      </div>
    </form>
  );
};

export default LoginPage;