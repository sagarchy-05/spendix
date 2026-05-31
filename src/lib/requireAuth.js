import jwt from 'jsonwebtoken';
import { AUD_SESSION } from '@/lib/jwtAudience';

export const AUTH_COOKIE = 'token';

// Reads the JWT from the httpOnly auth cookie and verifies it.
// Returns { userId, decoded } or { error, status }.
export function requireAuth(request) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    return { error: 'Access denied. No session.', status: 401 };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      audience: AUD_SESSION,
    });
    return { userId: decoded.userId, decoded };
  } catch {
    return { error: 'Invalid or expired session.', status: 401 };
  }
}

// Shared cookie shape so login & logout stay in sync.
export const authCookieOptions = ({ maxAge }) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge,
});
