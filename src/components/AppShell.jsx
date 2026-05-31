'use client';

import { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { AuthProvider } from '@/context/AuthContext';
import { ConfirmDialogProvider } from './ConfirmDialog';
import Navbar from './Navbar';
import Footer from './Footer';

export default function AppShell({ children, initialUser = null }) {
  // Bootstrap JS bundle (dropdowns/collapses) — browser-only side effect
  useEffect(() => {
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return (
    <AuthProvider initialUser={initialUser}>
      <ConfirmDialogProvider>
        <div className='d-flex flex-column min-vh-100'>
          <Navbar />
          <div className='flex-grow-1 container my-3 d-flex flex-column'>
            <ToastContainer theme='dark' position='top-right' />
            {children}
          </div>
          <Footer />
          <SpeedInsights />
        </div>
      </ConfirmDialogProvider>
    </AuthProvider>
  );
}
