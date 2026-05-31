import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongoose';
import Transaction from '@/lib/models/Transaction';
import { requireAuth } from '@/lib/requireAuth';
import {
  getBudgetForMonth,
  DEFAULT_MONTH,
} from '@/lib/budgetHelpers';
import { parseMonth } from '@/lib/monthRange';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.error)
    return Response.json({ message: auth.error }, { status: auth.status });

  try {
    const url = new URL(request.url);
    const monthParam = url.searchParams.get('month'); // "YYYY-MM" or "default"
    const month =
      monthParam === DEFAULT_MONTH ? DEFAULT_MONTH : parseMonth(monthParam).label;

    await connectDB();
    const result = await getBudgetForMonth(auth.userId, month);

    if (result.source === 'none' || result.budgets.length === 0) {
      return Response.json({ source: result.source, budgets: [] });
    }

    // For the default-template view (or when this month falls back to it)
    // there's no "spent" — limits only. For a real month, compute spent
    // from the Transaction collection.
    if (month === DEFAULT_MONTH) {
      return Response.json({
        source: 'custom',
        budgets: result.budgets.map((b) => ({
          _id: String(b._id),
          category: b.category,
          limit: b.limit,
        })),
      });
    }

    const { start, end } = parseMonth(month);
    const spentByCategory = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(auth.userId),
          date: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]);
    const spentMap = new Map(spentByCategory.map((s) => [s._id, s.total]));

    return Response.json({
      source: result.source,
      budgets: result.budgets.map((b) => ({
        _id: String(b._id),
        category: b.category,
        limit: b.limit,
        spent: spentMap.get(b.category) || 0,
      })),
    });
  } catch (error) {
    return Response.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
