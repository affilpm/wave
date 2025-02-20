import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wallet, DollarSign, TrendingUp, Clock, Download, ArrowUpRight, History } from 'lucide-react';

const earningsData = [
  { month: 'Jan', earnings: 1200 },
  { month: 'Feb', earnings: 1800 },
  { month: 'Mar', earnings: 1500 },
  { month: 'Apr', earnings: 2200 },
  { month: 'May', earnings: 2800 },
  { month: 'Jun', earnings: 2400 }
];

const WalletOverview = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Available Balance</p>
          <h3 className="text-3xl font-bold mt-2 dark:text-white">$2,458.20</h3>
          <p className="text-sm text-green-500 mt-1 flex items-center">
            <ArrowUpRight className="h-4 w-4 mr-1" />
            +12.5% from last month
          </p>
        </div>
        <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
          <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </div>

    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Earnings</p>
          <h3 className="text-3xl font-bold mt-2 dark:text-white">$680.00</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Available in 15 days
          </p>
        </div>
        <div className="p-4 bg-orange-100 dark:bg-orange-900 rounded-full">
          <DollarSign className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        </div>
      </div>
    </div>

    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Average Per Stream</p>
          <h3 className="text-3xl font-bold mt-2 dark:text-white">$0.004</h3>
          <p className="text-sm text-green-500 mt-1 flex items-center">
            <TrendingUp className="h-4 w-4 mr-1" />
            +0.0005 this week
          </p>
        </div>
        <div className="p-4 bg-green-100 dark:bg-green-900 rounded-full">
          <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
      </div>
    </div>
  </div>
);

const EarningsChart = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-8">
    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold dark:text-white">Earnings Overview</h2>
    </div>
    <div className="p-6">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={earningsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '0.5rem',
                color: '#F9FAFB'
              }} 
            />
            <Line type="monotone" dataKey="earnings" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const PaymentHistory = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold dark:text-white">Payment History</h2>
    </div>
    <div className="p-6">
      <div className="space-y-4">
        {[
          { date: 'June 15, 2024', amount: '$1,245.00', status: 'Completed' },
          { date: 'May 15, 2024', amount: '$980.50', status: 'Completed' },
          { date: 'April 15, 2024', amount: '$1,100.00', status: 'Completed' }
        ].map((payment, index) => (
          <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                <History className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium dark:text-white">{payment.date}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Payment #{2024000 + index}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium dark:text-white">{payment.amount}</p>
              <p className="text-sm text-green-500">{payment.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const WithdrawSection = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-8">
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold dark:text-white">Ready to withdraw?</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Minimum withdrawal amount: $50</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center transition-colors">
          <Download className="h-4 w-4 mr-2" />
          Withdraw Funds
        </button>
      </div>
    </div>
  </div>
);

const MonetizationPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Monetization & Wallet</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your earnings and track your revenue</p>
      </div>
      
      <WalletOverview />
      <WithdrawSection />
      <EarningsChart />
      <PaymentHistory />
    </div>
  );
};

export default MonetizationPage;