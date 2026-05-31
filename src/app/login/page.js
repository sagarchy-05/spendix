'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import LoadingButton from '@/components/LoadingButton';
import TurnstileWidget from '@/components/TurnstileWidget';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [alert, setAlert] = useState({ type: '', message: '', visible: false });
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    document.title = 'Signin - Spendix';
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!turnstileToken) {
      setAlert({
        type: 'danger',
        message: 'Please complete the CAPTCHA challenge.',
        visible: true,
      });
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        ...formData,
        turnstileToken,
      });

      // Cookie was set by the response. We just keep the user info in context.
      login({
        name: res.data.user.name,
        email: res.data.user.email,
      });

      setAlert({
        type: 'success',
        message: 'Logged in successfully!',
        visible: true,
      });

      redirectTimerRef.current = setTimeout(
        () => router.push('/dashboard'),
        1000
      );
    } catch (error) {
      setAlert({
        type: 'danger',
        message: error.response?.data?.message || 'Login failed',
        visible: true,
      });
      turnstileRef.current?.reset();
      setTurnstileToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container'>
      <div className='row justify-content-center'>
        <div className='col-12 col-md-8 col-lg-6 col-xl-5'>
          <div className='card shadow-sm mt-4 mt-md-5'>
            <div className='card-body p-4 p-md-5'>
              <h2 className='mb-4 text-center fw-bold'>Login</h2>

              {alert.visible && (
                <Alert
                  type={alert.type}
                  message={alert.message}
                  onClose={() => setAlert({ ...alert, visible: false })}
                />
              )}

              <form onSubmit={handleSubmit}>
                <div className='mb-3'>
                  <label htmlFor='email' className='form-label fw-medium'>
                    Email address
                  </label>
                  <input
                    type='email'
                    className='form-control form-control-lg'
                    id='email'
                    name='email'
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </div>

                <div className='mb-4'>
                  <div className='d-flex justify-content-between align-items-baseline'>
                    <label htmlFor='password' className='form-label fw-medium'>
                      Password
                    </label>
                    <Link
                      href='/forgot-password'
                      className='small text-decoration-none'
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    type='password'
                    className='form-control form-control-lg'
                    id='password'
                    name='password'
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                <TurnstileWidget
                  ref={turnstileRef}
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken('')}
                />

                <div className='d-grid gap-2'>
                  <LoadingButton
                    type='submit'
                    className='btn-primary py-2'
                    loading={loading}
                    disabled={!turnstileToken}
                    size='lg'
                  >
                    Login
                  </LoadingButton>
                </div>
              </form>

              <div className='text-center mt-4'>
                <p className='mb-0'>
                  Don&apos;t have an account?{' '}
                  <Link href='/signup' className='text-decoration-none'>
                    Sign up
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
