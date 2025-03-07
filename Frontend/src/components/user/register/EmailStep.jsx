import React, { useState, useEffect } from 'react';
import { Loader, User, Mail, Shield, AtSign, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GoogleRegisterButton from './GoogleRegisterButton';

// Shared Logo Component
export const RegistrationLogo = () => (
  <div className="flex justify-center mb-8">
    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
      <img 
        src="/shape.png" 
        alt="Company Logo" 
        className="w-14 h-14 object-contain" 
      />
    </div>
  </div>
);

// Email Step
export const EmailStep = ({ formData, errors, isSubmitting, handleChange, handleEmailSubmit }) => {
  const navigate = useNavigate();

  return (
    <div className="relative z-10 p-8">
      <RegistrationLogo />

      <div className="text-center mb-10">
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
          Sign up
        </h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Create your account with email or Google
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        <div className="flex justify-center px-4">
          <div className="w-full max-w-[320px]">
            <GoogleRegisterButton />
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

        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className="pl-10 w-full px-4 py-3 bg-gray-700/50 border border-gray-600/30 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition duration-300"
            />
          </div>
          {errors.email && (
              <div className="mt-2 text-sm text-red-400">{errors.email}</div>
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
                Sending OTP...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="text-center text-sm text-gray-400">
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
export default EmailStep