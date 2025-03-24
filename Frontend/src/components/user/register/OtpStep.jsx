import React, { useState, useEffect, useRef } from 'react';
import { Loader, Shield, AlertTriangle } from 'lucide-react';
import { RegistrationLogo } from './EmailStep';

const OTPStep = ({ 
  formData, 
  errors, 
  isSubmitting, 
  handleChange, 
  handleOTPVerification, 
  goBack, 
  resendOTP 
}) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [resendError, setResendError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [otpExpired, setOtpExpired] = useState(false);
  const [submittingClose, setSubmittingClose] = useState(false);
  const otpFormRef = useRef(null);

  // Timer for OTP expiration
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          // When time is low (5 seconds or less), warn user
          if (prev <= 5 && otpFormRef.current) {
            setSubmittingClose(true);
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCanResend(true);
      setOtpExpired(true);
      setSubmittingClose(false);
    }
  }, [timeLeft]);

  // Reset fields when component mounts
  useEffect(() => {
    setTimeLeft(30);
    setCanResend(false);
    setOtpExpired(false);
    setResendError('');
  }, []);

  const handleResendClick = async () => {
    if (!canResend) return;
    
    setResendLoading(true);
    setResendError('');
    
    try {
      await resendOTP();
      setTimeLeft(30);
      setCanResend(false);
      setOtpExpired(false);
    } catch (error) {
      setResendError(error?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent verification if OTP is already marked as expired
    if (otpExpired) {
      setResendError('OTP has expired. Please request a new OTP.');
      return;
    }
    
    // If we're very close to expiration, warn the user
    if (timeLeft <= 3) {
      if (window.confirm("Your OTP is about to expire. Submit anyway or request a new one?")) {
        handleOTPVerification(e);
      } else {
        // User chose to get a new OTP
        handleResendClick();
      }
    } else {
      handleOTPVerification(e);
    }
  };

  const handleOTPChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      handleChange({
        target: {
          name: 'otp',
          value: value
        }
      });
    }
  };

  return (
    <div className="text-center">
      <div className="relative z-10 p-8">
        {/* Fixed-height container for logo */}
        <div className="h-24 flex items-center justify-center mb-6">
          <RegistrationLogo />
        </div>

        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
            Verify Email
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            We've sent a verification code to {formData.email}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Code expires in <span className={timeLeft <= 10 ? "text-red-400 font-bold" : "text-gray-400"}>{timeLeft}s</span>
          </p>
        </div>

        {otpExpired && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-center justify-center text-red-300">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>OTP has expired. Please request a new one.</span>
          </div>
        )}

        {submittingClose && !otpExpired && (
          <div className="mb-6 p-3 bg-yellow-900/30 border border-yellow-800 rounded-lg flex items-center justify-center text-yellow-300">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>OTP is about to expire! Submit quickly or request a new one.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} ref={otpFormRef} className="max-w-md mx-auto space-y-6">
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
              value={formData.otp}
              onChange={handleOTPChange}
              className={`pl-10 w-full px-4 py-3 bg-gray-700/50 border ${
                otpExpired ? 'border-red-600/50' : 
                submittingClose ? 'border-yellow-600/50' : 
                'border-gray-600/30'
              } rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition duration-300`}
              disabled={otpExpired}
            />
          </div>
          
          {errors.otp && (
            <div className="mt-2 text-sm text-red-400">{errors.otp}</div>
          )}
          
          {resendError && (
            <div className="mt-2 text-sm text-red-400">{resendError}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || formData.otp.length !== 6 || otpExpired}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl 
            hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
            transition duration-300 ease-in-out transform hover:scale-[1.02] 
            disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
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
              onClick={goBack}
              className="text-gray-400 hover:text-gray-200"
            >
              Change email
            </button>
            <button
              type="button"
              onClick={handleResendClick}
              disabled={!canResend || resendLoading}
              className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
            >
              {resendLoading ? 'Resending...' : 
               !canResend ? `Resend in ${timeLeft}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OTPStep;