'use client';

import { useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/Spinner';
import api from '@/lib/axios';

// Lands here from the email link. Auto-POSTs the token to the API on mount,
// then redirects to the success or failed page. The GET → page → POST hop
// is intentional: email pre-fetch scanners that follow links never execute
// this client JS, so they can't trigger verification by accident.
export default function VerifyEmailPage({ params }) {
  const router = useRouter();
  const { token } = use(params);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return; // StrictMode double-mount guard
    ranRef.current = true;

    (async () => {
      try {
        await api.post(
          '/auth/verify-email',
          { token },
          { _skipAuthRedirect: true }
        );
        router.replace('/verify-success');
      } catch {
        router.replace('/verify-failed');
      }
    })();
  }, [token, router]);

  return (
    <div className='container py-5'>
      <div className='text-center'>
        <Spinner />
        <p className='text-muted mt-3'>Verifying your email…</p>
      </div>
    </div>
  );
}
