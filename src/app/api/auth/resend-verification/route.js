import { connectDB } from '@/lib/mongoose';
import User from '@/lib/models/User';
import { sendVerificationEmail } from '@/lib/emailService';
import { verifyTurnstile } from '@/lib/verifyTurnstile';

// Generic response sent regardless of whether the email exists or is
// already verified — prevents anyone from probing the registered-users
// list via this unauthenticated endpoint.
const GENERIC_OK = {
  message: 'If an account with that email exists and needs verification, a new link has been sent. Check your spam folder if not received in a minute.',
};

export async function POST(request) {
  try {
    const body = await request.json();
    const email = body.email?.toLowerCase().trim();

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
    // Send the email only when actually applicable, but the response is
    // identical to the "no such user" / "already verified" cases.
    if (user && !user.isVerified) {
      try {
        await sendVerificationEmail(user);
      } catch (err) {
        // Don't surface mail-server failures to the user — that would also
        // leak existence info. Log on server.
        console.error('Failed to send verification email:', err);
      }
    }

    return Response.json(GENERIC_OK);
  } catch (error) {
    console.error('Resend verification error:', error);
    return Response.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
