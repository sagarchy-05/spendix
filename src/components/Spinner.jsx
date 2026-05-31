import React from 'react';

const Spinner = ({ fullScreen = false, size = 'md' }) => {
  return (
    <div
      className={`d-flex justify-content-center align-items-center ${
        fullScreen ? 'vh-100' : ''
      }`}
      style={!fullScreen ? { minHeight: '200px' } : {}}
    >
      <div
        className='spinner-border text-primary'
        role='status'
        style={{
          width: size === 'sm' ? '2rem' : size === 'lg' ? '4rem' : '3rem',
          height: size === 'sm' ? '2rem' : size === 'lg' ? '4rem' : '3rem',
        }}
      >
        <span className='visually-hidden'>Loading...</span>
      </div>
    </div>
  );
};

export default Spinner;
