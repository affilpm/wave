import React from 'react';
import { CheckCircle2, Music, Smartphone, Download } from 'lucide-react';

const Premium = () => {
  const premiumPlans = [
    {
      name: 'Individual',
      price: '$10.99',
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
      price: '$14.99',
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
      price: '$15.99',
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

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Premium</h1>
          <p className="text-xl text-gray-300">
            Discover more with Spotify Premium
          </p>
        </header>

        {/* Premium Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {premiumPlans.map((plan) => (
            <div 
              key={plan.name}
              className={`${plan.backgroundColor} ${plan.textColor} rounded-lg p-6 shadow-xl transform transition hover:scale-105`}
            >
              <h2 className="text-2xl font-bold mb-4">{plan.name}</h2>
              <p className="text-4xl font-extrabold mb-6">{plan.price}/month</p>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle2 className="mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <button className="w-full bg-white text-black font-bold py-3 rounded-full hover:bg-gray-200 transition">
                Get Started
              </button>
            </div>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-12">Why Go Premium?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <Music size={64} className="text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Music Without Limits</h3>
              <p className="text-gray-300">Listen to any song, anytime</p>
            </div>
            {/* <div className="flex flex-col items-center">
              <Smartphone size={64} className="text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Mobile Access</h3>
              <p className="text-gray-300">Control music on all your devices</p>
            </div> */}
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