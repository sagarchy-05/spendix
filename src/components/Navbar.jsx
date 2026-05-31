'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const closeNavbar = () => setIsNavExpanded(false);

  const isActive = (path) =>
    pathname?.toLowerCase() === path.toLowerCase() ? 'active' : '';

  return (
    <nav className='navbar navbar-expand-lg navbar-dark spx-navbar px-3 px-md-4 py-2'>
      <div className='container-fluid'>
        <Link className='navbar-brand fw-bold' href='/' onClick={closeNavbar}>
          Spendix
        </Link>

        <button
          className={`navbar-toggler ${isNavExpanded ? '' : 'collapsed'}`}
          type='button'
          aria-controls='navbarContent'
          aria-expanded={isNavExpanded}
          aria-label='Toggle navigation'
          onClick={() => setIsNavExpanded(!isNavExpanded)}
        >
          <span
            className={`navbar-toggler-icon ${
              isNavExpanded ? 'navbar-toggler-x' : ''
            }`}
          ></span>
        </button>

        <div
          className={`collapse navbar-collapse ${isNavExpanded ? 'show' : ''}`}
          id='navbarContent'
          style={
            isNavExpanded
              ? {
                  position: 'fixed',
                  top: '56px',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#11161f',
                  borderTop: '1px solid #30363d',
                  zIndex: 1040,
                  overflowY: 'auto',
                }
              : {}
          }
        >
          <ul className='navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center'>
            {!user ? (
              <>
                <li className='nav-item text-center text-lg-start'>
                  <Link
                    className={`nav-link px-2 px-md-3 ${isActive('/login')}`}
                    href='/login'
                    onClick={closeNavbar}
                  >
                    Login
                  </Link>
                </li>
                <li className='nav-item text-center text-lg-start'>
                  <Link
                    className={`nav-link px-2 px-md-3 ${isActive('/signup')}`}
                    href='/signup'
                    onClick={closeNavbar}
                  >
                    Signup
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li className='nav-item text-center text-lg-start'>
                  <Link
                    className={`nav-link px-2 px-md-3 ${isActive('/dashboard')}`}
                    href='/dashboard'
                    onClick={closeNavbar}
                  >
                    Dashboard
                  </Link>
                </li>
                <li className='nav-item text-center text-lg-start'>
                  <Link
                    className={`nav-link px-2 px-md-3 ${isActive('/budgets')}`}
                    href='/budgets'
                    onClick={closeNavbar}
                  >
                    Budgets
                  </Link>
                </li>
                <li className='nav-item text-center text-lg-start'>
                  <Link
                    className={`nav-link px-2 px-md-3 ${isActive('/transactions')}`}
                    href='/transactions'
                    onClick={closeNavbar}
                  >
                    Transactions
                  </Link>
                </li>
                <li className='nav-item text-center text-lg-start'>
                  <Link
                    className={`nav-link px-2 px-md-3 ${isActive('/charts')}`}
                    href='/charts'
                    onClick={closeNavbar}
                  >
                    Charts
                  </Link>
                </li>
                <li className='nav-item text-center text-lg-start'>
                  <Link
                    className={`nav-link px-2 px-md-3 ${isActive('/insights')}`}
                    href='/insights'
                    onClick={closeNavbar}
                  >
                    AI Insights
                  </Link>
                </li>
                <li className='nav-item text-center mt-2 mt-lg-0 ms-lg-2 d-flex align-items-center justify-content-center'>
                  <button
                    className='btn btn-danger btn-sm px-3 py-1 rounded-pill d-flex align-items-center justify-content-center'
                    onClick={handleLogout}
                  >
                    <span>Logout</span>
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      <style>{`
        .navbar-toggler-x {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba(255, 255, 255, 0.8)' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e");
          transition: transform 0.3s ease;
        }
        .navbar-toggler-x:not(.collapsed) {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba(255, 255, 255, 0.8)' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7L26 23M4 23L26 7'/%3e%3c/svg%3e");
        }
        @media (max-width: 991.98px) {
          .navbar-collapse.show {
            position: fixed;
            top: 56px;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #11161f;
            border-top: 1px solid #30363d;
            z-index: 1040;
            overflow-y: auto;
            padding: 20px;
          }
          .navbar-collapse.show .navbar-nav {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 0.25rem;
          }
          .navbar-collapse.show .nav-link {
            font-size: 1.1rem;
            padding: 0.75rem 1rem !important;
            border-radius: 0.5rem;
          }
          .navbar-collapse.show .nav-link.active {
            background-color: rgba(79, 140, 255, 0.12);
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
