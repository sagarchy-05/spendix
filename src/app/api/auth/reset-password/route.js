import bcrypt from 'bcryptjs';
import { verifyPasswordResetToken } from '@/lib/passwordReset';
import { validatePassword } from '@/lib/passwordValidator';
import { verifyTurnstile } from '@/lib/verifyTurnstile';

export async function POST(request) {
  try {
    const { token, password, turnstileToken } = await request.json();

    if (!token || !password) {
      return Response.json(
        { message: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Cheap validation first — don't burn the single-use captcha on a
    // submission we'd reject anyway.
    const pwd = validatePassword(password);
    if (!pwd.valid) {
      return Response.json(
        { message: 'Password does not meet requirements', errors: pwd.errors },
        { status: 400 }
      );
    }

    const captcha = await verifyTurnstile(
      turnstileToken,
      request.headers.get('x-forwarded-for')
    );
    if (!captcha.ok) {
      return Response.json(
        { message: captcha.message, errors: captcha.errors },
        { status: captcha.status }
      );
    }

    const result = await verifyPasswordResetToken(token);
    if (!result.ok) {
      const message =
        result.reason === 'expired'
          ? 'This reset link has expired. Request a new one.'
          : 'This reset link is invalid or has already been used.';
      return Response.json({ message }, { status: 400 });
    }

    // Hash + save. As soon as `user.password` changes, the token's signing
    // key changes too, so any other in-flight reset links for this user
    // also become invalid. Single-use, no DB-side tracking needed.
    const salt = await bcrypt.genSalt(10);
    result.user.password = await bcrypt.hash(password, salt);
    await result.user.save();

    return Response.json({ message: 'Password reset. You can now log in.' });
  } catch (error) {
    console.error('Reset-password error:', error);
    return Response.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
