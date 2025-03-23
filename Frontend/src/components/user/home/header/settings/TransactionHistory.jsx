import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../../../../api';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await api.get('api/premium/transactions/');
        setTransactions(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load transaction history');
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, []);
  
  // Filter transactions based on search term and status filter
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.razorpay_order_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          transaction.razorpay_payment_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || transaction.status.toLowerCase() === filterStatus;
    
    return matchesSearch && matchesFilter;
  });
  
  // Function to download transaction history as CSV
  const downloadCSV = () => {
    if (transactions.length === 0) return;
    
    const headers = ['Date', 'Transaction ID', 'Order ID', 'Amount', 'Currency', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => [
        format(new Date(t.timestamp), 'yyyy-MM-dd HH:mm'),
        t.razorpay_payment_id,
        t.razorpay_order_id,
        t.amount,
        t.currency,
        t.status
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `transaction-history-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Status badge component with appropriate colors
  const StatusBadge = ({ status }) => {
    let bgColor = '';
    
    switch(status.toLowerCase()) {
      case 'success':
      case 'completed':
        bgColor = 'bg-green-500';
        break;
      case 'pending':
        bgColor = 'bg-yellow-500';
        break;
      case 'failed':
        bgColor = 'bg-red-500';
        break;
      default:
        bgColor = 'bg-gray-500';
    }
    
    return (
      <span className={`${bgColor} text-white text-xs px-2 py-1 rounded-full font-semibold`}>
        {status}
      </span>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center">
          <button
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-semibold">Back</span>
          </button>
          <h1 className="text-2xl font-bold ml-auto">Transaction History</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-6">
        {/* Filter Controls */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search transactions..."
              className="w-full bg-gray-800 rounded-lg p-2 pl-10 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          
          <div className="flex gap-4">
            <div className="relative">
              <select
                className="bg-gray-800 rounded-lg p-2 pl-10 text-white appearance-none cursor-pointer pr-8"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2"
              onClick={downloadCSV}
              disabled={filteredTransactions.length === 0}
            >
              <Download className="h-5 w-5" />
              <span>Export</span>
            </button>
          </div>
        </div>
        
        {/* Transactions Table */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading transaction history...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500">{error}</p>
            <button 
              className="mt-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-4 py-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400">No transactions found</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700 text-left">
                    <th className="p-4">Date</th>
                    <th className="p-4">Transaction ID</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction, index) => (
                    <tr 
                      key={transaction.id} 
                      className={`hover:bg-gray-700 transition-colors ${index !== filteredTransactions.length - 1 ? 'border-b border-gray-700' : ''}`}
                    >
                      <td className="p-4">
                        {format(new Date(transaction.timestamp), 'MMM dd, yyyy')}
                        <div className="text-xs text-gray-400">
                          {format(new Date(transaction.timestamp), 'HH:mm:ss')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>{transaction.razorpay_payment_id}</div>
                        <div className="text-xs text-gray-400">Order: {transaction.razorpay_order_id}</div>
                      </td>
                      <td className="p-4 font-semibold">
                        {transaction.amount} {transaction.currency}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={transaction.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default TransactionHistory;