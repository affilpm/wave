import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';


const EmailForm = ({ email, setEmail, handleSubmit, loading, error, success }) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 block w-full rounded-full border border-gray-600 bg-gray-700 text-gray-100 px-4 py-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
  
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative">
          {error}
        </div>
      )}
  
      {success && (
        <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg relative">
          {success}
        </div>
      )}
  
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center">
            <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
            Sending OTP...
          </span>
        ) : (
          'Continue with email'
        )}
      </button>
    </form>
  );


export default EmailForm;  