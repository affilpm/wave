import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';


const ErrorDisplay = React.memo(({ error, onClearError }) => {
  if (!error) return null;

  return (
    <div className="mt-2 flex items-center justify-center">
      <div className="flex items-center space-x-2 px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg max-w-md">
        <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span className="text-sm text-red-300 truncate">{error}</span>
        <button
          onClick={onClearError}
          className="ml-2 text-red-400 hover:text-red-300 flex-shrink-0"
          title="Dismiss"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>
  );
});


export default ErrorDisplay