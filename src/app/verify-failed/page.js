'use client';

import Link from 'next/link';

export default function VerifyFailedPage() {
  return (
    <div
      className='container d-flex justify-content-center align-items-center'
      style={{ minHeight: '80vh' }}
    >
      <div
        className='card shadow-sm p-4 p-md-5 text-center'
        style={{ maxWidth: '500px', width: '100%' }}
      >
        <div className='mb-4 text-danger'>
          <i className='bi bi-x-circle' style={{ fontSize: '4rem' }}></i>
        </div>
        <h2 className='mb-3 fw-bold'>Email Verification Failed</h2>
        <p className='text-muted mb-4'>The link may be expired or invalid.</p>

        <div className='d-grid gap-2'>
          <p className='mb-0'>
            Request a fresh link from the{' '}
            <Link
              href='/resend-verification'
              className='text-primary text-decoration-none fw-semibold'
            >
              resend verification page
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
