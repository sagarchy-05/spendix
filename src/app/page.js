'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = 'Home - Spendix';
  }, []);

  return (
    <div className='flex-grow-1 d-flex flex-column justify-content-center'>
      <div className='row justify-content-center align-items-center text-center'>
        <div className='col-12 col-md-10 col-lg-8'>
          <h1 className='display-4 fw-bold mb-4'>
            Welcome to Spendix <span className='text-primary'>💸</span>
          </h1>
          <p className='lead fs-4 mb-5'>
            Manage your expenses, set budgets, track spending, and gain
            insights — all in one place.
          </p>

          <div className='d-grid gap-3 d-sm-flex justify-content-sm-center mb-5'>
            {user ? (
              <Link href='/dashboard' className='btn btn-primary btn-lg px-4'>
                Go to Dashboard <i className='bi bi-arrow-right ms-2'></i>
              </Link>
            ) : (
              <>
                <Link href='/login' className='btn btn-primary btn-lg px-4'>
                  Login
                </Link>
                <Link
                  href='/signup'
                  className='btn btn-outline-secondary btn-lg px-4'
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
