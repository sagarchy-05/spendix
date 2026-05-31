'use client';

import { forwardRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

const TurnstileWidget = forwardRef(({ onVerify, onExpire }, ref) => {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    return (
      <div className='alert alert-warning small mb-3 py-2'>
        CAPTCHA is not configured (missing{' '}
        <code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code>).
      </div>
    );
  }

  return (
    <div className='d-flex justify-content-center mb-3'>
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        onSuccess={onVerify}
        onExpire={() => onExpire?.()}
        onError={() => onExpire?.()}
      />
    </div>
  );
});

TurnstileWidget.displayName = 'TurnstileWidget';

export default TurnstileWidget;
