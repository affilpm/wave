import React from 'react';
import { Loader, Mail } from 'lucide-react';

const EmailForm = ({ email, setEmail, handleSubmit, loading, error, success }) => (
  <form onSubmit={handleSubmit} className="space-y-4 w-full px-2 sm:px-0">
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
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="pl-10 w-full px-4 py-3 bg-gray-700/50 border border-gray-600/30 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition duration-300"
        autoComplete="email"
      />
    </div>

    {error && (
      <div className="text-sm text-red-400 text-center sm:text-left">{error}</div>
    )}

    {success && (
      <div className="text-sm text-green-400 text-center sm:text-left">{success}</div>
    )}

    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl 
      hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
      transition duration-300 ease-in-out transform hover:scale-[1.02] 
      disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
    >
      {loading ? (
        <>
          <Loader className="animate-spin mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          <span>Sending OTP...</span>
        </>
      ) : (
        'Continue with email'
      )}
    </button>
  </form>
);

export default EmailForm;