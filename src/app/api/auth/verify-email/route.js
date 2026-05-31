import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongoose';
import User from '@/lib/models/User';
import { AUD_VERIFY_EMAIL } from '@/lib/jwtAudience';

// POST so that pre-fetching email scanners (which only follow GET links)
// can't accidentally verify the user's email before they actually click.
export async function POST(request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return Response.json({ message: 'Token required' }, { status: 400 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      audience: AUD_VERIFY_EMAIL,
    });

    await connectDB();
    await User.findByIdAndUpdate(decoded.userId, { isVerified: true });
    return Response.json({ message: 'Email verified' });
  } catch (err) {
    console.warn('Email verification failed:', err.message);
    return Response.json(
      { message: 'Verification link is invalid or expired.' },
      { status: 400 }
    );
  }
}
