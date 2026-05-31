import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { AUD_SESSION } from '@/lib/jwtAudience';

// Next.js 16 renamed `middleware.js` → `proxy.js`. Same purpose: run logic
// at the edge before a route handler / page renders.
//
// We use it to:
//   - bounce un-authenticated users away from protected pages
//   - bounce authenticated users away from auth landing pages
//
// The httpOnly cookie isn't visible to JS, so this is also how the app knows
// to redirect after a fresh page load (no localStorage anymore).

const AUTH_COOKIE = 'token';

// Pages that require a valid session
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/transactions',
  '/budgets',
  '/charts',
  '/insights',
];

// Pages that signed-in users shouldn't see (we send them to /dashboard instead)
const AUTH_LANDING_PATHS = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
]);

let cachedKey;
function getKey() {
  if (cachedKey) return cachedKey;
  cachedKey = new TextEncoder().encode(process.env.JWT_SECRET || '');
  return cachedKey;
}

async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      audience: AUD_SESSION,
    });
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const authed = await verifyToken(token);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  if (isProtected && !authed) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (AUTH_LANDING_PATHS.has(pathname) && authed) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Run on every page route. Skip API, static assets, image optimizer, and
// any file with an extension (favicon.png, .well-known, etc.).
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};
