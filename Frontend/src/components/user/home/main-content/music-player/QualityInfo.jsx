import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';


const QualityInfo = React.memo(({ qualityInfo }) => {
  if (!qualityInfo.served) return null;

  return (
    <div className="mt-2 flex items-center justify-center">
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <span>Quality:</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          qualityInfo.matched 
            ? 'bg-green-900/50 text-green-300 border border-green-700' 
            : 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
        }`}>
          {qualityInfo.served}
        </span>
        {qualityInfo.preferred && qualityInfo.served !== qualityInfo.preferred && (
          <>
            <span className="text-gray-600">•</span>
            <span>Preferred: {qualityInfo.preferred}</span>
          </>
        )}
      </div>
    </div>
  );
});


export default QualityInfo