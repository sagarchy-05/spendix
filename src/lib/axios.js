import axios from 'axios';

// Same-origin Next.js API. The session lives in an httpOnly cookie that the
// browser attaches automatically, so we don't add an Authorization header
// here anymore.
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// On 401, bounce to /login. The cookie is already cleared (or invalid); the
// proxy will keep the user on /login until they reauthenticate.
//
// Callers can pass `_skipAuthRedirect: true` in the request config when 401
// is an *expected* answer (e.g. AuthContext probing /auth/me on every page
// load — a logged-out user on a public page shouldn't get force-redirected).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const skip = error.config?._skipAuthRedirect;
    if (
      !skip &&
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login')
    ) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
