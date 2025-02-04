import React, { useState } from 'react';
import { registerService } from '../../../services/user/registerService';
import EmailStep from './EmailStep';
import OTPStep from './OtpStep';
import ProfileStep from './ProfileStep';
import { useNavigate } from 'react-router-dom';
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

  const navigate = useNavigate()

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
  const validateOTP = (otp) => otp.length === 6 && !isNaN(otp);

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
      await registerService .initiateRegistration(formData.email);
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
      setStep(3);
    } catch (error) {
      setErrors({ otp: error.error || 'Invalid OTP. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // In your parent component
  const resendOTP = async () => {
    
    try {
      console.log(formData.email)
      await registerService.resendOTP(formData.email);
      // Optionally show a success message
    } catch (error) {
      setErrors({ otp: 'Failed to resend OTP. Please try again.' });
    }
  };




  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!formData.username.trim() || !formData.firstName.trim() || !formData.lastName.trim()) {
      setErrors({
        username: !formData.username.trim() ? 'Username is required' : undefined,
        firstName: !formData.firstName.trim() ? 'First name is required' : undefined,
        lastName: !formData.lastName.trim() ? 'Last name is required' : undefined,
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await registerService .completeRegistration({
        email: formData.email,
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        verification_token: formData.verificationToken,
      });

      navigate('/login')
      
    } catch (error) {
      // Check for OTP expiration error
      const errorMessage = error.error || 'Registration failed. Please try again.';
      if (errorMessage === 'OTP verification expired. Please start over.') {
        // Redirect to home page with OTP expired message
        navigate('/register', { state: { expiredMessage: 'OTP verification expired. Please start over.' } });
        toast.error('OTP verification expired. Please start over.');
      } else {
        // Set other errors
        setErrors({ submit: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };


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