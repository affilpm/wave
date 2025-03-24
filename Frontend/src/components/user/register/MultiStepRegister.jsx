import React, { useState, useEffect } from 'react';
import { registerService } from '../../../services/user/registerService';
import EmailStep from './EmailStep';
import OTPStep from './OtpStep';
import ProfileStep from './ProfileStep';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify'; 

const MultiStepRegister = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    username: '',
    firstName: '',
    lastName: '',
    verificationToken: '',
  });

  const navigate = useNavigate();
  const location = useLocation();

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Track if we have a valid OTP verification in progress
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    // Check for expired message in location state
    if (location.state?.expiredMessage) {
      toast.error(location.state.expiredMessage);
      // Clear the state to prevent showing the message again on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
  const validateOTP = (otp) => otp.length === 6 && !isNaN(otp);
  const validateUsername = (username) => /^[a-zA-Z0-9_]+$/.test(username);
  const validateName = (name) => /^[a-zA-Z ]+$/.test(name);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!formData.email || !validateEmail(formData.email)) {
      setErrors({ email: 'Please enter a valid email' });
      return;
    }
    setIsSubmitting(true);
    try {
      await registerService.initiateRegistration(formData.email);
      setStep(2);
    } catch (error) {
      setErrors({ email: error.error || 'Failed to send OTP. Please try again.' });
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
      const response = await registerService.verifyOTP(formData.email, formData.otp);
      setFormData(prev => ({
        ...prev,
        verificationToken: response.verification_token
      }));
      setOtpVerified(true);
      setStep(3);
      // Show a success message with the time left to complete registration
      toast.success('Email verified! You have 5 minutes to complete your registration.');
    } catch (error) {
      // Handle expired OTP specifically
      if (error.error === 'Invalid or expired OTP') {
        setErrors({ otp: 'Your verification code has expired. Please request a new one.' });
      } else {
        setErrors({ otp: error.error || 'Invalid OTP. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOTP = async () => {
    try {
      await registerService.resendOTP(formData.email);
      // Show a success message
      toast.info('A new verification code has been sent to your email.');
      return true;
    } catch (error) {
      if (error.isRateLimited) {
        toast.error(error.message);
      } else {
        setErrors({ otp: error.error || 'Failed to resend OTP. Please try again.' });
      }
      return false;
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    let validationErrors = {};
    if (!formData.username.trim() || !validateUsername(formData.username)) {
      validationErrors.username = 'Username can only contain letters, numbers, and underscores.';
    }
    if (!formData.firstName.trim() || !validateName(formData.firstName)) {
      validationErrors.firstName = 'First name can only contain letters and spaces.';
    }
    if (!formData.lastName.trim() || !validateName(formData.lastName)) {
      validationErrors.lastName = 'Last name can only contain letters and spaces.';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await registerService.completeRegistration({
        email: formData.email,
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        verification_token: formData.verificationToken,
      });

      // Show a success message
      toast.success('Registration completed successfully!');
      navigate('/login');
      
    } catch (error) {
      // Check for session expiration error
      const errorMessage = error.error || 'Registration failed. Please try again.';
      if (errorMessage === 'Registration session expired. Please start over.') {
        // Redirect to home page with session expired message
        navigate('/register', { state: { expiredMessage: 'Your registration session has expired. Please start over.' } });
      } else {
        // Set other errors
        setErrors({ submit: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // If we're on step 3 (profile) and we haven't verified OTP, go back to step 1
  useEffect(() => {
    if (step === 3 && !otpVerified) {
      setStep(1);
      toast.error('Please complete the verification process first.');
    }
  }, [step, otpVerified]);

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <EmailStep
            formData={formData}
            errors={errors}
            isSubmitting={isSubmitting}
            handleChange={handleChange}
            handleEmailSubmit={handleEmailSubmit}
          />
        );
      case 2:
        return (
          <OTPStep
            formData={formData}
            errors={errors}
            isSubmitting={isSubmitting}
            handleChange={handleChange}
            handleOTPVerification={handleOTPVerification}
            goBack={() => setStep(1)}
            resendOTP={resendOTP}
          />
        );
      case 3:
        return (
          <ProfileStep
            formData={formData}
            errors={errors}
            isSubmitting={isSubmitting}
            handleChange={handleChange}
            handleFinalSubmit={handleFinalSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="max-w-lg w-full bg-gray-800 min-h-[450px] rounded-lg shadow-lg p-8">  
        {renderStepContent()}
      </div>
    </div>
  );
};

export default MultiStepRegister;