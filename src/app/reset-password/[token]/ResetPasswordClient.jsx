'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import LoadingButton from '@/components/LoadingButton';
import TurnstileWidget from '@/components/TurnstileWidget';
import { validatePassword } from '@/utils/passwordValidator';
import api from '@/lib/axios';

export default function ResetPasswordClient({ token, userEmail }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  const validation = validatePassword(password);
  const passwordsMatch = password.length > 0 && password === confirm;

  useEffect(() => {
    document.title = 'Reset Password - Spendix';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validation.valid) {
      setError('Password does not meet the requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords don’t match.');
      return;
    }
    if (!turnstileToken) {
      setError('Please complete the CAPTCHA challenge.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        password,
        turnstileToken,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Please try again.');
      turnstileRef.current?.reset();
      setTurnstileToken('');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
          <h2 className='mb-3 fw-bold'>Password reset</h2>
          <p className='text-muted mb-4'>
            Your password has been updated. You can now sign in with the new
            one.
          </p>
          <Link href='/login' className='btn btn-success btn-lg'>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='container'>
      <div className='row justify-content-center'>
        <div className='col-12 col-md-8 col-lg-6 col-xl-5'>
          <div className='card shadow-sm mt-4 mt-md-5'>
            <div className='card-body p-4 p-md-5'>
              <div className='text-center mb-4'>
                <i className='bi bi-shield-lock text-primary fs-1 d-block mb-3'></i>
                <h2 className='fw-bold mb-2'>Reset password</h2>
                {userEmail && (
                  <p className='text-muted small mb-0'>
                    for <strong>{userEmail}</strong>
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                <div className='mb-3'>
                  <label htmlFor='password' className='form-label fw-medium'>
                    New password
                  </label>
                  <input
                    type='password'
                    className={`form-control form-control-lg ${
                      password && !validation.valid ? 'is-invalid' : ''
                    } ${
                      password && validation.valid ? 'is-valid' : ''
                    }`}
                    id='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    required
                    autoFocus
                  />
                  {(passwordFocused || password.length > 0) && (
                    <ul className='list-unstyled small mt-2 mb-0'>
                      {validation.results.map((rule, i) => (
                        <li
                          key={i}
                          className={
                            rule.passed ? 'text-success' : 'text-muted'
                          }
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

                <div className='mb-4'>
                  <label htmlFor='confirm' className='form-label fw-medium'>
                    Confirm password
                  </label>
                  <input
                    type='password'
                    className={`form-control form-control-lg ${
                      confirm && !passwordsMatch ? 'is-invalid' : ''
                    } ${confirm && passwordsMatch ? 'is-valid' : ''}`}
                    id='confirm'
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  {confirm && !passwordsMatch && (
                    <div className='invalid-feedback d-block'>
                      Passwords don&apos;t match.
                    </div>
                  )}
                </div>

                <TurnstileWidget
                  ref={turnstileRef}
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken('')}
                />

                {error && (
                  <div className='alert alert-danger d-flex align-items-center mb-3'>
                    <i className='bi bi-exclamation-triangle-fill me-2'></i>
                    {error}
                  </div>
                )}

                <div className='d-grid gap-2'>
                  <LoadingButton
                    type='submit'
                    className='btn-primary py-2'
                    loading={loading}
                    disabled={
                      !validation.valid || !passwordsMatch || !turnstileToken
                    }
                    size='lg'
                  >
                    Update password
                  </LoadingButton>
                </div>
              </form>

              <div className='text-center mt-4'>
                <Link
                  href='/login'
                  className='text-decoration-none small text-muted'
                >
                  Back to login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
