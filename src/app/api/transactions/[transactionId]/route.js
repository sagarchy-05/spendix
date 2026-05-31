import { connectDB } from '@/lib/mongoose';
import Transaction from '@/lib/models/Transaction';
import { requireAuth } from '@/lib/requireAuth';
import { getBudgetForMonth } from '@/lib/budgetHelpers';

function monthLabel(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function PUT(request, ctx) {
  const auth = requireAuth(request);
  if (auth.error)
    return Response.json({ message: auth.error }, { status: auth.status });

  try {
    const { transactionId } = await ctx.params;
    const { amount, category, date, description } = await request.json();

    if (date) {
      const txDate = new Date(date);
      const todayEnd = new Date();
      todayEnd.setUTCHours(23, 59, 59, 999);
      if (txDate > todayEnd) {
        return Response.json(
          { message: 'Transaction date cannot be in the future.' },
          { status: 400 }
        );
      }
    }

    await connectDB();

    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: auth.userId,
    });
    if (!transaction) {
      return Response.json(
        { message: 'Transaction not found' },
        { status: 404 }
      );
    }

    // The (possibly new) category must exist in the budget that applies for
    // the transaction's month — custom for that month if it exists, else
    // the default template.
    const effectiveDate = date || transaction.date;
    const txMonth = monthLabel(effectiveDate);
    const monthBudget = await getBudgetForMonth(auth.userId, txMonth);
    if (monthBudget.source === 'none') {
      return Response.json({ message: 'Budget not found' }, { status: 404 });
    }
    const newBudget = monthBudget.budgets.find((b) => b.category === category);
    if (!newBudget) {
      return Response.json(
        { message: `No budget set for ${category}` },
        { status: 400 }
      );
    }

    transaction.amount = amount;
    transaction.category = category;
    transaction.date = date || transaction.date;
    transaction.description = description ?? transaction.description;

    await transaction.save();

    return Response.json({
      message: 'Transaction updated successfully',
      transaction,
    });
  } catch (error) {
    return Response.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
