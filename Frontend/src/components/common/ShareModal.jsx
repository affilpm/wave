import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Facebook, Twitter, Mail, MessageCircle, Send } from 'lucide-react';
import { FaWhatsapp, FaFacebookF, FaRedditAlien, FaXTwitter } from 'react-icons/fa6';
import { toast } from 'react-toastify';

const ShareModal = ({ isOpen, onClose, shareUrl, title }) => {
  if (!isOpen) return null;

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title || 'Check this out on Wave!');

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: <FaWhatsapp className="w-6 h-6" />,
      color: 'bg-[#25D366]',
      url: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`
    },
    {
      name: 'X',
      icon: <FaXTwitter className="w-6 h-6" />,
      color: 'bg-black',
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
    },
    {
      name: 'Facebook',
      icon: <FaFacebookF className="w-6 h-6" />,
      color: 'bg-[#1877F2]',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    },
    {
      name: 'Reddit',
      icon: <FaRedditAlien className="w-6 h-6" />,
      color: 'bg-[#FF4500]',
      url: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`
    },
    {
      name: 'Email',
      icon: <Mail className="w-6 h-6" />,
      color: 'bg-gray-600',
      url: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`
    }
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Link copied to clipboard!', {
        position: "bottom-right",
        autoClose: 2000,
        theme: "dark",
      });
      onClose();
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Share</h2>
              <button 
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {shareOptions.map((option) => (
                <a
                  key={option.name}
                  href={option.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`w-14 h-14 ${option.color} rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110 group-active:scale-95`}>
                    <div className="text-white">
                      {option.icon}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-medium group-hover:text-white transition-colors">
                    {option.name}
                  </span>
                </a>
              ))}
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Copy Link
              </label>
              <div className="flex items-center gap-2 p-1 bg-black/40 border border-white/5 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent border-none text-sm text-gray-300 px-3 focus:ring-0 outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors active:scale-95"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareModal;
