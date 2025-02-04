import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';
import GoogleAuthButton from '../GoogleAuth';
import OTPVerification from './OTPVerification';
import EmailForm from './EmailForm';

const LoginPage = () => {
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [isSignup, setIsSignup] = useState(false); // Toggle between Login and Signup
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/api/users/login/', { email });
      setIsOtpSent(true);
      // setSuccess('OTP sent successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/api/users/signup/', { email });
      setIsOtpSent(true);
      setSuccess('OTP sent successfully for signup');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="max-w-lg w-full bg-gray-800 min-h-[450px] rounded-lg shadow-lg p-8">  
        {/* Logo Space */}
        <div className="flex justify-center mb-8">
    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
      <img 
        src="/shape.png" 
        alt="Company Logo" 
        className="w-14 h-14 object-contain" 
      />
    </div>
  </div>

  <div className="text-center mb-10">
  {!isOtpSent && (
    <>
      <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
        {isSignup ? 'Sign Up' : 'Sign In'}
      </h2>
      <p className="text-gray-400 text-sm">
        {isSignup ? 'Create a new account' : 'Continue with your email or Google account'}
      </p>
    </>
  )}
</div>

        {!isOtpSent ? (
          <div className="space-y-8">
            {/* GoogleAuthButton container with proper padding and centering */}
            <div className="flex justify-center px-4">
              <div className="w-full max-w-[320px]">
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
              handleSubmit={isSignup ? handleSignup : handleLogin}
              loading={loading}
              error={error}
              success={success}
            />

            {/* Toggle between Login and Signup */}
            <div className="text-center text-sm text-gray-400">
                <p>
                  Don't have an account?{' '}
                  <button
                    className="text-blue-500 hover:underline"
                    onClick={() => navigate('/register')}
                  >
                    Sign Up
                  </button>
                </p>
            </div>
          </div>
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

export default LoginPage;