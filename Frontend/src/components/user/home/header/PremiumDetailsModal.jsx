import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import api from '../../../../api';

const PremiumDetailsModal = ({ isOpen, onClose }) => {
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchSubscriptionDetails();
      document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }
    
    return () => {
      document.body.style.overflow = 'auto'; // Re-enable scrolling when modal closes
    };
  }, [isOpen]);

  useEffect(() => {
    // Close modal on click outside
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const fetchSubscriptionDetails = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/premium/check-subscription-status/');
      setSubscriptionDetails(data);
      setError(null);
    } catch (err) {
      setError('Failed to load subscription details. Please try again later.');
      console.error('Error fetching subscription details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
      <div 
        ref={modalRef}
        className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-800 animate-fadeIn"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Your Premium Details</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="w-10 h-10 border-4 border-gray-600 border-t-yellow-500 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-red-400">{error}</p>
            <button 
              onClick={fetchSubscriptionDetails}
              className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        ) : subscriptionDetails?.is_active ? (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-yellow-500">{subscriptionDetails.plan.name}</h3>
                <span className="px-2 py-1 bg-green-600 text-xs rounded-full">Active</span>
              </div>
              <p className="text-sm text-gray-300">Duration: {subscriptionDetails.plan.duration}</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Expires on</span>
                <span className="text-white font-medium">
                  {new Date(subscriptionDetails.expires_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Days remaining</span>
                <span className="text-white font-medium">
                  {subscriptionDetails.days_remaining} days
                </span>
              </div>
            </div>

            {/* <div className="mt-6 pt-4 border-t border-gray-800">
              <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">
                Manage Subscription
              </button>
            </div> */}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-gray-300 mb-4">{subscriptionDetails?.message || "You don't have an active premium subscription."}</p>
            <button 
              onClick={() => {
                onClose();
                window.location.href = '/premium';
              }}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-full text-sm font-medium transition-colors"
            >
              Get Premium
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumDetailsModal;