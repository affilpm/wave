import React from 'react';
import { XCircle } from 'lucide-react';


const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] h-auto p-6 relative mx-4 sm:mx-8 md:mx-16 lg:mx-32 overflow-auto scrollbar-hidden">
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
      </div>
    );
  };
  
  export default Modal;