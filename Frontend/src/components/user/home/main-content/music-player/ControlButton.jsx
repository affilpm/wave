import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';

const ControlButton = React.memo(({ 
  onClick, 
  disabled, 
  className, 
  title, 
  children 
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={className}
    title={title}
  >
    {children}
  </button>
));


export default ControlButton