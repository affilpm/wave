import React, { useState, useEffect } from 'react';
import { Loader, User, Mail, Shield, AtSign, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GoogleRegisterButton from './GoogleRegisterButton';
import { RegistrationLogo } from './EmailStep';
// OTP Step

export const OTPStep = ({ formData, errors, isSubmitting, handleChange, handleOTPVerification, goBack, resendOTP }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [resendError, setResendError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

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

  const handleResendClick = async () => {
    try {
      setResendLoading(true);
      setResendError('');
      await resendOTP();
      setTimeLeft(30);
      setCanResend(false);
    } catch (error) {
      setResendError(error?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
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
      </div>

      <form onSubmit={handleOTPVerification} className="max-w-md mx-auto space-y-6">
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
            onChange={handleChange}
            className="pl-10 w-full px-4 py-3 bg-gray-700/50 border border-gray-600/30 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition duration-300"
          />

        </div>
          {errors.otp && (
            <div className="mt-2 text-sm text-red-400">{errors.otp}</div>
          )}
        <button
          type="submit"
          disabled={isSubmitting}
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