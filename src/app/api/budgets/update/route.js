import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongoose';
import Budget from '@/lib/models/Budget';
import Transaction from '@/lib/models/Transaction';
import { requireAuth } from '@/lib/requireAuth';
import { DEFAULT_MONTH } from '@/lib/budgetHelpers';
import { parseMonth } from '@/lib/monthRange';

export async function PUT(request) {
  const auth = requireAuth(request);
  if (auth.error)
    return Response.json({ message: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const { budgets, month: monthInput } = body;

    if (!Array.isArray(budgets)) {
      return Response.json(
        { message: 'Invalid budgets data' },
        { status: 400 }
      );
    }

    // Resolve the target month. Either "default" (template) or a real
    // YYYY-MM; anything else parses to current.
    const month =
      monthInput === DEFAULT_MONTH ? DEFAULT_MONTH : parseMonth(monthInput).label;

    for (const b of budgets) {
      if (
        !b?.category ||
        typeof b.category !== 'string' ||
        !b.category.trim()
      ) {
        return Response.json(
          { message: 'Each budget needs a non-empty category' },
          { status: 400 }
        );
      }
      if (
        typeof b.limit !== 'number' ||
        !Number.isFinite(b.limit) ||
        b.limit < 0
      ) {
        return Response.json(
          {
            message: `Budget limit for "${b.category}" must be a non-negative number`,
          },
          { status: 400 }
        );
      }
    }

    await connectDB();

    // For a real month, validate that no new limit drops below what's
    // already been spent in that month. For the default template, there's
    // no transaction history attached to it directly so we skip the check.
    if (month !== DEFAULT_MONTH) {
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

      for (const b of budgets) {
        const spent = spentMap.get(b.category) || 0;
        if (b.limit < spent) {
          return Response.json(
            {
              message: `Cannot set limit lower than spent amount for category: ${b.category}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Upsert the (userId, month) row.
    const cleaned = budgets.map((b) => ({
      category: b.category.trim(),
      limit: b.limit,
    }));
    const updated = await Budget.findOneAndUpdate(
      { userId: auth.userId, month },
      { $set: { budgets: cleaned }, $setOnInsert: { userId: auth.userId, month } },
      { new: true, upsert: true }
    );

    return Response.json({
      message: 'Budgets updated successfully',
      budgets: updated.budgets,
    });
  } catch (error) {
    return Response.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
