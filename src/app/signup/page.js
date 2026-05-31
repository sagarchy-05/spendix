'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import LoadingButton from '@/components/LoadingButton';
import TurnstileWidget from '@/components/TurnstileWidget';
import { validatePassword } from '@/utils/passwordValidator';
import api from '@/lib/axios';

export default function SignupPage() {
  const router = useRouter();
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    document.title = 'Signup - Spendix';
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [alert, setAlert] = useState({ type: '', message: '', visible: false });
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  const passwordValidation = validatePassword(formData.password);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!passwordValidation.valid) {
      setAlert({
        type: 'danger',
        message:
          'Password does not meet the requirements. Please check the criteria below.',
        visible: true,
      });
      return;
    }

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
      const res = await api.post('/auth/signup', {
        ...formData,
        turnstileToken,
      });

      setAlert({
        type: 'success',
        message: res.data.message || 'Account created successfully!',
        visible: true,
      });

      redirectTimerRef.current = setTimeout(
        () => router.push('/login'),
        3000
      );
    } catch (error) {
      setAlert({
        type: 'danger',
        message: error.response?.data?.message || 'Signup failed',
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
              <h2 className='mb-4 text-center fw-bold'>Sign Up</h2>

              {alert.visible && (
                <Alert
                  type={alert.type}
                  message={alert.message}
                  onClose={() => setAlert({ ...alert, visible: false })}
                />
              )}

              <form onSubmit={handleSubmit}>
                <div className='mb-3'>
                  <label htmlFor='name' className='form-label fw-medium'>
                    Full Name
                  </label>
                  <input
                    type='text'
                    className='form-control form-control-lg'
                    id='name'
                    name='name'
                    value={formData.name}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </div>

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
                  />
                </div>

                <div className='mb-4'>
                  <label htmlFor='password' className='form-label fw-medium'>
                    Password
                  </label>
                  <input
                    type='password'
                    className={`form-control form-control-lg ${
                      formData.password && !passwordValidation.valid
                        ? 'is-invalid'
                        : ''
                    } ${
                      formData.password && passwordValidation.valid
                        ? 'is-valid'
                        : ''
                    }`}
                    id='password'
                    name='password'
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setPasswordFocused(true)}
                    required
                  />

                  {(passwordFocused || formData.password.length > 0) && (
                    <ul className='list-unstyled small mt-2 mb-0'>
                      {passwordValidation.results.map((rule, i) => (
                        <li
                          key={i}
                          className={rule.passed ? 'text-success' : 'text-muted'}
                        >
                          <i
                            className={`bi ${
                              rule.passed
                                ? 'bi-check-circle-fill'
                                : 'bi-circle'
                            } me-2`}
                          ></i>
                          {rule.message}
                        </li>
                      ))}
                    </ul>
                  )}
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
                    disabled={!passwordValidation.valid || !turnstileToken}
                    size='lg'
                  >
                    Sign Up
                  </LoadingButton>
                </div>
              </form>

              <div className='text-center mt-4'>
                <p className='mb-0'>
                  Already have an account?{' '}
                  <Link href='/login' className='text-decoration-none'>
                    Login
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
