import React from 'react';
import { Loader } from 'lucide-react';
import GoogleAuthButton from '../GoogleAuth';
import { useNavigate } from 'react-router-dom';


const EmailStep = ({ formData, errors, isSubmitting, handleChange, handleEmailSubmit }) => {

  const Navigate = useNavigate();

  return (
  <>
    <div className="flex justify-center mb-8">
      <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center">
        <img src="/shape.png" alt="Logo" className="h-auto w-auto" />
      </div>
    </div>

    <div className="text-center">
      <h2 className="text-3xl font-bold text-gray-100 mb-2">
        Sign up
      </h2>
      <p className="text-gray-400 text-sm mb-8">
        Create your account with email or Google
      </p>
    </div>

    <div className="space-y-6">
      {/* GoogleAuthButton with proper padding */}
      <div className="flex justify-center  px-4">
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

      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            className="mt-1 block w-full rounded-full border border-gray-600 bg-gray-700 text-gray-100 px-4 py-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.email && (
            <div className="mt-2 text-sm text-red-500">{errors.email}</div>
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
              Sending OTP...
            </span>
          ) : (
            'Create account'
          )}
        </button>
      </form>
          {/* Toggle between Login and Signup */}
          <div className="text-center text-sm text-gray-400">
               <p>
                 Already have an account?{' '}
                 <button
                   className="text-blue-500 hover:underline"
                   onClick={() => Navigate('/login')}
                 >
                   Sign In
                 </button>
               </p>
           </div>
    </div>
  </>
)};

export default EmailStep;