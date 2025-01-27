import React, { useState, useEffect } from 'react';
import { CheckCircle2, Music, Download } from 'lucide-react';
import api from '../../../../api';
import { useNavigate } from 'react-router-dom';


const Premium = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const navigate = useNavigate();


  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const premiumPlans = [
    {
      name: 'Individual',
      price: 1099,
      features: [
        'Ad-free music listening',
        'Play anywhere - even offline',
        'On-demand playback',
        'High quality audio'
      ],
      backgroundColor: 'bg-green-600',
      textColor: 'text-white'
    },
    {
      name: 'Duo',
      price: 1499,
      features: [
        'For 2 people living at the same address',
        'Ad-free music listening',
        'Play anywhere - even offline',
        'Spotify Family Mix playlist'
      ],
      backgroundColor: 'bg-blue-600',
      textColor: 'text-white'
    },
    {
      name: 'Family',
      price: 1599,
      features: [
        'Up to 6 people',
        'Block explicit music',
        'Ad-free music listening',
        'Spotify Kids app'
      ],
      backgroundColor: 'bg-purple-600',
      textColor: 'text-white'
    }
  ];

  useEffect(() => {
    // Check if script is already loaded to prevent multiple appends
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

  const handleGetStarted = async (plan) => {
    if (!razorpayLoaded) {
      alert('Razorpay is still loading. Please try again.');
      return;
    }

    try {
      // Create Razorpay order
      const orderResponse = await api.post('/api/premium/create-order/', { 
        plan: plan.name 
      });
      const { order_id, key_id, amount } = orderResponse.data;

      const options = {
        key: key_id,
        amount: amount * 100,
        currency: 'INR',
        name: 'Your App Name',
        description: `${plan.name} Premium Subscription`,
        order_id: order_id,
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await api.post('/api/premium/verify-payment/', {
              payment_id: response.razorpay_payment_id,
              order_id: response.razorpay_order_id,
              signature: response.razorpay_signature
            });

            if (verifyResponse.data.status === 'success') {
                navigate('/home');
              alert('Payment Successful! Your subscription is now active.');
              
              // Optional: Refresh user subscription status or redirect
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
      navigate('/home');
    }
  };


  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Premium</h1>
          <p className="text-xl text-gray-300">
            Discover more with Premium
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          {premiumPlans.map((plan) => (
            <div 
              key={plan.name}
              className={`${plan.backgroundColor} ${plan.textColor} rounded-lg p-6 shadow-xl transform transition hover:scale-105`}
            >
              <h2 className="text-2xl font-bold mb-4">{plan.name}</h2>
              <p className="text-4xl font-extrabold mb-6">₹{plan.price/100}/month</p>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle2 className="mr-2" />
                    {feature}
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

        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-12">Why Go Premium?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <Music size={64} className="text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Music Without Limits</h3>
              <p className="text-gray-300">Listen to any song, anytime</p>
            </div>
            <div className="flex flex-col items-center">
              <Download size={64} className="text-purple-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Download & Go</h3>
              <p className="text-gray-300">Save music for offline listening</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Premium;