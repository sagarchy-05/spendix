'use client';

import { createContext, useContext, useState } from 'react';
import api from '@/lib/axios';

const AuthContext = createContext();

// Initial user comes from the server-rendered root layout (which decodes the
// session cookie via `next/headers`). No more `/api/auth/me` round-trip on
// every page load — the initial HTML already encodes the auth state.
export const AuthProvider = ({ children, initialUser = null }) => {
  const [user, setUser] = useState(initialUser);

  // Called after a successful POST /auth/login (which set the cookie).
  const login = (userData) => {
    setUser({
      name: userData?.name || '',
      email: userData?.email || '',
    });
  };

  // Tells the server to clear the cookie, then clears local state.
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout request failed', e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
