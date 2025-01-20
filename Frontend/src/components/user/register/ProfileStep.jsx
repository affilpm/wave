import React from 'react';
import { Loader } from 'lucide-react';

const ProfileStep = ({ formData, errors, isSubmitting, handleChange, handleFinalSubmit }) => (
  <>
    <div className="flex justify-center mb-8">
      <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center">
        <img src="/shape.png" alt="Logo" className="h-auto w-auto" />
      </div>
    </div>

    <div className="text-center">
      <h2 className="text-3xl font-bold text-gray-100 mb-2">
        Complete Profile
      </h2>
      <p className="text-gray-400 text-sm mb-8">
        Tell us a bit about yourself
      </p>
    </div>

    <form onSubmit={handleFinalSubmit} className="space-y-4">
      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-gray-300">
          First Name
        </label>
        <input
          id="firstName"
          name="firstName"
          type="text"
          required
          placeholder="Enter your first name"
          value={formData.firstName}
          onChange={handleChange}
          className="mt-1 block w-full rounded-full border border-gray-600 bg-gray-700 text-gray-100 px-4 py-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.firstName && (
          <div className="mt-2 text-sm text-red-500">{errors.firstName}</div>
        )}
      </div>

      <div>
        <label htmlFor="lastName" className="block text-sm font-medium text-gray-300">
          Last Name
        </label>
        <input
          id="lastName"
          name="lastName"
          type="text"
          required
          placeholder="Enter your last name"
          value={formData.lastName}
          onChange={handleChange}
          className="mt-1 block w-full rounded-full border border-gray-600 bg-gray-700 text-gray-100 px-4 py-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.lastName && (
          <div className="mt-2 text-sm text-red-500">{errors.lastName}</div>
        )}
      </div>

      {errors.submit && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative">
          {errors.submit}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isSubmitting ? (
          <span className="flex items-center">
            <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
            Completing...
          </span>
        ) : (
          'Complete Registration'
        )}
      </button>
    </form>
  </>
);


export default ProfileStep;