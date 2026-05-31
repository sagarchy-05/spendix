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
    const summary = await Transaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(auth.userId) } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' },
          },
          total: { $sum: '$amount' },
        },
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day',
            },
          },
          total: 1,
          _id: 0,
        },
      },
      { $sort: { date: 1 } },
    ]);

    if (!summary.length) {
      return Response.json({
        data: [],
        message: 'No daily expense data available yet.',
      });
    }
    return Response.json({ data: summary });
  } catch (err) {
    console.error('Error in getDailyExpenseSummary:', err);
    return Response.json(
      { message: 'Failed to fetch daily summary', error: err.message },
      { status: 500 }
    );
  }
}
