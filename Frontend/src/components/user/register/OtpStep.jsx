import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';

const OTPStep = ({ formData, errors, isSubmitting, handleChange, handleOTPVerification, goBack, resendOTP }) => {
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
    <>
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center">
          <img src="/shape.png" alt="Logo" className="h-auto w-auto" />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-100 mb-2">
          Verify Email
        </h2>
        <p className="text-gray-400 text-sm mb-8">
          We've sent a verification code to {formData.email}
        </p>
      </div>

      <form onSubmit={handleOTPVerification} className="space-y-4">
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
            placeholder="Enter 6-digit code"
            value={formData.otp}
            onChange={handleChange}
            className="mt-1 block w-full rounded-full border border-gray-600 bg-gray-700 text-gray-100 px-4 py-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.otp && (
            <div className="mt-2 text-sm text-red-500">{errors.otp}</div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? (
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
            onClick={goBack}
            className="text-sm text-gray-400 hover:text-gray-200"
          >
            Change email
          </button>
          <button
            type="button"
            onClick={handleResendClick}
            disabled={!canResend || resendLoading}
            className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            {resendLoading ? 'Resending...' : 
             !canResend ? `Resend in ${timeLeft}s` : 'Resend OTP'}
          </button>
        </div>
      </form>
    </>
  );
};

export default OTPStep;