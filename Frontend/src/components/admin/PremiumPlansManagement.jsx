import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';

const PremiumPlansManagement = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '',
    duration_label: '',
    features: '',
    is_active: true
  });

  // Define resetForm before using it
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration_days: '',
      duration_label: '',
      features: '',
      is_active: true
    });
    setEditingPlan(null);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Add a useEffect to automatically update duration_label when duration_days changes
  useEffect(() => {
    if (formData.duration_days) {
      const days = parseInt(formData.duration_days);
      let label = '';
      
      if (days % 365 === 0) {
        const years = days / 365;
        label = `${years} ${years === 1 ? 'Year' : 'Years'}`;
      } else if (days % 30 === 0) {
        const months = days / 30;
        label = `${months} ${months === 1 ? 'Month' : 'Months'}`;
      } else if (days % 7 === 0) {
        const weeks = days / 7;
        label = `${weeks} ${weeks === 1 ? 'Week' : 'Weeks'}`;
      } else {
        label = `${days} ${days === 1 ? 'Day' : 'Days'}`;
      }
      
      setFormData(prev => ({
        ...prev,
        duration_label: label
      }));
    }
  }, [formData.duration_days]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/premium/plans/');
      // Ensure we're handling both array responses and paginated responses
      const plansData = Array.isArray(response.data) ? response.data : 
                        response.data.results ? response.data.results : [];
      setPlans(plansData);
    } catch (error) {
      toast.error('Failed to fetch plans');
      console.error('Error fetching plans:', error);
      // Initialize with empty array on error
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Make a copy of the formData
      const formattedData = { ...formData };
      
      // Handle numeric fields correctly
      formattedData.price = parseFloat(formData.price) || 0;
      formattedData.duration_days = parseInt(formData.duration_days) || 0;
      
      // Handle features correctly based on backend expectations
      // If your backend expects a pipe-delimited string
      if (typeof formData.features === 'string' && formData.features) {
        // Convert comma-separated to pipe-delimited if needed
        const featuresArray = formData.features.split(',').map(feature => feature.trim());
        formattedData.features = featuresArray.join(' | ');
      } else if (Array.isArray(formData.features)) {
        formattedData.features = formData.features.join(' | ');
      } else {
        formattedData.features = '';
      }
      

      
      console.log('Sending data to server:', formattedData);
      
      let response;
      if (editingPlan) {
        response = await api.put(`/api/premium/plans/${editingPlan.id}/`, formattedData);
        toast.success('Plan updated successfully!');
      } else {
        response = await api.post('/api/premium/plans/', formattedData);
        toast.success('Plan created successfully!');
      }
      
      console.log('Success response:', response.data);
      fetchPlans();
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error object:', error);
      console.error('Response data:', error.response?.data);
      
      // Create a more detailed error message
      let errorMessage = 'Failed to save plan';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (Object.keys(error.response.data).length > 0) {
          // Handle field-specific errors from DRF
          const fieldErrors = Object.entries(error.response.data)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
          errorMessage = `Validation errors: ${fieldErrors}`;
        }
      }
      
      toast.error(errorMessage);
    }
  };
  
  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      duration_label: plan.duration_label || '',
      features: Array.isArray(plan.features) 
        ? plan.features.join(', ') 
        : typeof plan.features === 'string'
          ? plan.features.replace(/\s*\|\s*/g, ', ')
          : '',
      is_active: plan.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (planId) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      try {
        await api.delete(`/api/premium/plans/${planId}/`);
        toast.success('Plan deleted successfully');
        fetchPlans();
      } catch (error) {
        toast.error('Failed to delete plan');
        console.error('Error deleting plan:', error);
      }
    }
  };

  const togglePlanStatus = async (plan) => {
    try {
      await api.patch(`/api/premium/plans/${plan.id}/`, {
        is_active: !plan.is_active
      });
      toast.success(`Plan ${plan.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchPlans();
    } catch (error) {
      toast.error('Failed to update plan status');
      console.error('Error updating plan status:', error);
    }
  };

  // Helper function to safely parse features
  const getFeaturesArray = (features) => {
    // Check if features exists and is a string
    if (features && typeof features === 'string') {
      // Split by pipe delimiter (used in the database) or comma
      return features.includes('|') 
        ? features.split('|').map(feature => feature.trim())
        : features.split(',').map(feature => feature.trim());
    }
    // If features is already an array
    if (Array.isArray(features)) {
      return features;
    }
    // Default to empty array if features is null, undefined, or not a string/array
    return [];
  };

  // Helper to format duration for display
  const formatDuration = (plan) => {
    if (plan.duration_label) {
      return plan.duration_label;
    }
    return `${plan.duration_days} day${plan.duration_days !== 1 ? 's' : ''}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Premium Plans</h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-2 px-4 rounded-md transition"
        >
          {showForm ? (
            <>
              <X size={16} />
              Cancel
            </>
          ) : (
            <>
              <Plus size={16} />
              Add New Plan
            </>
          )}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 bg-gray-700 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-4">
            {editingPlan ? 'Edit Plan' : 'Create New Plan'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-300 mb-1">Plan Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-gray-600 text-white rounded-md px-3 py-2 border border-gray-600 focus:border-violet-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Price (INR)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="w-full bg-gray-600 text-white rounded-md px-3 py-2 border border-gray-600 focus:border-violet-500 focus:outline-none"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Duration (Days)</label>
                <input
                  type="number"
                  name="duration_days"
                  value={formData.duration_days}
                  onChange={handleInputChange}
                  className="w-full bg-gray-600 text-white rounded-md px-3 py-2 border border-gray-600 focus:border-violet-500 focus:outline-none"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Duration Label (Auto-generated)</label>
                <input
                  type="text"
                  name="duration_label"
                  value={formData.duration_label}
                  onChange={handleInputChange}
                  className="w-full bg-gray-600 text-white rounded-md px-3 py-2 border border-gray-600 focus:border-violet-500 focus:outline-none"
                  placeholder="Auto-generated based on days"
                  readOnly
                />
                <span className="text-xs text-gray-400 mt-1 block">This field is automatically generated based on the duration days</span>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Status</label>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-500 rounded"
                  />
                  <label className="ml-2 text-gray-300">Active</label>
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full bg-gray-600 text-white rounded-md px-3 py-2 border border-gray-600 focus:border-violet-500 focus:outline-none"
                rows="2"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Features (comma separated)</label>
              <textarea
                name="features"
                value={formData.features}
                onChange={handleInputChange}
                className="w-full bg-gray-600 text-white rounded-md px-3 py-2 border border-gray-600 focus:border-violet-500 focus:outline-none"
                rows="3"
                placeholder="Feature 1, Feature 2, Feature 3"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-md transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-violet-600 hover:bg-violet-700 text-white py-2 px-4 rounded-md transition"
              >
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500 mx-auto"></div>
          <p className="text-gray-400 mt-3">Loading plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-10 bg-gray-700 rounded-lg">
          <p className="text-gray-400">No plans available. Create your first plan!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Name</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Price</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Duration</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Features</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-700 divide-y divide-gray-600">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-600">
                  <td className="py-4 px-4 text-sm text-white">
                    <div className="font-medium">{plan.name}</div>
                    {plan.description && (
                      <div className="text-gray-400 text-xs mt-1">{plan.description}</div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-white">₹{parseFloat(plan.price).toFixed(2)}</td>
                  <td className="py-4 px-4 text-sm text-white">
                    {formatDuration(plan)}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        plan.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-white">
                    {plan.features ? (
                      <ul className="list-disc pl-4 text-xs text-gray-300">
                        {getFeaturesArray(plan.features).map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-400">No features listed</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => togglePlanStatus(plan)}
                        className={`p-1 rounded-full ${
                          plan.is_active
                            ? 'text-red-400 hover:text-red-500'
                            : 'text-green-400 hover:text-green-500'
                        }`}
                        title={plan.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {plan.is_active ? <X size={16} /> : <Check size={16} />}
                      </button>
                      <button
                        onClick={() => handleEdit(plan)}
                        className="p-1 rounded-full text-blue-400 hover:text-blue-500"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      {/* <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-1 rounded-full text-red-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button> */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PremiumPlansManagement;