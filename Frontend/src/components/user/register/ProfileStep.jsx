import React, { useState, useEffect } from 'react';
import { Loader, User, Mail, Shield, AtSign, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GoogleRegisterButton from './GoogleRegisterButton';
import { RegistrationLogo } from './EmailStep';

// Profile Step
export const ProfileStep = ({ formData, errors, isSubmitting, handleChange, handleFinalSubmit }) => (
  <div className="relative z-10 p-8">
    <RegistrationLogo />

    <div className="text-center mb-10">
      <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
        Complete Profile
      </h2>
      <p className="text-gray-400 max-w-md mx-auto">
        Just a few more details to get you started
      </p>
    </div>

    <form onSubmit={handleFinalSubmit} className="max-w-md mx-auto space-y-6">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <AtSign className="h-5 w-5 text-gray-400" />
        </div>
        <input
          id="username"
          name="username"
          type="text"
          required
          placeholder="Choose a unique username"
          value={formData.username}
          onChange={handleChange}
          className="pl-10 w-full px-4 py-3 bg-gray-700/50 border border-gray-600/30 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition duration-300"
        />
        {errors.username && (
          <div className="mt-2 text-sm text-red-400">{errors.username}</div>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Type className="h-5 w-5 text-gray-400" />
        </div>
        <input
          id="firstName"
          name="firstName"
          type="text"
          required
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
          className="pl-10 w-full px-4 py-3 bg-gray-700/50 border border-gray-600/30 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition duration-300"
        />
        {errors.firstName && (
          <div className="mt-2 text-sm text-red-400">{errors.firstName}</div>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Type className="h-5 w-5 text-gray-400" />
        </div>
        <input
          id="lastName"
          name="lastName"
          type="text"
          required
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
          className="pl-10 w-full px-4 py-3 bg-gray-700/50 border border-gray-600/30 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition duration-300"
        />
        {errors.lastName && (
          <div className="mt-2 text-sm text-red-400">{errors.lastName}</div>
        )}
      </div>

      {errors.submit && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl">
          {errors.submit}
        </div>
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
            Completing...
          </>
        ) : (
          'Complete Registration'
        )}
      </button>
    </form>
  </div>
);


export default ProfileStep;