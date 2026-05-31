import Link from 'next/link';
import { verifyPasswordResetToken } from '@/lib/passwordReset';
import ResetPasswordClient from './ResetPasswordClient';

export const metadata = { title: 'Reset Password - Spendix' };

function InvalidLinkCard({ reason }) {
  const message =
    reason === 'expired'
      ? 'This reset link has expired. Request a new one to continue.'
      : 'This reset link is invalid or has already been used.';

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
        <h2 className='mb-3 fw-bold'>Link unusable</h2>
        <p className='text-muted mb-4'>{message}</p>
        <div className='d-grid gap-2'>
          <Link
            href='/forgot-password'
            className='btn btn-primary btn-lg'
          >
            Request a new link
          </Link>
          <Link href='/login' className='btn btn-link text-decoration-none'>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function ResetPasswordPage({ params }) {
  const { token } = await params;
  const result = await verifyPasswordResetToken(token);

  if (!result.ok) {
    return <InvalidLinkCard reason={result.reason} />;
  }

  return <ResetPasswordClient token={token} userEmail={result.user.email} />;
}
