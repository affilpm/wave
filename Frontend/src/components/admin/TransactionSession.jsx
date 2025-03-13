import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { apiInstance } from '../../api';
import { formatDistanceToNow } from 'date-fns';
import api from '../../api';




const TransactionSession = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, filterStatus]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admins/transactions/', {
        params: {
          page: currentPage,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          search: searchTerm || undefined,
          limit: itemsPerPage
        }
      });
      
      setTransactions(response.data.results);
      setTotalPages(Math.ceil(response.data.count / itemsPerPage));
      setLoading(false);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again.');
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTransactions();
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleRefund = async (transactionId) => {
    if (!window.confirm('Are you sure you want to process this refund?')) return;
    
    try {
      await apiInstance.post(`/api/admin/transactions/${transactionId}/refund/`);
      // Refresh transactions
      fetchTransactions();
      alert('Refund processed successfully');
    } catch (err) {
      console.error('Error processing refund:', err);
      alert('Failed to process refund. Please try again.');
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'authorized':
      case 'captured':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'refunded':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-gray-800 text-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Transaction Management</h2>
      
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <input
            type="text"
            placeholder="Search by user email or payment ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Search
          </button>
        </form>
        
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="captured">Captured</option>
          <option value="authorized">Authorized</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      
      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-6">
          {error}
        </div>
      )}
      
      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-gray-700 rounded-lg overflow-hidden">
          <thead className="bg-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Payment ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-600">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center">Loading transactions...</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center">No transactions found</td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-600">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.razorpay_payment_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatAmount(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span title={new Date(transaction.timestamp).toLocaleString()}>
                      {formatDistanceToNow(new Date(transaction.timestamp), { addSuffix: true })}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button
                      onClick={() => handleViewDetails(transaction)}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      View
                    </button>
                    {['captured', 'authorized'].includes(transaction.status.toLowerCase()) && (
                      <button
                        onClick={() => handleRefund(transaction.id)}
                        className="text-red-400 hover:text-red-600 ml-2"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="flex items-center">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-700 text-white rounded-l hover:bg-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            <div className="px-4 py-1 bg-gray-700 text-white">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-700 text-white rounded-r hover:bg-gray-600 disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        </div>
      )}
      
      {/* Transaction Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Transaction Details</h3>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400">Payment ID</p>
                <p className="font-medium">{selectedTransaction.razorpay_payment_id}</p>
              </div>
              <div>
                <p className="text-gray-400">Order ID</p>
                <p className="font-medium">{selectedTransaction.razorpay_order_id}</p>
              </div>
              <div>
                <p className="text-gray-400">Amount</p>
                <p className="font-medium">{formatAmount(selectedTransaction.amount)}</p>
              </div>
              <div>
                <p className="text-gray-400">Status</p>
                <p className="font-medium">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(selectedTransaction.status)}`}>
                    {selectedTransaction.status}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-gray-400">User</p>
                <p className="font-medium">{selectedTransaction.user.email}</p>
              </div>
              <div>
                <p className="text-gray-400">Date</p>
                <p className="font-medium">{new Date(selectedTransaction.timestamp).toLocaleString()}</p>
              </div>
              {selectedTransaction.subscription && (
                <>
                  <div>
                    <p className="text-gray-400">Subscription Plan</p>
                    <p className="font-medium">{selectedTransaction.subscription.plan.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Subscription Status</p>
                    <p className="font-medium">{selectedTransaction.subscription.status}</p>
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              {['captured', 'authorized'].includes(selectedTransaction.status.toLowerCase()) && (
                <button
                  onClick={() => {
                    handleRefund(selectedTransaction.id);
                    setShowDetailModal(false);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Process Refund
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionSession;