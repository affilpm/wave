import React from 'react';
import { ArrowLeft, FileText, Gavel, CheckCircle, AlertTriangle, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
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
            <h1 className="text-2xl font-bold text-white tracking-tight">Terms of Service</h1>
            <p className="text-sm text-gray-400 mt-0.5">Last updated: May 11, 2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Intro */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-yellow-500/10 rounded-2xl">
              <Gavel className="h-8 w-8 text-yellow-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Platform Agreement</h2>
          </div>
          <p className="text-lg text-gray-300 leading-relaxed">
            Welcome to Wave. By accessing or using our platform, you agree to be bound by these Terms of Service. Please read them carefully before using our services.
          </p>
        </section>

        {/* Content Sections */}
        <div className="grid gap-8">
          <section className="p-8 bg-gray-800/40 rounded-3xl border border-gray-700/50 backdrop-blur-sm transition-all hover:border-gray-600/50 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <h3 className="text-xl font-bold text-white">Acceptance of Terms</h3>
            </div>
            <p className="text-gray-400 leading-relaxed">
              By creating an account or using the Wave platform, you confirm that you are at least 13 years old and have the legal capacity to enter into this agreement. If you are using the service on behalf of an entity, you represent that you have the authority to bind that entity.
            </p>
          </section>

          <section className="p-8 bg-gray-800/40 rounded-3xl border border-gray-700/50 backdrop-blur-sm transition-all hover:border-gray-600/50 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="h-6 w-6 text-blue-400" />
              <h3 className="text-xl font-bold text-white">User Conduct</h3>
            </div>
            <p className="text-gray-400 leading-relaxed mb-4">
              You agree to use Wave only for lawful purposes. Prohibited activities include:
            </p>
            <ul className="space-y-3 text-gray-400">
              <li className="flex gap-3">
                <span className="text-blue-400">•</span>
                <span>Attempting to circumvent any content protection or usage limits.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400">•</span>
                <span>Uploading or sharing content that infringes on intellectual property rights.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400">•</span>
                <span>Engaging in any activity that disrupts the platform's performance.</span>
              </li>
            </ul>
          </section>

          <section className="p-8 bg-gray-800/40 rounded-3xl border border-gray-700/50 backdrop-blur-sm transition-all hover:border-gray-600/50 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-6 w-6 text-purple-400" />
              <h3 className="text-xl font-bold text-white">Subscriptions & Payments</h3>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Premium features require a paid subscription. All payments are processed through secure third-party providers. You can cancel your subscription at any time, but no refunds will be provided for partial billing periods unless required by law.
            </p>
          </section>

          <section className="p-8 bg-gray-800/40 rounded-3xl border border-gray-700/50 backdrop-blur-sm transition-all hover:border-gray-600/50 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <h3 className="text-xl font-bold text-white">Termination</h3>
            </div>
            <p className="text-gray-400 leading-relaxed">
              We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users or our business interests.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <footer className="pt-12 border-t border-gray-800/50 text-center">
          <p className="text-gray-500 text-sm">
            By using Wave, you acknowledge that you have read and understood these terms. For legal inquiries, contact <span className="text-yellow-400 underline cursor-pointer">legal@wave.audio</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default TermsOfService;
