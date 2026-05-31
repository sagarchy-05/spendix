import { requireAuth } from '@/lib/requireAuth';

// Returns the current user (name + email) from the auth cookie's JWT, or 401.
// Used by the frontend on mount to know if there's a live session, since the
// httpOnly cookie isn't readable from JS.
export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.error) {
    return Response.json({ message: auth.error }, { status: auth.status });
  }
  const { name, email } = auth.decoded || {};
  return Response.json({ user: { name, email } });
}
