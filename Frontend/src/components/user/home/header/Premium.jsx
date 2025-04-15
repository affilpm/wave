import React, { useState, useEffect } from 'react';
import { CheckCircle2, Music, Download, Calendar } from 'lucide-react';
import api from '../../../../api';
import { useNavigate } from 'react-router-dom';

const Premium = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/premium/plans/');
        setPlans(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load premium plans. Please try again later.');
        console.error('Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Load Razorpay script
  useEffect(() => {
    if (!document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setRazorpayLoaded(true);
      document.body.appendChild(script);
    } else {
      setRazorpayLoaded(true);
    }
  }, []);

  // Get background color based on duration days
  const getPlanColor = (durationDays) => {
    // Color scheme based on duration length
    if (durationDays <= 7) return 'bg-green-600'; // Weekly or less
    if (durationDays <= 31) return 'bg-blue-600'; // Monthly
    if (durationDays <= 100) return 'bg-purple-600'; // Quarterly
    return 'bg-red-600'; // Yearly or more
  };

  const handleGetStarted = async (plan) => {
    if (!razorpayLoaded) {
      alert('Payment gateway is still loading. Please try again.');
      return;
    }

    try {
      const orderResponse = await api.post('/api/premium/create-order/', { 
        plan_id: plan.id 
      });
      
      const { order_id, key_id, amount } = orderResponse.data;

      const options = {
        key: key_id,
        amount: amount * 100,
        currency: 'INR',
        name: 'Your App Name',
        description: `${plan.name} (${plan.duration_label}) Premium Subscription`,
        order_id: order_id,
        handler: async (response) => {
          try {
            const verifyResponse = await api.post('/api/premium/verify-payment/', {
              payment_id: response.razorpay_payment_id,
              order_id: response.razorpay_order_id,
              signature: response.razorpay_signature
            });

            if (verifyResponse.data.status === 'success') {
              navigate('/home');
              alert('Payment Successful! Your subscription is now active.');
            }
          } catch (error) {
            console.error('Payment verification failed', error);
            alert('Payment Verification Failed');
          }
        },
        theme: { color: '#3399cc' }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Order creation failed', error);
      alert('Failed to create order. Please try again.');
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading Premium Plans...</h2>
          <div className="animate-spin h-10 w-10 border-4 border-white rounded-full border-t-transparent mx-auto"></div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/home')}
            className="bg-white text-black font-bold py-3 px-6 rounded-full hover:bg-gray-200 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <button
            onClick={() => navigate('/home')}
            className="text-white font-semibold text-lg mb-6 flex items-center justify-start space-x-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Back</span>
          </button>

          <h1 className="text-5xl font-bold mb-4">Premium</h1>
          <p className="text-xl text-gray-300">Choose a plan that fits your needs</p>
        </header>

        {/* Premium Plan Cards */}
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`${getPlanColor(plan.duration_days)} text-white rounded-lg p-6 shadow-xl transform transition hover:scale-105`}
            >
              <h2 className="text-2xl font-bold mb-4">{plan.name}</h2>
              <div className="flex items-baseline mb-2">
                <p className="text-4xl font-extrabold">₹{plan.price}</p>
              </div>
              <div className="mb-6 flex items-center">
                <Calendar className="mr-2" size={16} />
                <span>{plan.duration_label}</span>
              </div>

              <ul className="space-y-3 mb-8">
  {Array.isArray(plan.features) && plan.features.map((feature, index) => (
    <li key={index} className="flex items-center">
      <CheckCircle2 className="mr-2" size={16} />
      <span>{feature}</span>
    </li>
  ))}
</ul>

              <button
                onClick={() => handleGetStarted(plan)}
                className="w-full bg-white text-black font-bold py-3 rounded-full hover:bg-gray-200 transition"
              >
                Get Started
              </button>
            </div>
          ))}
        </div>

        {/* Why Go Premium Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-12">Why Go Premium?</h2>
          <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <Music size={64} className="text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Music Without Limits</h3>
              <p className="text-gray-300">Listen to any song, anytime</p>
            </div>
            <div className="flex flex-col items-center">
              <Download size={64} className="text-purple-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Add Free</h3>
              <p className="text-gray-300">Offline music listening</p>
            </div>
            <div className="flex flex-col items-center">
              <Calendar size={64} className="text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Flexible Plans</h3>
              <p className="text-gray-300">Choose from various subscription durations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Premium;