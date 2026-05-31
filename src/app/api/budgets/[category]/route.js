import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongoose';
import Budget from '@/lib/models/Budget';
import Transaction from '@/lib/models/Transaction';
import { requireAuth } from '@/lib/requireAuth';
import {
  getDefaultBudgetDoc,
  DEFAULT_MONTH,
} from '@/lib/budgetHelpers';
import { parseMonth } from '@/lib/monthRange';

export async function DELETE(request, ctx) {
  const auth = requireAuth(request);
  if (auth.error)
    return Response.json({ message: auth.error }, { status: auth.status });

  try {
    const { category } = await ctx.params;
    const url = new URL(request.url);
    const monthParam = url.searchParams.get('month');
    const month =
      monthParam === DEFAULT_MONTH ? DEFAULT_MONTH : parseMonth(monthParam).label;

    if (category === 'Others') {
      return Response.json(
        { message: "Default category 'Others' cannot be deleted." },
        { status: 400 }
      );
    }

    await connectDB();

    // Block deletion on a real month when transactions for that category
    // exist *in that month*. For the default template, look at all-time
    // (deleting the category from the template means it disappears from
    // every future month that hasn't customized).
    if (month !== DEFAULT_MONTH) {
      const { start, end } = parseMonth(month);
      const txCount = await Transaction.countDocuments({
        userId: auth.userId,
        category,
        date: { $gte: start, $lt: end },
      });
      if (txCount > 0) {
        return Response.json(
          {
            message: `Cannot delete "${category}" — it has ${txCount} transaction${
              txCount === 1 ? '' : 's'
            } this month. Delete those transactions first.`,
          },
          { status: 400 }
        );
      }
    } else {
      const txCount = await Transaction.countDocuments({
        userId: auth.userId,
        category,
      });
      if (txCount > 0) {
        return Response.json(
          {
            message: `Cannot delete "${category}" from the default template — you have transactions in this category. Delete those first or remove it from specific months instead.`,
          },
          { status: 400 }
        );
      }
    }

    // For the default template, edit the default doc (with the
    // self-healing fallback for legacy docs).
    const doc =
      month === DEFAULT_MONTH
        ? await getDefaultBudgetDoc(auth.userId)
        : await Budget.findOne({ userId: auth.userId, month });

    if (!doc || !doc.budgets.some((b) => b.category === category)) {
      return Response.json(
        { message: 'Budget category not found' },
        { status: 404 }
      );
    }

    doc.budgets = doc.budgets.filter((b) => b.category !== category);
    await doc.save();

    return Response.json({
      message: `Budget for ${category} deleted successfully`,
    });
  } catch (error) {
    return Response.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
