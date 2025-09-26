import React, { useState, useEffect } from 'react';

const ErrorDisplay = ({ error, onClearError, isRateLimited }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNetworkError, setShowNetworkError] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNetworkError(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowNetworkError(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      setShowNetworkError(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show network error if offline OR if there's an error and we're having connection issues
  const shouldShowNetworkError = !isOnline || showNetworkError;

  // Don't show anything if no error and online
  if (!error && !shouldShowNetworkError) return null;

  // Determine what to show
  let displayError = '';
  let errorType = 'general';

  if (shouldShowNetworkError) {
    displayError = 'No internet connection detected';
    errorType = 'network';
  } else if (isRateLimited) {
    displayError = error;
    errorType = 'rate-limited';
  } else {
    displayError = error;
    errorType = 'general';
  }

  const getErrorStyles = () => {
    switch (errorType) {
      case 'rate-limited':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'network':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    }
  };

  const getErrorIcon = () => {
    switch (errorType) {
      case 'network':
        return (
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 9l2 2c2.88-2.88 6.78-2.88 9.66 0L15 9c-4.28-4.28-11.72-4.28-16 0zm6 6l2 2 2-2c-1.38-1.38-3.62-1.38-5 0zm4-4l2 2c.69-.69 1.81-.69 2.5 0L18 11c-1.38-1.38-3.62-1.38-5 0z"/>
            <path d="M1 9l2 2c2.88-2.88 6.78-2.88 9.66 0L15 9c-4.28-4.28-11.72-4.28-16 0z" opacity="0.3"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
          </svg>
        );
      case 'rate-limited':
        return (
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        );
    }
  };

  return (
    <div className={`mt-2 p-3 text-center text-sm rounded-lg border ${getErrorStyles()}`}>
      <div className="flex items-center justify-center mb-2">
        {getErrorIcon()}
        <span className="font-medium">
          {errorType === 'network' ? 'Connection Issue' : 
           errorType === 'rate-limited' ? 'Rate Limited' : 'Playback Error'}
        </span>
      </div>
      
      <p className="mb-2">{displayError}</p>
      
      <div className="flex items-center justify-center space-x-3 text-xs">
        {errorType === 'network' ? (
          <>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-yellow-500/20 rounded hover:bg-yellow-500/30 transition-colors"
            >
              Retry
            </button>
            <span className="text-yellow-300">•</span>
            <span>Check your connection</span>
          </>
        ) : errorType === 'rate-limited' ? (
          <p>Please wait a few minutes before trying again</p>
        ) : (
          <button
            onClick={onClearError}
            className="px-3 py-1 bg-orange-500/20 rounded hover:bg-orange-500/30 transition-colors underline"
          >
            Clear Error
          </button>
        )}
      </div>

      {/* Network status indicator */}
      <div className="mt-2 flex items-center justify-center text-xs opacity-75">
        <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
        <span>{isOnline ? 'Online' : 'Offline'}</span>
      </div>
    </div>
  );
};

export default ErrorDisplay;