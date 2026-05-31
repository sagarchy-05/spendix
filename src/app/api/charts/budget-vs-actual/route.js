import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongoose';
import Transaction from '@/lib/models/Transaction';
import Budget from '@/lib/models/Budget';
import { requireAuth } from '@/lib/requireAuth';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.error)
    return Response.json({ message: auth.error }, { status: auth.status });

  try {
    await connectDB();
    const userBudgetDoc = await Budget.findOne({ userId: auth.userId });
    if (!userBudgetDoc || !userBudgetDoc.budgets.length) {
      return Response.json({ data: [], message: 'No budgets set yet.' });
    }

    // One aggregation for spent-per-category (down from N — one per
    // budget — in the previous Promise.all version).
    const spentByCategory = await Transaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(auth.userId) } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]);
    const spentMap = new Map(spentByCategory.map((s) => [s._id, s.total]));

    const results = userBudgetDoc.budgets.map((b) => ({
      category: b.category,
      budget: b.limit,
      spent: spentMap.get(b.category) || 0,
    }));

    return Response.json({ data: results });
  } catch (error) {
    console.error('Error in getBudgetVsActual:', error);
    return Response.json(
      { message: 'Failed to fetch budget comparison', error: error.message },
      { status: 500 }
    );
  }
}
