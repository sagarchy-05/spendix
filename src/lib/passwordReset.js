import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongoose';
import User from '@/lib/models/User';
import { AUD_PASSWORD_RESET } from '@/lib/jwtAudience';

// Per-user signing key: by mixing the user's current bcrypt hash into the
// secret, any successful password change automatically invalidates every
// outstanding reset token for that user. No DB-backed "used tokens" table
// needed.
function tokenKeyFor(user) {
  return `${process.env.JWT_SECRET}:${user.password}`;
}

export function signPasswordResetToken(user) {
  return jwt.sign({ userId: user._id }, tokenKeyFor(user), {
    expiresIn: '1h',
    audience: AUD_PASSWORD_RESET,
  });
}

// Verifies a password-reset token. Returns { ok: true, user } on success or
// { ok: false, reason } where reason is 'expired' | 'invalid' | 'not-found'.
//
// Token verification needs the user's current password hash to construct
// the signing key, so this does a DB lookup. The token's userId is read
// via unverified decode just to find the user — the actual verification
// then happens with the per-user key.
export async function verifyPasswordResetToken(token) {
  if (!token || typeof token !== 'string') {
    return { ok: false, reason: 'invalid' };
  }

  let unverified;
  try {
    unverified = jwt.decode(token);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (!unverified?.userId) return { ok: false, reason: 'invalid' };

  await connectDB();
  const user = await User.findById(unverified.userId);
  if (!user) return { ok: false, reason: 'not-found' };

  try {
    jwt.verify(token, tokenKeyFor(user), { audience: AUD_PASSWORD_RESET });
  } catch (err) {
    return {
      ok: false,
      reason: err?.name === 'TokenExpiredError' ? 'expired' : 'invalid',
    };
  }

  return { ok: true, user };
}
