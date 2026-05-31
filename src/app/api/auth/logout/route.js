import { NextResponse } from 'next/server';
import { AUTH_COOKIE, authCookieOptions } from '@/lib/requireAuth';

// Clears the session by overwriting the cookie with maxAge: 0.
export async function POST() {
  const response = NextResponse.json({ message: 'Logged out' });
  response.cookies.set(AUTH_COOKIE, '', authCookieOptions({ maxAge: 0 }));
  return response;
}
