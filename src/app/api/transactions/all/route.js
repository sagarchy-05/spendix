import { connectDB } from '@/lib/mongoose';
import Transaction from '@/lib/models/Transaction';
import { requireAuth } from '@/lib/requireAuth';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.error)
    return Response.json({ message: auth.error }, { status: auth.status });

  try {
    await connectDB();
    const transactions = await Transaction.find({ userId: auth.userId }).sort({
      date: -1,
    });
    return Response.json(transactions);
  } catch (error) {
    return Response.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
