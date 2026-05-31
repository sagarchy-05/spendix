import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import User from '@/lib/models/User';
import { verifyTurnstile } from '@/lib/verifyTurnstile';
import { AUTH_COOKIE, authCookieOptions } from '@/lib/requireAuth';
import { AUD_SESSION } from '@/lib/jwtAudience';

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request) {
  try {
    const body = await request.json();
    const { password, turnstileToken } = body;
    const email = body.email?.toLowerCase().trim();

    // Cheap presence check first — don't burn the single-use captcha on
    // empty submissions.
    if (!email || !password) {
      return Response.json(
        { message: 'Email and password required' },
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

    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      return Response.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return Response.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isVerified) {
      // Same 401 status as wrong-credentials so the response status alone
      // doesn't enumerate registered emails. The message still differs by
      // necessity — the user genuinely needs to know to verify.
      return Response.json(
        { message: 'Please verify your email first' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { userId: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d', audience: AUD_SESSION }
    );

    const response = NextResponse.json({
      message: 'Login successful',
      user: { name: user.name, email: user.email },
    });
    response.cookies.set(
      AUTH_COOKIE,
      token,
      authCookieOptions({ maxAge: SEVEN_DAYS_SECONDS })
    );
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
