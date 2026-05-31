import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE } from '@/lib/requireAuth';
import { AUD_SESSION } from '@/lib/jwtAudience';

// Decode the session cookie from a Server Component / Route Handler context.
// Returns null when there's no valid session — for use in places where
// "not logged in" is a normal outcome (e.g. the root layout).
export async function getServerUser() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      audience: AUD_SESSION,
    });
    return {
      userId: decoded.userId,
      name: decoded.name || '',
      email: decoded.email || '',
    };
  } catch {
    return null;
  }
}

// Same as above but redirects to /login when missing/invalid. For use in
// protected page server components — the edge proxy redirects too, but this
// is a defense-in-depth check that also satisfies type narrowing.
export async function requireServerUser() {
  const user = await getServerUser();
  if (!user) redirect('/login');
  return user;
}
