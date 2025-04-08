import React from 'react';
import { Loader, Mail } from 'lucide-react';

const EmailForm = ({ email, setEmail, handleSubmit, loading, error, success }) => (
  <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 w-full max-w-sm mx-auto">
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
      </div>
      <input
        id="email"
        name="email"
        type="email"
        required
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="pl-10 w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-700/50 border border-gray-600/30 rounded-lg sm:rounded-xl 
                 text-white text-sm sm:text-base placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 
                 transition duration-300 outline-none"
        autoComplete="email"
      />
    </div>

    {error && (
      <div className="mt-1 text-xs sm:text-sm text-red-400">{error}</div>
    )}

    {success && (
      <div className="mt-1 text-xs sm:text-sm text-green-400">{success}</div>
    )}

    <button
      type="submit"
      disabled={loading}
      className="w-full py-2 sm:py-3 md:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm sm:text-base 
               rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 
               focus:ring-blue-500/50 transition duration-300 ease-in-out transform hover:scale-[1.02] 
               disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      aria-label={loading ? "Sending OTP" : "Continue with email"}
    >
      {loading ? (
        <>
          <Loader className="animate-spin mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-sm sm:text-base">Sending OTP...</span>
        </>
      ) : (
        <span className="text-sm sm:text-base">Continue with email</span>
      )}
    </button>
  </form>
);

export default EmailForm;