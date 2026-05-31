'use client';

import Link from 'next/link';

export default function VerifySuccessPage() {
  return (
    <div
      className='container d-flex justify-content-center align-items-center'
      style={{ minHeight: '80vh' }}
    >
      <div
        className='card shadow-sm p-4 p-md-5 text-center'
        style={{ maxWidth: '500px', width: '100%' }}
      >
        <div className='mb-4 text-success'>
          <i className='bi bi-check-circle' style={{ fontSize: '4rem' }}></i>
        </div>
        <h2 className='mb-3 fw-bold'>Email Verified Successfully</h2>
        <p className='text-muted mb-4'>You can now log in to your account.</p>

        <div className='d-grid'>
          <Link href='/login' className='btn btn-success btn-lg'>
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
