'use client';

// Catches any unhandled error thrown by a server component or client
// component in the route tree. Without this, an error like "Mongo is down"
// would surface as a Next.js dev overlay (in dev) or a blank page (in prod)
// — and the raw error object can't be passed across the RSC boundary at
// all, which produces a confusing secondary "non-serializable" error.
import { useEffect } from 'react';

function friendlyMessage(error) {
  const msg = error?.message || '';
  if (
    msg.includes('ECONNREFUSED') ||
    msg.includes('Server selection') ||
    msg.includes('MongooseServerSelectionError')
  ) {
    return "Can't reach the database. If you're running locally, make sure mongod is up (or unset MONGODB_URI to use the in-memory server).";
  }
  if (msg.includes('JWT') || msg.includes('jwt')) {
    return 'Your session looks invalid. Try logging in again.';
  }
  return 'An unexpected error occurred. Try refreshing the page.';
}

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Route boundary caught:', error);
  }, [error]);

  return (
    <div className='container py-5'>
      <div className='row justify-content-center'>
        <div className='col-12 col-md-8 col-lg-6'>
          <div className='card shadow-sm'>
            <div className='card-body text-center py-5'>
              <i className='bi bi-exclamation-triangle text-danger fs-1 mb-3 d-block'></i>
              <h2 className='fw-bold mb-3'>Something went wrong</h2>
              <p className='text-muted'>{friendlyMessage(error)}</p>
              {process.env.NODE_ENV !== 'production' && error?.message && (
                <pre
                  className='text-start small text-muted bg-light p-3 mt-3 rounded'
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {error.message}
                </pre>
              )}
              <button
                type='button'
                onClick={reset}
                className='btn btn-primary mt-3'
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
