import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, FileText, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-black/40 backdrop-blur-xl z-10 border-b border-gray-800/50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center">
          <button
            className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-800/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all mr-4 md:hidden"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-gray-400 mt-0.5">Last updated: May 11, 2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Intro */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-indigo-500/10 rounded-2xl">
              <Shield className="h-8 w-8 text-indigo-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Your Privacy Matters</h2>
          </div>
          <p className="text-lg text-gray-300 leading-relaxed">
            At Wave, we are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your data when you use our music streaming platform.
          </p>
        </section>

        {/* Content Sections */}
        <div className="grid gap-8">
          <section className="p-8 bg-gray-800/40 rounded-3xl border border-gray-700/50 backdrop-blur-sm transition-all hover:border-gray-600/50 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="h-6 w-6 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Information We Collect</h3>
            </div>
            <ul className="space-y-4 text-gray-400">
              <li className="flex gap-3">
                <span className="text-blue-400 mt-1">•</span>
                <span><strong className="text-gray-200">Account Data:</strong> We collect your email address, username, and profile information when you register.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400 mt-1">•</span>
                <span><strong className="text-gray-200">Usage Information:</strong> We track your listening history, playlists, and interactions to personalize your experience.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400 mt-1">•</span>
                <span><strong className="text-gray-200">Device Data:</strong> Information about the devices you use to access Wave, including IP addresses and browser types.</span>
              </li>
            </ul>
          </section>

          <section className="p-8 bg-gray-800/40 rounded-3xl border border-gray-700/50 backdrop-blur-sm transition-all hover:border-gray-600/50 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-6 w-6 text-green-400" />
              <h3 className="text-xl font-bold text-white">How We Use Your Data</h3>
            </div>
            <p className="text-gray-400 leading-relaxed">
              We use your information to provide, personalize, and improve our services. This includes generating recommendations, processing subscriptions, and ensuring the security of our platform. We do not sell your personal data to third parties.
            </p>
          </section>

          <section className="p-8 bg-gray-800/40 rounded-3xl border border-gray-700/50 backdrop-blur-sm transition-all hover:border-gray-600/50 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="h-6 w-6 text-purple-400" />
              <h3 className="text-xl font-bold text-white">Data Sharing</h3>
            </div>
            <p className="text-gray-400 leading-relaxed mb-4">
              We may share your information with service providers who perform functions on our behalf, such as payment processing and data analysis. These parties are obligated to protect your data.
            </p>
            <p className="text-gray-400 leading-relaxed">
              In certain circumstances, we may be required to disclose your data if required by law or to protect our rights and the safety of our users.
            </p>
          </section>

          <section className="p-8 bg-gray-800/40 rounded-3xl border border-gray-700/50 backdrop-blur-sm transition-all hover:border-gray-600/50 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-6 w-6 text-orange-400" />
              <h3 className="text-xl font-bold text-white">Your Rights</h3>
            </div>
            <p className="text-gray-400 leading-relaxed">
              You have the right to access, correct, or delete your personal information. You can manage your data settings directly within the app, or close your account at any time to remove your personal information from our active databases.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <footer className="pt-12 border-t border-gray-800/50 text-center">
          <p className="text-gray-500 text-sm">
            If you have any questions about this Privacy Policy, please contact us at <span className="text-indigo-400 underline cursor-pointer">privacy@wave.audio</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
