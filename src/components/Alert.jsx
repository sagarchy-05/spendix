'use client';

import React from 'react';

const Alert = ({ type = 'info', message, onClose }) => {
  if (!message) return null;

  return (
    <div
      className={`alert alert-${type} alert-dismissible fade show d-flex align-items-center justify-content-between`}
      role='alert'
    >
      <div className='flex-grow-1 me-3'>{message}</div>
      <button
        type='button'
        className='btn-close flex-shrink-0'
        onClick={onClose}
        aria-label='Close'
      ></button>
    </div>
  );
};

export default Alert;
