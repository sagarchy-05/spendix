'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import LoadingButton from '@/components/LoadingButton';
import TurnstileWidget from '@/components/TurnstileWidget';
import api from '@/lib/axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  useEffect(() => {
    document.title = 'Forgot Password - Spendix';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!turnstileToken) {
      setError('Please complete the CAPTCHA challenge.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', {
        email,
        turnstileToken,
      });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
      turnstileRef.current?.reset();
      setTurnstileToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container'>
      <div className='row justify-content-center'>
        <div className='col-12 col-md-8 col-lg-6'>
          <div className='card shadow-sm mt-4 mt-md-5'>
            <div className='card-body p-4 p-md-5'>
              <div className='text-center mb-4'>
                <i className='bi bi-key text-primary fs-1 d-block mb-3'></i>
                <h2 className='fw-bold'>Forgot your password?</h2>
                <p className='text-muted'>
                  Enter your email and we&apos;ll send you a link to reset it.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className='mb-3'>
                  <label htmlFor='email' className='form-label fw-medium'>
                    Email Address
                  </label>
                  <input
                    type='email'
                    className='form-control form-control-lg'
                    id='email'
                    placeholder='you@example.com'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <TurnstileWidget
                  ref={turnstileRef}
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken('')}
                />

                <div className='d-grid gap-2 mb-3'>
                  <LoadingButton
                    type='submit'
                    className='btn-primary py-2'
                    loading={loading}
                    disabled={!turnstileToken}
                    size='lg'
                  >
                    <i className='bi bi-envelope-arrow-up me-2'></i>
                    Send reset link
                  </LoadingButton>
                </div>

                {message && (
                  <div className='alert alert-success d-flex align-items-center'>
                    <i className='bi bi-check-circle-fill me-2'></i>
                    <div>{message}</div>
                  </div>
                )}
                {error && (
                  <div className='alert alert-danger d-flex align-items-center'>
                    <i className='bi bi-exclamation-triangle-fill me-2'></i>
                    <div>{error}</div>
                  </div>
                )}
              </form>

              <div className='text-center mt-4'>
                <p className='mb-0'>
                  Remembered it?{' '}
                  <Link
                    href='/login'
                    className='text-decoration-none fw-medium'
                  >
                    Back to login
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
