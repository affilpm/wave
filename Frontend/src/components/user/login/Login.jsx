import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import api from '../../../api';
import GoogleAuthButton from '../GoogleAuth';
import { useNavigate } from 'react-router-dom';
import OTPVerification from './OTPVerification';
import EmailForm from './EmailForm';


const LoginPage = () => {
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
 
  
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





export default LoginPage;