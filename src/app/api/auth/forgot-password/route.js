import { connectDB } from '@/lib/mongoose';
import User from '@/lib/models/User';
import { sendPasswordResetEmail } from '@/lib/emailService';
import { verifyTurnstile } from '@/lib/verifyTurnstile';

// Generic response sent regardless of whether the email exists or whether
// the user is verified — prevents this endpoint from being an email
// enumeration oracle.
const GENERIC_OK = {
  message:
    "If an account with that email exists, we've sent a reset link. Check your inbox (and your spam folder if not received in a minute).",
};

export async function POST(request) {
  try {
    const body = await request.json();
    const email = body?.email?.toLowerCase().trim();

    if (!email) {
      return Response.json({ message: 'Email is required' }, { status: 400 });
    }

    const captcha = await verifyTurnstile(
      body.turnstileToken,
      request.headers.get('x-forwarded-for')
    );
    if (!captcha.ok) {
      return Response.json(
        { message: captcha.message, errors: captcha.errors },
        { status: captcha.status }
      );
    }

    await connectDB();
    const user = await User.findOne({ email });

    // Only send to verified users — unverified accounts should go through
    // /resend-verification instead, not get bumped onto the password-reset
    // path. Either way, response is identical.
    if (user && user.isVerified) {
      try {
        await sendPasswordResetEmail(user);
      } catch (err) {
        // Don't surface mail failures to the caller — would leak existence
        // when only some users' addresses bounce.
        console.error('Failed to send password reset email:', err);
      }
    }

    return Response.json(GENERIC_OK);
  } catch (error) {
    console.error('Forgot-password error:', error);
    return Response.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
