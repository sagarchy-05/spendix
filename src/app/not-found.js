'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function NotFound() {
  useEffect(() => {
    document.title = '404 - Spendix';
  }, []);

  return (
    <div className='container'>
      <div className='row justify-content-center'>
        <div className='col-12 col-md-8 col-lg-6 text-center'>
          <div className='mt-5 pt-5'>
            <div className='position-relative mb-4' style={{ height: '200px' }}>
              <div className='position-absolute top-0 start-50 translate-middle-x'>
                <svg
                  width='200'
                  height='200'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z'
                    stroke='#DC3545'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                  <path d='M15 9L9 15' stroke='#DC3545' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                  <path d='M9 9L15 15' stroke='#DC3545' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </div>
            </div>

            <h1 className='display-3 fw-bold text-danger mb-3'>404</h1>
            <h2 className='h3 text-muted mb-4'>Page Not Found</h2>
            <p className='lead fs-5 mb-4'>
              Oops! The page you&apos;re looking for doesn&apos;t exist or has
              been moved.
            </p>

            <div className='d-grid gap-3 d-sm-flex justify-content-sm-center'>
              <Link href='/' className='btn btn-primary btn-lg px-4 gap-3'>
                <i className='bi bi-house-door me-2'></i>
                Go to Home
              </Link>
              <Link href='/dashboard' className='btn btn-outline-primary btn-lg px-4'>
                <i className='bi bi-speedometer2 me-2'></i>
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
