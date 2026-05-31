import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongoose';
import User from '@/lib/models/User';
import Budget from '@/lib/models/Budget';
import { sendVerificationEmail } from '@/lib/emailService';
import { validatePassword } from '@/lib/passwordValidator';
import { verifyTurnstile } from '@/lib/verifyTurnstile';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, password, turnstileToken } = body;
    // Email is normalized at the entry point: stored lowercase + trimmed,
    // looked up the same way. Otherwise "Foo@bar.com" and "foo@bar.com"
    // become two different accounts.
    const email = body.email?.toLowerCase().trim();

    // ── Cheap validation first ─────────────────────────────────────────
    if (!name?.trim() || !email || !password) {
      return Response.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const pwd = validatePassword(password);
    if (!pwd.valid) {
      return Response.json(
        { message: 'Password does not meet requirements', errors: pwd.errors },
        { status: 400 }
      );
    }

    // ── Captcha is single-use; only consume it after cheap checks pass ─
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

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return Response.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email,
      password: hashedPassword,
    });

    await Budget.create({
      userId: user._id,
      month: 'default', // the template; per-month customizations layer on top
      budgets: [{ category: 'Others', limit: 0 }],
    });

    await sendVerificationEmail(user);

    return Response.json(
      { message: 'Signup successful. Check your email for verification! (Check your spam folder if not received in a minute)' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return Response.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
