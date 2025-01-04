import React from 'react';
import { XCircle } from 'lucide-react';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] h-auto p-6 relative mx-4 sm:mx-8 md:mx-16 lg:mx-32 overflow-auto">
        {/* Close Button */}
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-600 hover:bg-gray-200 rounded-full p-2 transition-all ease-in-out duration-300"
          onClick={onClose}
        >
          <XCircle className="h-8 w-8 text-gray-600 hover:text-blue-500 transition-all ease-in-out duration-300" />
        </button>
        {children}
      </div>
      <style jsx>{`
        /* Custom Scrollbar */
        .overflow-auto::-webkit-scrollbar {
          width: 8px;
        }
        .overflow-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .overflow-auto::-webkit-scrollbar-thumb {
          background-color: #888;
          border-radius: 10px;
          border: 3px solid #f1f1f1;
        }
        .overflow-auto::-webkit-scrollbar-thumb:hover {
          background-color: #555;
        }
      `}</style>
    </div>
  );
};

export default Modal;