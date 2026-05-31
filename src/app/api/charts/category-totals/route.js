import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongoose';
import Transaction from '@/lib/models/Transaction';
import { requireAuth } from '@/lib/requireAuth';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.error)
    return Response.json({ message: auth.error }, { status: auth.status });

  try {
    await connectDB();
    const totals = await Transaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(auth.userId) } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $project: { _id: 0, category: '$_id', total: 1 } },
    ]);

    if (!totals.length) {
      return Response.json({
        data: [],
        message: 'No category data available yet.',
      });
    }
    return Response.json({ data: totals });
  } catch (err) {
    console.error('Error in getCategoryTotals:', err);
    return Response.json(
      { message: 'Failed to fetch category totals', error: err.message },
      { status: 500 }
    );
  }
}
