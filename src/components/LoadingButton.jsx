'use client';

import React from 'react';

function LoadingButton({
  loading,
  disabled,
  children,
  className = '',
  ...props
}) {
  return (
    <button
      className={`btn position-relative ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      <span className={loading ? 'invisible' : ''}>{children}</span>

      {loading && (
        <span className='position-absolute top-50 start-50 translate-middle'>
          <span
            className='spinner-border spinner-border-sm'
            role='status'
            aria-hidden='true'
          >
            <span className='visually-hidden'>Loading...</span>
          </span>
        </span>
      )}
    </button>
  );
}

export default LoadingButton;
