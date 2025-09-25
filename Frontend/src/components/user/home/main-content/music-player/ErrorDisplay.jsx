import React from 'react';

const ErrorDisplay = ({ error, onClearError, isRateLimited }) => {
  if (!error) return null;

  return (
    <div className={`mt-2 p-2 text-center text-sm rounded ${
      isRateLimited ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
    }`}>
      <p>{error}</p>
      <div className="mt-2">
        {isRateLimited ? (
          <p className="text-xs">Please wait a few minutes before trying again.</p>
        ) : (
          <button
            onClick={onClearError}
            className="text-xs underline hover:text-orange-300"
          >
            Clear Error
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;