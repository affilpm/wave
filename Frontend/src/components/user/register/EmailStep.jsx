import React from 'react';
import { Loader, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GoogleRegisterButton from './GoogleRegisterButton';

// Shared Logo Component
export const RegistrationLogo = () => (
  <div className="flex justify-center mb-4 md:mb-8">
    <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
      <img 
        src="/shape.png" 
        alt="Company Logo" 
        className="w-10 h-10 md:w-14 md:h-14 object-contain" 
      />
    </div>
  </div>
);

// Email Step
export const EmailStep = ({ formData, errors, isSubmitting, handleChange, handleEmailSubmit }) => {
  const navigate = useNavigate();

  return (
    <div className="relative z-10 p-4 md:p-8 w-full">
      <RegistrationLogo />

      <div className="text-center mb-6 md:mb-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2 md:mb-4">
          Sign up
        </h2>
        <p className="text-sm md:text-base text-gray-400 max-w-md mx-auto">
          Create your account with email or Google
        </p>
      </div>

      <div className="space-y-4 md:space-y-6 max-w-md mx-auto">
        <div className="flex justify-center px-2 md:px-4">
          <div className="w-full max-w-[280px] md:max-w-[320px]">
            <GoogleRegisterButton />
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-xs md:text-sm">
            <span className="px-2 md:px-4 bg-gray-800 text-gray-400">or</span>
          </div>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4 md:space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className="pl-10 w-full px-3 py-2 md:px-4 md:py-3 bg-gray-700/50 border border-gray-600/30 rounded-lg md:rounded-xl text-white text-sm md:text-base placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition duration-300"
            />
          </div>
          {errors.email && (
            <div className="mt-1 text-xs md:text-sm text-red-400">{errors.email}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 md:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm md:text-base rounded-lg md:rounded-xl 
            hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
            transition duration-300 ease-in-out transform hover:scale-[1.02] 
            disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader className="animate-spin mr-2 h-4 w-4 md:mr-3 md:h-5 md:w-5" />
                <span>Sending OTP...</span>
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="text-center text-xs md:text-sm text-gray-400 mt-4">
          <p>
            Already have an account?{' '}
            <button
              className="text-blue-500 hover:underline"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailStep;