import { connectDB } from '@/lib/mongoose';
import Transaction from '@/lib/models/Transaction';
import { requireAuth } from '@/lib/requireAuth';
import { getBudgetForMonth } from '@/lib/budgetHelpers';

function monthLabel(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.error)
    return Response.json({ message: auth.error }, { status: auth.status });

  try {
    const { amount, category, date, description } = await request.json();

    if (!amount || !category) {
      return Response.json(
        { message: 'Amount and category are required' },
        { status: 400 }
      );
    }

    // Future dates aren't allowed for transactions (budgets can be future,
    // but transactions are records of money already moved). Compare against
    // the end of "today" in UTC to be lenient on timezone edges.
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

    // The transaction's month determines which budget envelope applies —
    // either the user's customized budget for that month, or the default.
    const txMonth = monthLabel(date || new Date());
    const monthBudget = await getBudgetForMonth(auth.userId, txMonth);
    if (monthBudget.source === 'none') {
      return Response.json(
        { message: 'No budgets found. Set a budget first.' },
        { status: 400 }
      );
    }
    const budget = monthBudget.budgets.find((b) => b.category === category);
    if (!budget) {
      return Response.json(
        { message: `No budget found for category: ${category}` },
        { status: 400 }
      );
    }

    const transaction = await Transaction.create({
      userId: auth.userId,
      amount,
      category,
      date,
      description,
    });

    return Response.json(
      { message: 'Transaction added successfully', transaction },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
