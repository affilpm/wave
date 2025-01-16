import { useState } from 'react';

const MultiStepRegister = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    firstName: '',
    lastName: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const validateOTP = (otp) => {
    return otp.length === 6 && !isNaN(otp);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!validateEmail(formData.email)) {
      setErrors({ email: 'Please enter a valid email' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call to send OTP
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep(2);
    } catch (error) {
      setErrors({ email: 'Failed to send OTP. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOTPVerification = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!validateOTP(formData.otp)) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call to verify OTP
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep(3);
    } catch (error) {
      setErrors({ otp: 'Invalid OTP. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!formData.firstName.trim()) {
      setErrors(prev => ({ ...prev, firstName: 'First name is required' }));
      return;
    }

    if (!formData.lastName.trim()) {
      setErrors(prev => ({ ...prev, lastName: 'Last name is required' }));
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call to submit user details
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Registration successful:', formData);
      // Here you would typically redirect to success page or login
    } catch (error) {
      setErrors({ submit: 'Registration failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Register</h2>
              <p className="text-gray-600">Enter your email to get started</p>
            </div>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.email && (
                  <div className="mt-2 text-sm text-red-600">
                    {errors.email}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending OTP...' : 'Continue'}
              </button>
            </form>
          </div>
        );

      case 2:
        return (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Verify Email</h2>
              <p className="text-gray-600">Enter the OTP sent to {formData.email}</p>
            </div>
            <form onSubmit={handleOTPVerification} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium mb-1">
                  OTP
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={formData.otp}
                  onChange={handleChange}
                  maxLength={6}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.otp ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.otp && (
                  <div className="mt-2 text-sm text-red-600">
                    {errors.otp}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-blue-600 underline py-2"
              >
                Change Email
              </button>
            </form>
          </div>
        );

      case 3:
        return (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Complete Profile</h2>
              <p className="text-gray-600">Tell us a bit about yourself</p>
            </div>
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.firstName && (
                  <div className="mt-2 text-sm text-red-600">
                    {errors.firstName}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.lastName && (
                  <div className="mt-2 text-sm text-red-600">
                    {errors.lastName}
                  </div>
                )}
              </div>
              {errors.submit && (
                <div className="mt-2 text-sm text-red-600">
                  {errors.submit}
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Completing Registration...' : 'Complete Registration'}
              </button>
            </form>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg">
      {renderStepContent()}
    </div>
  );
};

export default MultiStepRegister;