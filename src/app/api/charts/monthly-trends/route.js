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
    const trends = await Transaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(auth.userId) } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' },
        },
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' },
                ],
              },
            ],
          },
          total: 1,
          _id: 0,
        },
      },
      { $sort: { month: 1 } },
    ]);

    if (!trends.length) {
      return Response.json({
        data: [],
        message: 'No monthly trends available yet.',
      });
    }
    return Response.json({ data: trends });
  } catch (err) {
    console.error('Error in getMonthlyTrends:', err);
    return Response.json(
      { message: 'Failed to fetch monthly trends', error: err.message },
      { status: 500 }
    );
  }
}
